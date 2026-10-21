'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Flat, Profile } from '@/types/app.types';
import { useAppStore } from '@/store/useAppStore';

export function useFlat(flatId?: string) {
  const supabase = createClient();
  const { profile, userGroups, setUserGroups, currentGroupId, setCurrentGroupId } = useAppStore();
  const [flat, setFlat] = useState<Flat | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [groupMembersMap, setGroupMembersMap] = useState<Record<string, Profile[]>>({});

  // Fetch all groups the current user belongs to (multi-source & self-healing)
  const fetchUserGroups = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const candidateGroupIds = new Set<string>();

      // 1. Collect group IDs from group_members junction table
      try {
        const { data: memberRows, error: memberErr } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', profile.id);

        if (!memberErr && memberRows) {
          memberRows.forEach((r) => {
            if (r.group_id) candidateGroupIds.add(r.group_id);
          });
        }
      } catch (_) {}

      // 2. Always include profile.flat_id if present
      if (profile.flat_id) {
        candidateGroupIds.add(profile.flat_id);
      }

      // 3. Always include currently active flatId if provided
      if (flatId) {
        candidateGroupIds.add(flatId);
      }

      // 4. Preserve any groups already cached in local store
      if (userGroups && userGroups.length > 0) {
        userGroups.forEach((g) => {
          if (g.id) candidateGroupIds.add(g.id);
        });
      }

      // 5. Check items table for any groups this user created/requested items in
      try {
        const { data: userItems } = await supabase
          .from('items')
          .select('flat_id')
          .eq('requested_by_id', profile.id)
          .limit(20);

        if (userItems) {
          userItems.forEach((i) => {
            if (i.flat_id) candidateGroupIds.add(i.flat_id);
          });
        }
      } catch (_) {}

      const idsToFetch = Array.from(candidateGroupIds);
      let groups: Flat[] = [];

      // 6. Fetch full details for all discovered groups
      if (idsToFetch.length > 0) {
        const { data: fetchedFlats } = await supabase
          .from('flats')
          .select('*')
          .in('id', idsToFetch);

        if (fetchedFlats && fetchedFlats.length > 0) {
          groups = fetchedFlats as Flat[];
        }
      }

      // Fallback: If still empty, check flats directly by profile.flat_id
      if (groups.length === 0 && profile.flat_id) {
        const { data: directFlat } = await supabase
          .from('flats')
          .select('*')
          .eq('id', profile.flat_id)
          .maybeSingle();

        if (directFlat) {
          groups = [directFlat as Flat];
        }
      }

      // 7. Deduplicate groups by ID
      const uniqueGroupMap = new Map<string, Flat>();
      groups.forEach((g) => {
        if (g && g.id) uniqueGroupMap.set(g.id, g);
      });
      const finalGroups = Array.from(uniqueGroupMap.values());

      setUserGroups(finalGroups);

      // 8. Auto-heal: Ensure all user groups are persisted in group_members
      finalGroups.forEach(async (g) => {
        try {
          await supabase.from('group_members').upsert(
            { group_id: g.id, user_id: profile.id, role: 'member' },
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
              .in('flat_id', groupIds)
          ).catch(() => ({ data: [] })),
        ]);

        const map: Record<string, Map<string, Profile>> = {};
        groupIds.forEach((gid) => {
          map[gid] = new Map();
        });

        // Add legacy
        ((legacyRes as any)?.data || []).forEach((p: Profile) => {
          if (p.flat_id && map[p.flat_id]) {
            map[p.flat_id].set(p.id, p);
          }
        });

        // Add junction
        ((junctionRes as any)?.data || []).forEach((row: any) => {
          if (row.group_id && row.profiles && map[row.group_id]) {
            map[row.group_id].set(row.user_id, row.profiles as Profile);
          }
        });

        // Ensure current user is in active maps
        if (profile) {
          groupIds.forEach((gid) => {
            if (map[gid]) {
              map[gid].set(profile.id, profile);
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
    }
  }, [profile, flatId, userGroups, setUserGroups]);

  // Leave a group
  async function leaveGroup(targetGroupId: string): Promise<boolean> {
    if (!profile?.id) return false;
    try {
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', targetGroupId)
        .eq('user_id', profile.id);

      if (profile.flat_id === targetGroupId) {
        const remaining = userGroups.filter((g) => g.id !== targetGroupId);
        const nextId = remaining.length > 0 ? remaining[0].id : null;
        await supabase
          .from('profiles')
          .update({ flat_id: nextId })
          .eq('id', profile.id);
      }

      await fetchUserGroups();
      return true;
    } catch (err) {
      console.error('Error leaving group:', err);
      return false;
    }
  }

  // Delete a group
  async function deleteGroup(targetGroupId: string): Promise<boolean> {
    if (!profile?.id) return false;
    try {
      const { error } = await supabase
        .from('flats')
        .delete()
        .eq('id', targetGroupId);

      if (error) {
        // Fallback: remove current user membership
        await supabase
          .from('group_members')
          .delete()
          .eq('group_id', targetGroupId);
      }

      if (profile.flat_id === targetGroupId) {
        const remaining = userGroups.filter((g) => g.id !== targetGroupId);
        const nextId = remaining.length > 0 ? remaining[0].id : null;
        await supabase
          .from('profiles')
          .update({ flat_id: nextId })
          .eq('id', profile.id);
      }

      await fetchUserGroups();
      return true;
    } catch (err) {
      console.error('Error deleting group:', err);
      return false;
    }
  }

  // Fetch active flat & its members
  const fetchActiveFlat = useCallback(async () => {
    if (!flatId) {
      setLoading(false);
      return;
    }

    try {
      const [flatRes, legacyMembersRes, junctionRows] = await Promise.all([
        supabase.from('flats').select('*').eq('id', flatId).maybeSingle(),
        supabase.from('profiles').select('*').eq('flat_id', flatId),
        supabase.from('group_members').select('user_id, role').eq('group_id', flatId),
      ]);

      setFlat((flatRes.data as Flat) ?? null);

      const memberMap = new Map<string, Profile>();

      // 1. Add legacy members from profiles.flat_id
      ((legacyMembersRes.data as Profile[]) ?? []).forEach((m) => {
        if (m && m.id) {
          memberMap.set(m.id, {
            ...m,
            name: m.name || 'Member',
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
            memberMap.set(p.id, {
              ...p,
              name: p.name || 'Member',
            });
          }
        });
      }

      // 3. Ensure current profile is present if they belong to this group
      if (profile?.id && profile.name) {
        if (memberMap.has(profile.id)) {
          const current = memberMap.get(profile.id)!;
          memberMap.set(profile.id, { ...current, name: profile.name });
        } else if (flatRes.data?.id === flatId) {
          memberMap.set(profile.id, profile);
        }
      }

      setMembers(Array.from(memberMap.values()));
      setCurrentGroupId(flatId);
    } catch (e) {
      console.error('Error fetching active flat:', e);
    } finally {
      setLoading(false);
    }
  }, [flatId, profile, setCurrentGroupId]);

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
    leaveGroup,
    deleteGroup,
    refetchGroups: fetchUserGroups,
    refetchMembers: fetchActiveFlat,
  };
}
