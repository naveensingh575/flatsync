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

  // Fetch all groups the current user belongs to
  const fetchUserGroups = useCallback(async () => {
    if (!profile?.id) return;

    try {
      // 1. Fetch from group_members junction table
      const { data: memberRows, error } = await supabase
        .from('group_members')
        .select('group_id, flats(*)')
        .eq('user_id', profile.id);

      let groups: Flat[] = [];

      if (!error && memberRows && memberRows.length > 0) {
        groups = memberRows
          .map((row: any) => row.flats)
          .filter(Boolean) as Flat[];
      }

      // 2. Fallback to profile.flat_id if group_members isn't populated yet
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

      setUserGroups(groups);

      // 3. Fetch members for all user groups
      const groupIds = groups.map((g) => g.id);
      if (groupIds.length > 0) {
        const [junctionRes, legacyRes] = await Promise.all([
          supabase
            .from('group_members')
            .select('group_id, user_id, profiles(*)')
            .in('group_id', groupIds),
          supabase
            .from('profiles')
            .select('*')
            .in('flat_id', groupIds),
        ]);

        const map: Record<string, Map<string, Profile>> = {};
        groupIds.forEach((gid) => {
          map[gid] = new Map();
        });

        // Add legacy
        (legacyRes.data || []).forEach((p: Profile) => {
          if (p.flat_id && map[p.flat_id]) {
            map[p.flat_id].set(p.id, p);
          }
        });

        // Add junction
        (junctionRes.data || []).forEach((row: any) => {
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
  }, [profile, setUserGroups]);

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
