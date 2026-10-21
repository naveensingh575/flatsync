'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GroceryItem, Order } from '@/types/app.types';

export function useHistory(flatId: string) {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchasedItems, setPurchasedItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!flatId) return;

    async function fetch() {
      const [ordersRes, itemsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, buyer:profiles!orders_buyer_id_fkey(*)')
          .eq('flat_id', flatId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('items')
          .select('*, requested_by:profiles!items_requested_by_id_fkey(*)')
          .eq('flat_id', flatId)
          .eq('status', 'purchased')
          .order('updated_at', { ascending: false })
          .limit(50),
      ]);
      setOrders((ordersRes.data as Order[]) ?? []);
      setPurchasedItems((itemsRes.data as GroceryItem[]) ?? []);
      setLoading(false);
    }

    fetch();
  }, [flatId]);

  return { orders, purchasedItems, loading };
}
