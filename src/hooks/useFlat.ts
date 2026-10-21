'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Flat, Profile } from '@/types/app.types';

export function useFlat(flatId: string) {
  const supabase = createClient();
  const [flat, setFlat] = useState<Flat | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!flatId) return;

    async function fetchFlat() {
      const [flatRes, membersRes] = await Promise.all([
        supabase.from('flats').select('*').eq('id', flatId).single(),
        supabase.from('profiles').select('*').eq('flat_id', flatId),
      ]);
      setFlat(flatRes.data as Flat);
      setMembers((membersRes.data as Profile[]) ?? []);
      setLoading(false);
    }

    fetchFlat();
  }, [flatId]);

  return { flat, members, loading };
}
