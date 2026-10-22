'use client';

import { motion } from 'framer-motion';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  selected: string;
  onChange: (cat: string) => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const all = [{ value: 'all', label: 'All', emoji: '✨' }, ...ITEM_CATEGORIES];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-4 scrollbar-none">
      {all.map((cat) => {
        const isSelected = selected === cat.value;
        return (
          <button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            className={cn(
              'relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 flex-shrink-0 cursor-pointer select-none touch-manipulation active:scale-95 active:translate-y-0.5',
              isSelected
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md font-bold border-t border-zinc-700/40 dark:border-zinc-200'
                : 'bg-white dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-250 dark:border-zinc-750 active:bg-zinc-100 dark:active:bg-zinc-800'
            )}
          >
            <span className="text-sm leading-none">{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
