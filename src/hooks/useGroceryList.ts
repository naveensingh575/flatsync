'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GroceryItem, ItemStatus, AddItemPayload } from '@/types/app.types';
import { useAppStore } from '@/store/useAppStore';

export function useGroceryList(flatId: string) {
  const supabase = createClient();
  const { profile } = useAppStore();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!flatId) return;
    const { data } = await supabase
      .from('items')
      .select('*, requested_by:profiles!items_requested_by_id_fkey(*)')
      .eq('flat_id', flatId)
      .in('status', ['pending', 'in_cart'])
      .order('created_at', { ascending: false });
    setItems((data as GroceryItem[]) ?? []);
    setLoading(false);
  }, [flatId]);

  useEffect(() => {
    if (!flatId) return;
    fetchItems();

    // Real-time subscription scoped to this flat's items
    const channel = supabase
      .channel(`items:flat_id=eq.${flatId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `flat_id=eq.${flatId}` },
        () => fetchItems()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [flatId, fetchItems]);

  async function addItem(payload: AddItemPayload) {
    if (!profile?.id) return;
    const { error } = await supabase.from('items').insert({
      ...payload,
      flat_id: flatId,
      requested_by_id: profile.id,
      status: 'pending',
    });

    if (error && error.message.includes('for_user')) {
      const { for_user, ...legacyPayload } = payload;
      await supabase.from('items').insert({
        ...legacyPayload,
        flat_id: flatId,
        requested_by_id: profile.id,
        status: 'pending',
      });
    }
  }

  async function updateItem(itemId: string, updates: Partial<AddItemPayload>) {
    await supabase
      .from('items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', itemId);
  }

  async function updateStatus(itemId: string, status: ItemStatus) {
    if (!profile) return;
    await supabase
      .from('items')
      .update({ status, ordered_by_id: profile.id, updated_at: new Date().toISOString() })
      .eq('id', itemId);
  }

  async function deleteItem(itemId: string) {
    await supabase.from('items').delete().eq('id', itemId);
  }

  return { items, loading, addItem, updateItem, updateStatus, deleteItem, refetch: fetchItems };
}
