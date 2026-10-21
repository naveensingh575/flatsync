'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag, Sparkles, Plus } from 'lucide-react';
import { GroceryItem as GroceryItemType, ItemStatus, AddItemPayload } from '@/types/app.types';
import { GroceryItemCard } from './GroceryItem';

const STARTER_STAPLES: AddItemPayload[] = [
  { item_name: 'Amul Taaza Milk', category: 'dairy', quantity: '500ml', is_urgent: false, note: null, for_user: null },
  { item_name: 'Eggs (Pack of 6)', category: 'dairy', quantity: '6 pcs', is_urgent: false, note: null, for_user: null },
  { item_name: 'Brown Bread', category: 'snacks', quantity: '1 pack', is_urgent: false, note: null, for_user: null },
  { item_name: 'Fresh Curd / Dahi', category: 'dairy', quantity: '400g', is_urgent: false, note: null, for_user: null },
  { item_name: 'Bananas (6 pcs)', category: 'fruits', quantity: '6 pcs', is_urgent: false, note: null, for_user: null },
];

interface GroceryListProps {
  items: GroceryItemType[];
  loading: boolean;
  isOrderingMode: boolean;
  onUpdateStatus: (id: string, status: ItemStatus) => void;
  onDelete: (id: string) => void;
  onEdit?: (item: GroceryItemType) => void;
  onUpdateItem?: (id: string, updates: Partial<AddItemPayload>) => Promise<void> | void;
  onQuickAdd?: (payload: AddItemPayload) => void;
}

export function GroceryList({
  items,
  loading,
  isOrderingMode,
  onUpdateStatus,
  onDelete,
  onEdit,
  onUpdateItem,
  onQuickAdd,
}: GroceryListProps) {
  if (loading) {
    return (
      <div className="px-4 space-y-2.5">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 animate-pulse border border-zinc-200/50 dark:border-zinc-800/50"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3.5 py-14 text-center px-4 max-w-sm mx-auto"
      >
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-center shadow-xs">
          <ShoppingBag size={28} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="font-bold text-base text-zinc-900 dark:text-white">
            All stocked up! 🎉
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
            Nothing is needed right now. Add an item with the quick bar above or tap a staple to get started:
          </p>
        </div>

        {onQuickAdd && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
            {STARTER_STAPLES.map((staple) => (
              <button
                key={staple.item_name}
                type="button"
                onClick={() => onQuickAdd(staple)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-2xs active:scale-95 cursor-pointer"
              >
                <Plus size={13} className="text-emerald-600" />
                <span>{staple.item_name}</span>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="px-4 space-y-2.5">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <GroceryItemCard
            key={item.id}
            item={item}
            onUpdateStatus={onUpdateStatus}
            onDelete={onDelete}
            onEdit={onEdit}
            onUpdateItem={onUpdateItem}
            isOrderingMode={isOrderingMode}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
