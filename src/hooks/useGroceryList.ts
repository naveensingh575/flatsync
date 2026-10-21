'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GroceryItem, ItemStatus, AddItemPayload } from '@/types/app.types';
import { useAppStore } from '@/store/useAppStore';
import toast from 'react-hot-toast';

export function useGroceryList(flatId: string) {
  const supabase = createClient();
  const { profile } = useAppStore();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  // Keep a reference to latest items for rollback
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const fetchItems = useCallback(async () => {
    if (!flatId) return;
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*, requested_by:profiles!items_requested_by_id_fkey(*)')
        .eq('flat_id', flatId)
        .in('status', ['pending', 'in_cart'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        setItems(data as GroceryItem[]);
      }
    } catch (e) {
      console.error('Error fetching items:', e);
    } finally {
      setLoading(false);
    }
  }, [flatId]);

  useEffect(() => {
    if (!flatId) return;
    fetchItems();

    // Real-time subscription scoped to this flat's items with status monitoring
    const channel = supabase
      .channel(`items:flat_id=eq.${flatId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `flat_id=eq.${flatId}` },
        () => {
          fetchItems();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [flatId, fetchItems]);

  // 100% Optimistic Add Item
  async function addItem(payload: AddItemPayload) {
    if (!profile?.id) return;

    const tempId = 'temp-' + Date.now();
    const optimisticItem: GroceryItem = {
      id: tempId,
      flat_id: flatId,
      requested_by_id: profile.id,
      requested_by: profile,
      item_name: payload.item_name,
      category: payload.category,
      is_urgent: payload.is_urgent,
      quantity: payload.quantity ?? null,
      note: payload.note ?? null,
      for_user: payload.for_user ?? null,
      status: 'pending',
      ordered_by_id: null,
      order_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Instant local update (< 16ms)
    setItems((prev) => [optimisticItem, ...prev]);

    try {
      const { data, error } = await supabase
        .from('items')
        .insert({
          ...payload,
          flat_id: flatId,
          requested_by_id: profile.id,
          status: 'pending',
        })
        .select('*, requested_by:profiles!items_requested_by_id_fkey(*)')
        .single();

      if (error && error.message.includes('for_user')) {
        const { for_user, ...legacyPayload } = payload;
        const fallbackRes = await supabase
          .from('items')
          .insert({
            ...legacyPayload,
            flat_id: flatId,
            requested_by_id: profile.id,
            status: 'pending',
          })
          .select('*, requested_by:profiles!items_requested_by_id_fkey(*)')
          .single();

        if (fallbackRes.data) {
          setItems((prev) =>
            prev.map((i) => (i.id === tempId ? (fallbackRes.data as GroceryItem) : i))
          );
        }
      } else if (data) {
        // Replace temporary item with confirmed row from database
        setItems((prev) =>
          prev.map((i) => (i.id === tempId ? (data as GroceryItem) : i))
        );
      }
    } catch {
      // Rollback on network failure
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      toast.error('Network error: Failed to add item');
    }
  }

  // 100% Optimistic Update Item
  async function updateItem(itemId: string, updates: Partial<AddItemPayload>) {
    const previous = itemsRef.current;
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
    );

    try {
      const { error } = await supabase
        .from('items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', itemId);

      if (error) throw error;
    } catch {
      setItems(previous);
      toast.error('Failed to update item');
    }
  }

  // 100% Optimistic Status Toggle (Pending <-> In Cart)
  async function updateStatus(itemId: string, status: ItemStatus) {
    if (!profile) return;
    const previous = itemsRef.current;

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, status, ordered_by_id: profile.id, updated_at: new Date().toISOString() }
          : i
      )
    );

    try {
      const { error } = await supabase
        .from('items')
        .update({ status, ordered_by_id: profile.id, updated_at: new Date().toISOString() })
        .eq('id', itemId);

      if (error) throw error;
    } catch {
      setItems(previous);
      toast.error('Could not update status');
    }
  }

  // 100% Optimistic Delete Item
  async function deleteItem(itemId: string) {
    const previous = itemsRef.current;
    setItems((prev) => prev.filter((i) => i.id !== itemId));

    try {
      const { error } = await supabase.from('items').delete().eq('id', itemId);
      if (error) throw error;
    } catch {
      setItems(previous);
      toast.error('Failed to remove item');
    }
  }

  return {
    items,
    loading,
    isConnected,
    addItem,
    updateItem,
    updateStatus,
    deleteItem,
    refetch: fetchItems,
  };
}
