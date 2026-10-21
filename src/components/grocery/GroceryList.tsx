'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBasket } from 'lucide-react';
import { GroceryItem as GroceryItemType, ItemStatus } from '@/types/app.types';
import { GroceryItemCard } from './GroceryItem';

interface GroceryListProps {
  items: GroceryItemType[];
  loading: boolean;
  isOrderingMode: boolean;
  onUpdateStatus: (id: string, status: ItemStatus) => void;
  onDelete: (id: string) => void;
}

export function GroceryList({
  items,
  loading,
  isOrderingMode,
  onUpdateStatus,
  onDelete,
}: GroceryListProps) {
  if (loading) {
    return (
      <div className="px-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3 py-16 text-center px-4"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
          <ShoppingBasket size={30} className="text-emerald-500" />
        </div>
        <p className="font-semibold text-zinc-700 dark:text-zinc-300">List is clear! 🎉</p>
        <p className="text-sm text-zinc-400">Tap + to add something you need.</p>
      </motion.div>
    );
  }

  return (
    <div className="px-4 space-y-2">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <GroceryItemCard
            key={item.id}
            item={item}
            onUpdateStatus={onUpdateStatus}
            onDelete={onDelete}
            isOrderingMode={isOrderingMode}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
