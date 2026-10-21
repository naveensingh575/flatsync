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
    } catch (e) {
      console.error('Error fetching user groups:', e);
    }
  }, [profile?.id, profile?.flat_id, setUserGroups]);

  // Fetch active flat & its members
  const fetchActiveFlat = useCallback(async () => {
    if (!flatId) {
      setLoading(false);
      return;
    }

    try {
      const [flatRes, legacyMembersRes, junctionMembersRes] = await Promise.all([
        supabase.from('flats').select('*').eq('id', flatId).maybeSingle(),
        supabase.from('profiles').select('*').eq('flat_id', flatId),
        supabase
          .from('group_members')
          .select('user_id, profiles(*)')
          .eq('group_id', flatId),
      ]);

      setFlat((flatRes.data as Flat) ?? null);

      // Combine members from both sources, de-duplicated by ID
      const memberMap = new Map<string, Profile>();

      ((legacyMembersRes.data as Profile[]) ?? []).forEach((m) => {
        if (m) memberMap.set(m.id, m);
      });

      ((junctionMembersRes.data ?? []) as any[]).forEach((row) => {
        if (row.profiles) memberMap.set(row.profiles.id, row.profiles as Profile);
      });

      setMembers(Array.from(memberMap.values()));
      setCurrentGroupId(flatId);
    } catch (e) {
      console.error('Error fetching active flat:', e);
    } finally {
      setLoading(false);
    }
  }, [flatId, setCurrentGroupId]);

  useEffect(() => {
    fetchUserGroups();
  }, [fetchUserGroups]);

  useEffect(() => {
    fetchActiveFlat();
  }, [fetchActiveFlat]);

  return { flat, members, loading, userGroups, refetchGroups: fetchUserGroups, refetchMembers: fetchActiveFlat };
}
