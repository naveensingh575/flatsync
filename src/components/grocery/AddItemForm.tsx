'use client';

import { useState } from 'react';
import { Plus, Zap, User } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AddItemPayload, ItemCategory } from '@/types/app.types';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface AddItemFormProps {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: AddItemPayload) => Promise<void>;
  prefill?: Partial<AddItemPayload>;
}

const defaultState: AddItemPayload = {
  item_name: '',
  category: 'other',
  is_urgent: false,
  quantity: '',
  note: '',
  for_user: '',
};

export function AddItemForm({ open, onClose, onAdd, prefill }: AddItemFormProps) {
  const [form, setForm] = useState<AddItemPayload>({ ...defaultState, ...prefill });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof AddItemPayload>(key: K, val: AddItemPayload[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    if (!form.item_name.trim()) { setError('Item name is required'); return; }
    setError('');
    setLoading(true);
    await onAdd({
      ...form,
      quantity: form.quantity || null,
      note: form.note || null,
      for_user: form.for_user?.trim() || null,
    });
    setForm({ ...defaultState });
    setLoading(false);
    onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add Item to List">
      <div className="p-5 space-y-5">
        <Input
          label="Item Name *"
          placeholder="e.g. Amul Butter 500g"
          value={form.item_name}
          onChange={(e) => set('item_name', e.target.value)}
          error={error}
          autoFocus
        />

        {/* Category grid */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Category</p>
          <div className="grid grid-cols-4 gap-2">
            {ITEM_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => set('category', cat.value as ItemCategory)}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-medium transition-all',
                  form.category === cat.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
                )}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Quantity"
            placeholder="e.g. 2 packs, 1 kg"
            value={form.quantity ?? ''}
            onChange={(e) => set('quantity', e.target.value)}
          />
          <Input
            label="For person (optional)"
            placeholder="e.g. Naveen, Mom, Alex"
            value={form.for_user ?? ''}
            onChange={(e) => set('for_user', e.target.value)}
          />
        </div>

        <Input
          label="Note (optional)"
          placeholder="e.g. Brand preferences or replacement instructions"
          value={form.note ?? ''}
          onChange={(e) => set('note', e.target.value)}
        />

        {/* Urgent toggle */}
        <button
          onClick={() => set('is_urgent', !form.is_urgent)}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-sm font-medium',
            form.is_urgent
              ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
          )}
        >
          <Zap size={18} className={form.is_urgent ? 'text-red-500' : ''} />
          {form.is_urgent ? '⚡ Marked as Urgent' : 'Mark as Urgent (needed today)'}
        </button>

        <Button className="w-full" size="lg" onClick={handleSubmit} loading={loading}>
          <Plus size={18} />
          Add to List
        </Button>
      </div>
    </Drawer>
  );
}
