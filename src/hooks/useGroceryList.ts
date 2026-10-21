'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GroceryItem, ItemStatus, AddItemPayload } from '@/types/app.types';
import { useAppStore } from '@/store/useAppStore';
import { enqueueOfflineAction, flushOfflineQueue, getOfflineQueue } from '@/lib/offlineQueue';
import toast from 'react-hot-toast';

export function useGroceryList(flatId: string) {
  const supabase = createClient();
  const { profile } = useAppStore();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  );

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
    setLoading(true);
    setItems([]);
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

    const handleOnline = async () => {
      setIsOnline(true);
      const count = await flushOfflineQueue(supabase);
      if (count > 0) {
        toast.success(`Back online! Synced ${count} item${count > 1 ? 's' : ''} 🟢`);
        fetchItems();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast('You are offline. Actions will be queued 📴', { icon: '📴' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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

    // Handle offline queue
    if (typeof window !== 'undefined' && !navigator.onLine) {
      enqueueOfflineAction({
        type: 'ADD_ITEM',
        payload: { flatId, userId: profile.id, itemPayload: payload, tempId },
      });
      toast('Saved offline (will sync when online) 📴', { icon: '📴' });
      return;
    }

    try {
      // 1. Ensure user has membership recorded for flatId in group_members and profile.flat_id
      try {
        await supabase
          .from('group_members')
          .upsert({ group_id: flatId, user_id: profile.id, role: 'member' }, { onConflict: 'group_id,user_id' });
      } catch (_) {}

      if (profile.flat_id !== flatId) {
        try {
          await supabase.from('profiles').update({ flat_id: flatId }).eq('id', profile.id);
        } catch (_) {}
      }

      // 2. Perform insert
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

      if (error) {
        console.warn('Primary insert failed, attempting fallback:', error);
        // Fallback: strip fields that might not exist in old schema
        const fallbackPayload: any = {
          item_name: payload.item_name,
          category: payload.category,
          flat_id: flatId,
          requested_by_id: profile.id,
          status: 'pending',
        };
        if (payload.quantity) fallbackPayload.quantity = payload.quantity;
        if (payload.is_urgent !== undefined) fallbackPayload.is_urgent = payload.is_urgent;
        if (payload.note) fallbackPayload.note = payload.note;

        const fallbackRes = await supabase
          .from('items')
          .insert(fallbackPayload)
          .select('*, requested_by:profiles!items_requested_by_id_fkey(*)')
          .single();

        if (fallbackRes.data) {
          setItems((prev) =>
            prev.map((i) => (i.id === tempId ? (fallbackRes.data as GroceryItem) : i))
          );
        } else if (fallbackRes.error) {
          console.error('Fallback insert failed:', fallbackRes.error);
          // If RLS blocked insert, guide user or keep optimistic
          if (fallbackRes.error.message.includes('row-level security')) {
            console.warn('RLS policy requires membership sync');
          } else {
            toast.error(fallbackRes.error.message || 'Failed to sync item to database');
          }
        }
      } else if (data) {
        // Replace temporary item with confirmed row from database
        setItems((prev) =>
          prev.map((i) => (i.id === tempId ? (data as GroceryItem) : i))
        );
      }
    } catch (err: any) {
      console.error('Network error adding item:', err);
      // Keep optimistic item in state so user doesn't lose what they just typed
    }
  }

  // 100% Optimistic Batch Add Items (Multi-Item Paste)
  async function addBatchItems(payloads: AddItemPayload[]) {
    if (!profile || payloads.length === 0) return;

    const tempItems: GroceryItem[] = payloads.map((payload, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      flat_id: flatId,
      requested_by_id: profile.id,
      requested_by: profile,
      for_user: payload.for_user || null,
      item_name: payload.item_name,
      category: payload.category || 'other',
      is_urgent: payload.is_urgent || false,
      quantity: payload.quantity || null,
      note: payload.note || null,
      status: 'pending',
      ordered_by_id: null,
      order_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Optimistically append all items
    setItems((prev) => [...prev, ...tempItems]);

    try {
      const rows = payloads.map((p) => ({
        item_name: p.item_name,
        category: p.category || 'other',
        is_urgent: p.is_urgent || false,
        quantity: p.quantity || null,
        note: p.note || null,
        for_user: p.for_user || null,
        flat_id: flatId,
        requested_by_id: profile.id,
        status: 'pending',
      }));

      const { data, error } = await supabase
        .from('items')
        .insert(rows)
        .select('*, requested_by:profiles!items_requested_by_id_fkey(*)');

      if (error && error.message.includes('for_user')) {
        const fallbackRows = rows.map(({ for_user, ...r }) => r);
        const fallbackRes = await supabase
          .from('items')
          .insert(fallbackRows)
          .select('*, requested_by:profiles!items_requested_by_id_fkey(*)');

        if (fallbackRes.data) {
          const tempIds = new Set(tempItems.map((t) => t.id));
          setItems((prev) => [
            ...prev.filter((i) => !tempIds.has(i.id)),
            ...(fallbackRes.data as GroceryItem[]),
          ]);
        }
      } else if (data) {
        const tempIds = new Set(tempItems.map((t) => t.id));
        setItems((prev) => [
          ...prev.filter((i) => !tempIds.has(i.id)),
          ...(data as GroceryItem[]),
        ]);
      }
    } catch {
      const tempIds = new Set(tempItems.map((t) => t.id));
      setItems((prev) => prev.filter((i) => !tempIds.has(i.id)));
      toast.error('Network error: Failed to add batch items');
    }
  }

  // 100% Optimistic Update Item
  async function updateItem(itemId: string, updates: Partial<AddItemPayload>) {
    const previous = itemsRef.current;
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
    );

    // If it's a temporary local item that hasn't synced an ID yet, update is already applied locally
    if (itemId.startsWith('temp-')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', itemId);

      if (error) {
        console.warn('Update item error, trying fallback:', error);
        // Fallback: strip fields like for_user or special columns if not supported
        const { for_user, ...cleanUpdates } = updates as any;
        const fallbackRes = await supabase
          .from('items')
          .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
          .eq('id', itemId);

        if (fallbackRes.error) {
          console.error('Fallback update failed:', fallbackRes.error);
          setItems(previous);
          toast.error(fallbackRes.error.message || 'Failed to update item');
        }
      }
    } catch (err: any) {
      console.error('Network update error:', err);
      // Keep optimistic changes
    }
  }

  // 100% Optimistic Status Toggle (Pending <-> In Cart)
  async function updateStatus(itemId: string, status: ItemStatus) {
    const userId = profile?.id || null;
    const previous = itemsRef.current;

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, status, ordered_by_id: userId, updated_at: new Date().toISOString() }
          : i
      )
    );

    if (itemId.startsWith('temp-')) {
      return;
    }

    if (typeof window !== 'undefined' && !navigator.onLine) {
      if (userId) {
        enqueueOfflineAction({
          type: 'UPDATE_STATUS',
          payload: { flatId, userId, itemId, status },
        });
      }
      return;
    }

    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (userId) {
        updateData.ordered_by_id = userId;
      }

      const { error } = await supabase
        .from('items')
        .update(updateData)
        .eq('id', itemId);

      if (error) {
        console.warn('Primary status update error:', error);
        // Fallback without ordered_by_id in case foreign key or schema mismatch
        const fallbackRes = await supabase
          .from('items')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', itemId);

        if (fallbackRes.error) {
          console.error('Fallback status update failed:', fallbackRes.error);
          setItems(previous);
          toast.error(fallbackRes.error.message || 'Could not update status');
        }
      }
    } catch (err: any) {
      console.error('Network status update error:', err);
      // Keep optimistic changes so user isn't disrupted
    }
  }

  // 100% Optimistic Delete Item
  async function deleteItem(itemId: string) {
    const previous = itemsRef.current;
    setItems((prev) => prev.filter((i) => i.id !== itemId));

    // If item was local temp, deletion is already complete
    if (itemId.startsWith('temp-')) {
      return;
    }

    if (typeof window !== 'undefined' && !navigator.onLine) {
      enqueueOfflineAction({
        type: 'DELETE_ITEM',
        payload: { flatId, userId: profile?.id || '', itemId },
      });
      return;
    }

    try {
      const { error } = await supabase.from('items').delete().eq('id', itemId);
      if (error) {
        console.error('Database delete error:', error);
        setItems(previous);
        toast.error(error.message || 'Failed to remove item');
      }
    } catch (err: any) {
      console.error('Network delete error:', err);
      // Keep item deleted in local view
    }
  }

  return {
    items,
    loading,
    isConnected,
    isOnline,
    addItem,
    addBatchItems,
    updateItem,
    updateStatus,
    deleteItem,
    refetch: fetchItems,
  };
}
