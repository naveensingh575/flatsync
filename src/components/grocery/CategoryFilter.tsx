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
              'relative flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 cursor-pointer active:scale-95',
              isSelected
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm font-bold'
                : 'bg-white dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200/80 dark:border-zinc-800/80'
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
