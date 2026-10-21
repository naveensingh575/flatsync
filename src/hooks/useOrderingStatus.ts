'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { OrderingSession, Platform } from '@/types/app.types';
import { useAppStore } from '@/store/useAppStore';

export function useOrderingStatus(flatId: string) {
  const supabase = createClient();
  const { profile, setActiveSession } = useAppStore();
  const [session, setSession] = useState<OrderingSession | null>(null);

  const fetchSession = useCallback(async () => {
    const { data } = await supabase
      .from('ordering_sessions')
      .select('*, buyer:profiles!ordering_sessions_buyer_id_fkey(*)')
      .eq('flat_id', flatId)
      .eq('is_active', true)
      .maybeSingle();
    const s = (data as OrderingSession) ?? null;
    setSession(s);
    setActiveSession(s);
  }, [flatId]);

  useEffect(() => {
    if (!flatId) return;
    fetchSession();

    const channel = supabase
      .channel(`sessions:flat_id=eq.${flatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ordering_sessions',
          filter: `flat_id=eq.${flatId}`,
        },
        () => fetchSession()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [flatId, fetchSession]);

  async function startOrdering(platform: Platform) {
    if (!profile) return;
    // End any existing session first
    await supabase
      .from('ordering_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('flat_id', flatId)
      .eq('is_active', true);

    await supabase.from('ordering_sessions').insert({
      flat_id: flatId,
      buyer_id: profile.id,
      platform,
      is_active: true,
    });
  }

  async function endOrdering(totalAmount?: number) {
    if (!session) return;

    // Create order record
    const { data: order } = await supabase
      .from('orders')
      .insert({
        flat_id: flatId,
        buyer_id: session.buyer_id,
        session_id: session.id,
        platform: session.platform,
        total_amount: totalAmount ?? null,
      })
      .select()
      .single();

    // Mark purchased items with this order id
    if (order) {
      await supabase
        .from('items')
        .update({ status: 'purchased', order_id: order.id, updated_at: new Date().toISOString() })
        .eq('flat_id', flatId)
        .eq('status', 'in_cart');
    }

    // Close session
    await supabase
      .from('ordering_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', session.id);
  }

  return { session, startOrdering, endOrdering };
}
