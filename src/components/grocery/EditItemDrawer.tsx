'use client';

import { useState, useEffect } from 'react';
import { Check, Trash2, Zap } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GroceryItem, AddItemPayload, ItemCategory } from '@/types/app.types';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface EditItemDrawerProps {
  item: GroceryItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<AddItemPayload>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function EditItemDrawer({
  item,
  open,
  onClose,
  onSave,
  onDelete,
}: EditItemDrawerProps) {
  const [form, setForm] = useState<AddItemPayload>({
    item_name: '',
    category: 'other',
    is_urgent: false,
    quantity: '',
    note: '',
    for_user: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        item_name: item.item_name || '',
        category: item.category || 'other',
        is_urgent: item.is_urgent || false,
        quantity: item.quantity || '',
        note: item.note || '',
        for_user: item.for_user || '',
      });
    }
  }, [item]);

  if (!item) return null;

  async function handleSave() {
    if (!item) return;
    setSaving(true);
    await onSave(item.id, {
      item_name: form.item_name.trim() || item.item_name,
      category: form.category,
      is_urgent: form.is_urgent,
      quantity: form.quantity || null,
      note: form.note || null,
      for_user: form.for_user?.trim() || null,
    });
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    if (!item) return;
    await onDelete(item.id);
    onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Edit Item ✏️">
      <div className="p-5 space-y-4">
        <Input
          label="Item Name"
          value={form.item_name}
          onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
        />

        {/* Category selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Category
          </label>
          <div className="grid grid-cols-4 gap-2">
            {ITEM_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, category: cat.value as ItemCategory }))}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-medium transition-all',
                  form.category === cat.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
                )}
              >
                <span className="text-lg">{cat.emoji}</span>
                <span className="text-[11px] truncate">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Quantity"
            placeholder="e.g. 2 packs"
            value={form.quantity ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
          />
          <Input
            label="For Person"
            placeholder="e.g. Naveen, Priya"
            value={form.for_user ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, for_user: e.target.value }))}
          />
        </div>

        <Input
          label="Note"
          placeholder="e.g. Specific brand, size"
          value={form.note ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        />

        {/* Urgent toggle */}
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, is_urgent: !f.is_urgent }))}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-sm font-medium',
            form.is_urgent
              ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
          )}
        >
          <Zap size={18} className={form.is_urgent ? 'text-red-500' : ''} />
          {form.is_urgent ? '⚡ Marked as Urgent' : 'Mark as Urgent'}
        </button>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={handleDelete}
            className="px-3"
            title="Delete item"
          >
            <Trash2 size={16} />
          </Button>

          <Button
            type="button"
            className="flex-1"
            size="md"
            onClick={handleSave}
            loading={saving}
          >
            <Check size={16} />
            Save Changes
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
