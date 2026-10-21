import { SupabaseClient } from '@supabase/supabase-js';
import { AddItemPayload, ItemStatus } from '@/types/app.types';

export type OfflineActionType = 'ADD_ITEM' | 'UPDATE_STATUS' | 'DELETE_ITEM';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  timestamp: number;
  payload: {
    tempId?: string;
    flatId: string;
    userId: string;
    itemPayload?: AddItemPayload;
    itemId?: string;
    status?: ItemStatus;
  };
}

const STORAGE_KEY = 'flatsync_offline_queue';

export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineAction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save offline queue:', err);
  }
}

export function enqueueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp'>): void {
  const current = getOfflineQueue();
  const newAction: OfflineAction = {
    ...action,
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };
  saveOfflineQueue([...current, newAction]);
}

/**
 * Flushes all pending actions in order when network is restored
 */
export async function flushOfflineQueue(
  supabase: SupabaseClient,
  onProgress?: (flushedCount: number) => void
): Promise<number> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  let successfulCount = 0;
  const remainingQueue: OfflineAction[] = [];

  for (const action of queue) {
    try {
      if (action.type === 'ADD_ITEM') {
        const { flatId, userId, itemPayload } = action.payload;
        if (itemPayload) {
          const { error } = await supabase.from('items').insert({
            ...itemPayload,
            flat_id: flatId,
            requested_by_id: userId,
            status: 'pending',
          });
          if (error && error.message.includes('for_user')) {
            const { for_user, ...legacy } = itemPayload;
            await supabase.from('items').insert({
              ...legacy,
              flat_id: flatId,
              requested_by_id: userId,
              status: 'pending',
            });
          }
          successfulCount++;
        }
      } else if (action.type === 'UPDATE_STATUS') {
        const { itemId, status } = action.payload;
        if (itemId && status) {
          await supabase
            .from('items')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', itemId);
          successfulCount++;
        }
      } else if (action.type === 'DELETE_ITEM') {
        const { itemId } = action.payload;
        if (itemId) {
          await supabase.from('items').delete().eq('id', itemId);
          successfulCount++;
        }
      }
    } catch {
      // Keep in queue for next retry if still failing
      remainingQueue.push(action);
    }
  }

  saveOfflineQueue(remainingQueue);
  if (onProgress) onProgress(successfulCount);
  return successfulCount;
}
