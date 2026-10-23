'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GroceryItem, Order } from '@/types/app.types';
import { useAppStore } from '@/store/useAppStore';

export function useHistory(inputFlatId?: string) {
  const supabase = createClient();
  const { profile, currentGroupId, userGroups } = useAppStore();
  const flatId = (inputFlatId && inputFlatId !== 'current' && inputFlatId !== 'list')
    ? inputFlatId
    : (currentGroupId || profile?.group_id || profile?.flat_id || (userGroups.length > 0 ? userGroups[0]?.id : ''));

  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined' && flatId) {
      try {
        const cached = localStorage.getItem(`grocerysync_history_orders_${flatId}`);
        if (cached) return JSON.parse(cached);
      } catch (_) {}
    }
    return [];
  });

  const [purchasedItems, setPurchasedItems] = useState<GroceryItem[]>(() => {
    if (typeof window !== 'undefined' && flatId) {
      try {
        const cached = localStorage.getItem(`grocerysync_history_items_${flatId}`);
        if (cached) return JSON.parse(cached);
      } catch (_) {}
    }
    return [];
  });

  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!flatId) return;

    const timeoutPromise = new Promise<{ timeout: true }>((_, reject) =>
      setTimeout(() => reject(new Error('Network timeout')), 6500)
    );

    try {
      // 1. Fetch Orders and Purchased Items in parallel with timeout protection
      const ordersPromise = supabase
        .from('orders')
        .select('*, buyer:profiles!orders_buyer_id_fkey(*)')
        .eq('group_id', flatId)
        .order('created_at', { ascending: false })
        .limit(30);

      const itemsPromise = supabase
        .from('items')
        .select('*, requested_by:profiles!items_requested_by_id_fkey(*)')
        .eq('group_id', flatId)
        .eq('status', 'purchased')
        .order('updated_at', { ascending: false })
        .limit(60);

      const [ordersRes, itemsRes]: any = await Promise.race([
        Promise.all([ordersPromise, itemsPromise]),
        timeoutPromise,
      ]);

      if (ordersRes.error) {
        console.error('Error fetching orders:', ordersRes.error);
        setIsError(true);
        return;
      }

      const ordersList: Order[] = (ordersRes.data as Order[]) ?? [];
      let itemsList: any[] = itemsRes.data ?? [];

      // 2. Resolve last_edited_by profiles for purchased items
      const editorIds = Array.from(
        new Set(
          itemsList
            .map((i) => i.last_edited_by_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      if (editorIds.length > 0) {
        try {
          const { data: editorProfiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', editorIds);

          const editorMap = new Map((editorProfiles || []).map((p: any) => [p.id, p]));
          itemsList = itemsList.map((item) => ({
            ...item,
            last_edited_by: item.last_edited_by_id
              ? editorMap.get(item.last_edited_by_id) || (item.last_edited_by_id === item.requested_by_id ? item.requested_by : undefined)
              : undefined,
          }));
        } catch (_) {}
      }

      setOrders(ordersList);
      setPurchasedItems(itemsList as GroceryItem[]);
      setIsError(false);

      // Cache locally for offline/low-network fallback
      try {
        localStorage.setItem(`grocerysync_history_orders_${flatId}`, JSON.stringify(ordersList));
        localStorage.setItem(`grocerysync_history_items_${flatId}`, JSON.stringify(itemsList));
      } catch (_) {}
    } catch (err) {
      console.error('Error fetching group history:', err);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [flatId, supabase]);

  useEffect(() => {
    if (!flatId) return;
    setLoading(true);
    fetchHistory();

    // Realtime subscriptions for orders and purchased items
    const ordersChannel = supabase
      .channel(`history-orders:${flatId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    const itemsChannel = supabase
      .channel(`history-items:${flatId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [flatId, fetchHistory, supabase]);

  return { orders, purchasedItems, loading, isError, refetch: fetchHistory };
}
