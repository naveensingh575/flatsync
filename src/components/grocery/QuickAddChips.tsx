'use client';

import { RotateCcw } from 'lucide-react';
import { GroceryItem } from '@/types/app.types';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { AddItemPayload } from '@/types/app.types';
import { cn } from '@/lib/utils';

interface QuickAddChipsProps {
  recentItems: GroceryItem[];
  onQuickAdd: (payload: AddItemPayload) => void;
}

export function QuickAddChips({ recentItems, onQuickAdd }: QuickAddChipsProps) {
  if (recentItems.length === 0) return null;

  // De-duplicate by item_name (case-insensitive)
  const unique = Array.from(
    new Map(recentItems.map((i) => [i.item_name.toLowerCase(), i])).values()
  ).slice(0, 8);

  return (
    <div className="px-4 space-y-2">
      <div className="flex items-center gap-2">
        <RotateCcw size={13} className="text-zinc-400" />
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Quick Re-add</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {unique.map((item) => {
          const cat = ITEM_CATEGORIES.find((c) => c.value === item.category);
          return (
            <button
              key={item.id}
              onClick={() =>
                onQuickAdd({
                  item_name: item.item_name,
                  category: item.category,
                  is_urgent: false,
                  quantity: item.quantity,
                  note: item.note,
                })
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <span>{cat?.emoji}</span>
              <span>{item.item_name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
