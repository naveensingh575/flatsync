'use client';

import { useState, useEffect } from 'react';
import { Check, Trash2, Zap, ChevronDown } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GroceryItem, AddItemPayload, ItemCategory } from '@/types/app.types';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getFriendlyErrorMessage } from '@/lib/sanitizeError';
import toast from 'react-hot-toast';

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
    try {
      await onSave(item.id, {
        item_name: form.item_name.trim() || item.item_name,
        category: form.category,
        is_urgent: form.is_urgent,
        quantity: form.quantity || null,
        note: form.note || null,
        for_user: form.for_user?.trim() || null,
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving item:', err);
      toast.error(getFriendlyErrorMessage(err, 'Failed to save changes'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    try {
      await onDelete(item.id);
      onClose();
    } catch (err: any) {
      console.error('Error deleting item:', err);
      toast.error(getFriendlyErrorMessage(err, 'Failed to delete item'));
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Edit Item ✏️">
      <div className="p-5 pb-10 space-y-4">
        {/* Author & Editor Attribution Banner */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 rounded-xl border border-zinc-150 dark:border-zinc-800">
          <span>Added by <strong className="text-zinc-700 dark:text-zinc-200">{item.requested_by?.name || 'Member'}</strong></span>
          {item.last_edited_by && item.last_edited_by_id !== item.requested_by_id && (
            <span>Last edited by <strong className="text-zinc-700 dark:text-zinc-200">{item.last_edited_by.name || 'Member'}</strong></span>
          )}
        </div>

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
            placeholder="e.g. Alex"
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
            Store / Merchant
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
              <option value="[Blinkit]" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Blinkit</option>
              <option value="[Zepto]" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Zepto</option>
              <option value="[Instamart]" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Instamart</option>
              <option value="[Apollo]" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">💊 Apollo Pharmacy</option>
              <option value="[Local Mandi]" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">🥬 Local Mandi</option>
              <option value="[Licious]" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">🥩 Meat / Licious</option>
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        {/* Out of Stock (OOS) Status Banner & Remove Action */}
        {form.note && form.note.includes('[OOS') && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <div>
                <p className="text-xs font-bold text-rose-800 dark:text-rose-200">
                  {form.note.match(/\[OOS[^\]]*\]/)?.[0]?.replace(/[\[\]]/g, '') || 'Out of Stock'}
                </p>
                <p className="text-[10px] text-rose-600 dark:text-rose-400">
                  Marked as unavailable in previous order
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const clean = (form.note || '').replace(/\[OOS[^\]]*\]/g, '').trim();
                setForm((f) => ({ ...f, note: clean }));
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-700 transition-colors shadow-2xs cursor-pointer flex-shrink-0"
            >
              Remove OOS
            </button>
          </div>
        )}

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
          <Zap size={18} className={form.is_urgent ? 'text-red-500 fill-red-500' : ''} />
          Urgent (needed today)
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
