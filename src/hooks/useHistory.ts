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
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchasedItems, setPurchasedItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!flatId) return;

    try {
      // 1. Fetch Orders directly by group_id
      const ordersRes = await supabase
        .from('orders')
        .select('*, buyer:profiles!orders_buyer_id_fkey(*)')
        .eq('group_id', flatId)
        .order('created_at', { ascending: false })
        .limit(30);

      const ordersList: Order[] = (ordersRes.data as Order[]) ?? [];

      // 2. Fetch Purchased Items directly by group_id
      const itemsRes = await supabase
        .from('items')
        .select('*, requested_by:profiles!items_requested_by_id_fkey(*)')
        .eq('group_id', flatId)
        .eq('status', 'purchased')
        .order('updated_at', { ascending: false })
        .limit(60);

      let itemsList: any[] = itemsRes.data ?? [];

      // 3. Resolve last_edited_by profiles for purchased items
      const editorIds = Array.from(
        new Set(
          itemsList
            .map((i) => i.last_edited_by_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      if (editorIds.length > 0) {
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
      }

      setOrders(ordersList);
      setPurchasedItems(itemsList as GroceryItem[]);
    } catch (err) {
      console.error('Error fetching group history:', err);
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

  return { orders, purchasedItems, loading, refetch: fetchHistory };
}
