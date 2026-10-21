'use client';

import { useState, useEffect } from 'react';
import { Check, Trash2, Zap, ChevronDown } from 'lucide-react';
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

        {/* Category Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Category
          </label>
          <div className="relative">
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ItemCategory }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer pr-10"
            >
              {ITEM_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
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

        {/* Store / Merchant Tag Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Store / Merchant Tag (optional)
          </label>
          <div className="relative">
            <select
              value={
                (() => {
                  const match = form.note?.match(/\[(Blinkit|Zepto|Instamart|Apollo|Local Mandi|Licious)[^\]]*\]/i);
                  return match ? match[0] : '';
                })()
              }
              onChange={(e) => {
                const selectedTag = e.target.value;
                const currentNote = form.note || '';
                const cleaned = currentNote.replace(/\[(Blinkit|Zepto|Instamart|Apollo|Local Mandi|Licious)[^\]]*\]/gi, '').trim();
                if (!selectedTag) {
                  setForm((f) => ({ ...f, note: cleaned || '' }));
                } else {
                  setForm((f) => ({ ...f, note: `${selectedTag} ${cleaned}`.trim() }));
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer pr-10"
            >
              <option value="" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Any / No specific store</option>
              <option value="[Blinkit]" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">⚡ Blinkit</option>
              <option value="[Zepto]" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">⚡ Zepto</option>
              <option value="[Instamart]" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">⚡ Instamart</option>
              <option value="[Apollo]" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">💊 Apollo Pharmacy</option>
              <option value="[Local Mandi]" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">🥬 Local Mandi</option>
              <option value="[Licious]" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">🥩 Meat / Licious</option>
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </div>

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
