'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { OrderingSession, Platform } from '@/types/app.types';
import { useAppStore } from '@/store/useAppStore';
import { sendOrderingAlertNotification } from '@/lib/notifications';
import toast from 'react-hot-toast';

// Play a subtle notification chime using Web Audio API (no external asset needed)
function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio autoplay was blocked or not supported
  }
}

const TEN_MINUTES_MS = 10 * 60 * 1000;

export function useOrderingStatus(flatId: string) {
  const supabase = createClient();
  const { profile, setActiveSession, setIsAddItemOpen } = useAppStore();
  const [session, setSession] = useState<OrderingSession | null>(null);

  const prevSessionIdRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef(true);

  const fetchSession = useCallback(async () => {
    if (!flatId) return;
    try {
      const { data, error } = await supabase
        .from('ordering_sessions')
        .select('*, buyer:profiles!ordering_sessions_buyer_id_fkey(*)')
        .or(`group_id.eq.${flatId},flat_id.eq.${flatId}`)
        .eq('is_active', true)
        .maybeSingle();

      let s = (data as OrderingSession) ?? null;

      if (error) {
        const fallback = await supabase
          .from('ordering_sessions')
          .select('*, buyer:profiles!ordering_sessions_buyer_id_fkey(*)')
          .eq('flat_id', flatId)
          .eq('is_active', true)
          .maybeSingle();
        s = (fallback.data as OrderingSession) ?? null;
      }

      // Auto-expire sessions older than 10 minutes without showing counter
      if (s && s.started_at) {
        const elapsed = Date.now() - new Date(s.started_at).getTime();
        if (elapsed >= TEN_MINUTES_MS) {
          await supabase
            .from('ordering_sessions')
            .update({ is_active: false, ended_at: new Date().toISOString() })
            .eq('id', s.id);
          setSession(null);
          setActiveSession(null);
          return;
        }
      }

      setSession(s);
      setActiveSession(s);

      // Check if a new ordering session was started by someone else
      if (s && s.id !== prevSessionIdRef.current) {
        if (!isFirstLoadRef.current && s.buyer_id !== profile?.id) {
          const buyerName = s.buyer?.name || 'Someone';
          const platformName = s.platform ? s.platform.toUpperCase() : 'QUICK-COMMERCE';

          playNotificationChime();
          sendOrderingAlertNotification(buyerName, platformName);

          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xl rounded-2xl pointer-events-auto flex items-center justify-between p-4 border border-amber-400`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-bounce">⚡</span>
                  <div>
                    <p className="font-bold text-sm leading-tight">
                      {buyerName} is ordering on {platformName}!
                    </p>
                    <p className="text-xs text-amber-100 mt-0.5">
                      Need anything? Tap to add before checkout!
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    setIsAddItemOpen(true);
                  }}
                  className="px-3 py-1.5 bg-white text-orange-600 font-bold text-xs rounded-xl shadow-md hover:bg-orange-50 transition-colors flex-shrink-0"
                >
                  + Quick Add
                </button>
              </div>
            ),
            { duration: 8000 }
          );
        }
        prevSessionIdRef.current = s.id;
      } else if (!s) {
        prevSessionIdRef.current = null;
      }

      isFirstLoadRef.current = false;
    } catch (e) {
      console.error('Error fetching session:', e);
    }
  }, [flatId, profile?.id, setActiveSession, setIsAddItemOpen]);

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [flatId, fetchSession]);

  // Auto-disappear ordering session after 10 minutes without showing counter
  useEffect(() => {
    if (!session?.started_at || !session.is_active) return;

    const elapsed = Date.now() - new Date(session.started_at).getTime();
    const remaining = TEN_MINUTES_MS - elapsed;

    if (remaining <= 0) {
      setSession(null);
      setActiveSession(null);
      supabase
        .from('ordering_sessions')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('id', session.id)
        .then(() => {});
      return;
    }

    const timer = setTimeout(() => {
      setSession(null);
      setActiveSession(null);
      supabase
        .from('ordering_sessions')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('id', session.id)
        .then(() => {});
    }, remaining);

    return () => clearTimeout(timer);
  }, [session?.id, session?.started_at, session?.is_active, supabase, setActiveSession]);

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
