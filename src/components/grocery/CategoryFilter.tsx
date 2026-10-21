'use client';

import { ITEM_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  selected: string;
  onChange: (cat: string) => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const all = [{ value: 'all', label: 'All', emoji: '🛒' }, ...ITEM_CATEGORIES];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 px-4 no-scrollbar">
      {all.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0',
            selected === cat.value
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          )}
        >
          <span>{cat.emoji}</span>
          <span>{cat.label}</span>
        </button>
      ))}
    </div>
  );
}
