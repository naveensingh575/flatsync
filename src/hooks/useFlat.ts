'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Flat, Profile } from '@/types/app.types';
import { useAppStore } from '@/store/useAppStore';
import { getFriendlyErrorMessage } from '@/lib/sanitizeError';
import toast from 'react-hot-toast';

export function useFlat(flatId?: string) {
  const supabase = createClient();
  const { profile, userGroups, setUserGroups, currentGroupId, setCurrentGroupId } = useAppStore();
  const [flat, setFlat] = useState<Flat | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const isFetchingGroupsRef = useRef(false);
  const isFetchingFlatRef = useRef(false);

  const [groupMembersMap, setGroupMembersMap] = useState<Record<string, Profile[]>>({});

  // Fetch all groups the current user belongs to (multi-source & self-healing)
  const fetchUserGroups = useCallback(async () => {
    let currentUserId = profile?.id;
    if (!currentUserId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        currentUserId = session?.user?.id;
      } catch (_) {}
    }
    if (!currentUserId) return;
    if (isFetchingGroupsRef.current) return;
    isFetchingGroupsRef.current = true;

    try {
      const candidateGroupIds = new Set<string>();

      // 1. Collect group IDs from group_members junction table
      try {
        const { data: memberRows, error: memberErr } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', currentUserId);

        if (!memberErr && memberRows) {
          memberRows.forEach((r: any) => {
            if (r.group_id) candidateGroupIds.add(r.group_id);
          });
        }
      } catch (_) {}

      // 2. Always include profile.group_id / profile.flat_id if present
      const userPrimaryGroup = profile?.group_id || profile?.flat_id;
      if (userPrimaryGroup) {
        candidateGroupIds.add(userPrimaryGroup);
      }

      // 3. Always include currently active flatId if provided
      if (flatId) {
        candidateGroupIds.add(flatId);
      }

      // 4. Preserve any groups already cached in local store
      const cachedGroups = useAppStore.getState().userGroups;
      if (cachedGroups && cachedGroups.length > 0) {
        cachedGroups.forEach((g) => {
          if (g.id) candidateGroupIds.add(g.id);
        });
      }

      // 5. Check items table for any groups this user created/requested items in
      try {
        const { data: userItems } = await supabase
          .from('items')
          .select('group_id')
          .eq('requested_by_id', currentUserId)
          .limit(20);

        if (userItems) {
          userItems.forEach((i: any) => {
            if (i.group_id) candidateGroupIds.add(i.group_id);
          });
        }
      } catch (_) {}

      const idsToFetch = Array.from(candidateGroupIds);
      let groups: Flat[] = [];

      // 6. Fetch full details for all discovered groups directly from groups table
      if (idsToFetch.length > 0) {
        try {
          const res = await supabase.from('groups').select('*').in('id', idsToFetch);
          if (!res.error && res.data) {
            groups = res.data as Flat[];
          }
        } catch (_) {}
      }

      // Fallback: If still empty, check groups directly by profile primary group
      if (groups.length === 0 && userPrimaryGroup) {
        try {
          const res = await supabase.from('groups').select('*').eq('id', userPrimaryGroup).maybeSingle();
          if (res.data) {
            groups = [res.data as Flat];
          }
        } catch (_) {}
      }

      // 7. Deduplicate groups by ID
      const uniqueGroupMap = new Map<string, Flat>();
      groups.forEach((g) => {
        if (g && g.id) uniqueGroupMap.set(g.id, g);
      });
      const finalGroups = Array.from(uniqueGroupMap.values());

      if (finalGroups.length > 0) {
        setUserGroups(finalGroups);
      } else {
        // Guard: NEVER wipe out existing groups on a transient empty result or rate limit
        const existing = useAppStore.getState().userGroups;
        if (!existing || existing.length === 0) {
          try {
            const raw = localStorage.getItem('grocerysync-app-storage') || localStorage.getItem('flatsync-app-storage');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.state?.userGroups?.length > 0) {
                setUserGroups(parsed.state.userGroups);
              }
            }
          } catch (_) {}
        }
      }

      // 8. Auto-heal: Ensure all user groups are persisted in group_members
      finalGroups.forEach(async (g) => {
        try {
          await supabase.from('group_members').upsert(
            { group_id: g.id, user_id: currentUserId, role: 'member' },
            { onConflict: 'group_id,user_id' }
          );
        } catch (_) {}
      });

      // 9. Fetch members for all user groups
      const groupIds = finalGroups.map((g) => g.id);
      if (groupIds.length > 0) {
        const [junctionRes, legacyRes] = await Promise.all([
          Promise.resolve(
            supabase
              .from('group_members')
              .select('group_id, user_id, profiles(*)')
              .in('group_id', groupIds)
          ).catch(() => ({ data: [] })),
          Promise.resolve(
            supabase
              .from('profiles')
              .select('*')
              .in('group_id', groupIds)
          ).catch(() => ({ data: [] })),
        ]);

        const map: Record<string, Map<string, Profile>> = {};
        groupIds.forEach((gid) => {
          map[gid] = new Map();
        });

        // Add primary group members
        ((legacyRes as any)?.data || []).forEach((p: Profile) => {
          const gid = p.group_id || p.flat_id;
          if (gid && map[gid]) {
            map[gid].set(p.id, { ...p, role: 'member' });
          }
        });

        // Add junction with role
        ((junctionRes as any)?.data || []).forEach((row: any) => {
          if (row.group_id && row.profiles && map[row.group_id]) {
            const currentGroup = finalGroups.find((g) => g.id === row.group_id);
            const isCreator = currentGroup?.created_by === row.user_id;
            map[row.group_id].set(row.user_id, {
              ...(row.profiles as Profile),
              role: isCreator ? 'admin' : (row.role || 'member'),
            });
          }
        });

        // Ensure current user is in active maps
        if (profile) {
          groupIds.forEach((gid) => {
            if (map[gid]) {
              const currentGroup = finalGroups.find((g) => g.id === gid);
              const existing = map[gid].get(profile.id);
              const isCreator = currentGroup?.created_by === profile.id;
              map[gid].set(profile.id, {
                ...profile,
                role: isCreator ? 'admin' : (existing?.role || 'member'),
              });
            }
          });
        }

        const finalMap: Record<string, Profile[]> = {};
        for (const [gid, pMap] of Object.entries(map)) {
          finalMap[gid] = Array.from(pMap.values());
        }
        setGroupMembersMap(finalMap);
      }
    } catch (e) {
      console.error('Error fetching user groups:', e);
    } finally {
      isFetchingGroupsRef.current = false;
    }
  }, [profile?.id, profile?.flat_id, flatId, setUserGroups]);

  // Check if current user is an admin of the specified group (or active group)
  function isAdmin(targetGroupId?: string): boolean {
    const gid = targetGroupId || flatId;
    if (!gid || !profile?.id) return false;

    // Check if creator of group
    const currentGroup = userGroups.find((g) => g.id === gid) || flat;
    if (currentGroup?.created_by === profile.id) return true;

    // Check role in groupMembersMap
    const membersList = groupMembersMap[gid] || members;
    if (membersList.length <= 1 && membersList.some((m) => m.id === profile.id)) return true;
    const self = membersList.find((m) => m.id === profile.id);
    return self?.role === 'admin';
  }

  // Promote a member to admin
  async function makeAdmin(targetGroupId: string, targetUserId: string): Promise<boolean> {
    if (!profile?.id) return false;
    if (!isAdmin(targetGroupId)) {
      toast.error('Only group admins can make other members admin.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('group_members')
        .update({ role: 'admin' })
        .eq('group_id', targetGroupId)
        .eq('user_id', targetUserId);

      if (error) throw error;

      // Optimistically update groupMembersMap & members state
      setGroupMembersMap((prev) => {
        const list = prev[targetGroupId] || [];
        return {
          ...prev,
          [targetGroupId]: list.map((m) =>
            m.id === targetUserId ? { ...m, role: 'admin' } : m
          ),
        };
      });

      if (targetGroupId === flatId) {
        setMembers((prev) =>
          prev.map((m) => (m.id === targetUserId ? { ...m, role: 'admin' } : m))
        );
      }

      toast.success('Member promoted to Admin! 🛡️');
      return true;
    } catch (err: any) {
      console.error('Error promoting member to admin:', err);
      toast.error(getFriendlyErrorMessage(err, 'Failed to promote member to admin'));
      return false;
    }
  }

  // Leave a group
  async function leaveGroup(targetGroupId: string): Promise<boolean> {
    if (!profile?.id) return false;
    try {
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', targetGroupId)
        .eq('user_id', profile.id);

      const userCurrentGroup = profile.group_id || profile.flat_id;
      if (userCurrentGroup === targetGroupId) {
        const remaining = userGroups.filter((g) => g.id !== targetGroupId);
        const nextId = remaining.length > 0 ? remaining[0].id : null;
        await supabase
          .from('profiles')
          .update({ group_id: nextId })
          .eq('id', profile.id);
      }

      await fetchUserGroups();
      return true;
    } catch (err) {
      console.error('Error leaving group:', err);
      return false;
    }
  }

  // Delete a group (ADMIN SPECIAL POWER)
  async function deleteGroup(targetGroupId: string): Promise<boolean> {
    if (!profile?.id) return false;

    // Check admin permissions
    if (!isAdmin(targetGroupId)) {
      toast.error('Only group admins have permission to delete this group.');
      return false;
    }

    try {
      // 1. Delete from groups directly
      const { error: groupErr } = await supabase
        .from('groups')
        .delete()
        .eq('id', targetGroupId);

      if (groupErr) throw groupErr;

      // Also clean up junction entries
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', targetGroupId);

      const userCurrentGroup = profile.group_id || profile.flat_id;
      if (userCurrentGroup === targetGroupId) {
        const remaining = userGroups.filter((g) => g.id !== targetGroupId);
        const nextId = remaining.length > 0 ? remaining[0].id : null;
        await supabase
          .from('profiles')
          .update({ group_id: nextId })
          .eq('id', profile.id);
      }

      await fetchUserGroups();
      toast.success('Group deleted successfully');
      return true;
    } catch (err: any) {
      console.error('Error deleting group:', err);
      toast.error(getFriendlyErrorMessage(err, 'Failed to delete group'));
      return false;
    }
  }

  const effectiveFlatId = (flatId && flatId !== 'current' && flatId !== 'list')
    ? flatId
    : (currentGroupId || profile?.group_id || profile?.flat_id || (userGroups.length > 0 ? userGroups[0]?.id : ''));

  // Fetch active flat & its members
  const fetchActiveFlat = useCallback(async () => {
    if (!effectiveFlatId) {
      setLoading(false);
      return;
    }
    if (isFetchingFlatRef.current) return;
    isFetchingFlatRef.current = true;

    try {
      // 1. Fetch group details directly from groups table (supporting UUID or 6-char join_code)
      let resolvedFlat: Flat | null = null;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveFlatId);
      try {
        const res = isUuid
          ? await supabase.from('groups').select('*').eq('id', effectiveFlatId).maybeSingle()
          : await supabase.from('groups').select('*').ilike('join_code', effectiveFlatId).maybeSingle();
        if (res.data) {
          resolvedFlat = res.data as Flat;
          if (!isUuid && res.data.id) {
            setCurrentGroupId(res.data.id);
          }
        }
      } catch (_) {}

      const actualGroupId = resolvedFlat?.id || (isUuid ? effectiveFlatId : currentGroupId || '');
      const [groupMembersRes, junctionRows] = await Promise.all([
        actualGroupId ? supabase.from('profiles').select('*').eq('group_id', actualGroupId) : Promise.resolve({ data: [] }),
        actualGroupId ? supabase.from('group_members').select('user_id, role').eq('group_id', actualGroupId) : Promise.resolve({ data: [] }),
      ]);
      if (!resolvedFlat && actualGroupId) {
        // Fallback to memory store or localStorage cache
        const cachedFromStore = useAppStore.getState().userGroups.find((g) => g.id === actualGroupId);
        if (cachedFromStore) {
          resolvedFlat = cachedFromStore;
        } else {
          try {
            const raw = localStorage.getItem(`grocerysync_group_${actualGroupId}`) || localStorage.getItem(`flatsync_group_${actualGroupId}`);
            if (raw) resolvedFlat = JSON.parse(raw);
          } catch (_) {}
        }
      }

      if (resolvedFlat) {
        setFlat(resolvedFlat);
        try {
          localStorage.setItem(`grocerysync_group_${flatId}`, JSON.stringify(resolvedFlat));
        } catch (_) {}
      } else {
        // NEVER clear flat to null if we already have it in state or store
        const cachedFromStore = useAppStore.getState().userGroups.find((g) => g.id === flatId);
        setFlat((prev) => prev || cachedFromStore || null);
      }

      const memberMap = new Map<string, Profile>();

      // Role lookup from junction
      const roleMap = new Map<string, 'admin' | 'member'>();
      (junctionRows.data ?? []).forEach((r: any) => {
        if (r.user_id) roleMap.set(r.user_id, r.role || 'member');
      });

      // 1. Add members from profiles with this group_id
      ((groupMembersRes.data as Profile[]) ?? []).forEach((m) => {
        if (m && m.id) {
          const isCreator = resolvedFlat?.created_by === m.id;
          memberMap.set(m.id, {
            ...m,
            name: m.name || 'Member',
            role: isCreator ? 'admin' : (roleMap.get(m.id) || 'member'),
          });
        }
      });

      // 2. Fetch profiles for all members in group_members
      const junctionUserIds = (junctionRows.data ?? [])
        .map((r: any) => r.user_id)
        .filter(Boolean);

      if (junctionUserIds.length > 0) {
        const { data: junctionProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', junctionUserIds);

        (junctionProfiles ?? []).forEach((p: Profile) => {
          if (p && p.id) {
            const isCreator = resolvedFlat?.created_by === p.id;
            memberMap.set(p.id, {
              ...p,
              name: p.name || 'Member',
              role: isCreator ? 'admin' : (roleMap.get(p.id) || 'member'),
            });
          }
        });
      }

      // 3. Ensure current profile is present if they belong to this group
      if (profile?.id && profile.name) {
        const isCreator = resolvedFlat?.created_by === profile.id;
        const assignedRole: 'admin' | 'member' = isCreator ? 'admin' : (roleMap.get(profile.id) || 'member');

        if (memberMap.has(profile.id)) {
          const current = memberMap.get(profile.id)!;
          memberMap.set(profile.id, { ...current, name: profile.name, role: assignedRole });
        } else if (resolvedFlat?.id === flatId) {
          memberMap.set(profile.id, { ...profile, role: assignedRole });
        }
      }

      setMembers(Array.from(memberMap.values()));
      if (actualGroupId) {
        setCurrentGroupId(actualGroupId);
      }
    } catch (e) {
      console.error('Error fetching active flat:', e);
    } finally {
      isFetchingFlatRef.current = false;
      setLoading(false);
    }
  }, [effectiveFlatId, profile?.id, profile?.name, setCurrentGroupId]);

  useEffect(() => {
    fetchUserGroups();
  }, [fetchUserGroups]);

  useEffect(() => {
    fetchActiveFlat();
  }, [fetchActiveFlat]);

  return {
    flat,
    members,
    loading,
    userGroups,
    groupMembersMap,
    isAdmin,
    makeAdmin,
    leaveGroup,
    deleteGroup,
    refetchGroups: fetchUserGroups,
    refetchMembers: fetchActiveFlat,
  };
}
