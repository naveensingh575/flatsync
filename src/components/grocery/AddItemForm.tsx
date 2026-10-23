'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Zap, Mic, MicOff, Sparkles, Check, ChevronDown, ListPlus, FileText } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AddItemPayload, ItemCategory, GroceryItem } from '@/types/app.types';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { parseGroceryInput, parseBulkGroceryInput } from '@/lib/itemParser';
import { COMMON_INDIAN_GROCERIES, FREQUENT_STAPLES, GroceryCatalogItem } from '@/lib/groceryCatalog';
import { findSimilarItem, bumpItemQuantity, mergeQuantities } from '@/lib/itemMatcher';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { getFriendlyErrorMessage } from '@/lib/sanitizeError';
import toast from 'react-hot-toast';

interface AddItemFormProps {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: AddItemPayload) => Promise<void>;
  onAddBatch?: (payloads: AddItemPayload[]) => Promise<void>;
  onUpdateItem?: (id: string, updates: Partial<AddItemPayload>) => Promise<void>;
  existingItems?: GroceryItem[];
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

interface ParsedBulkEntry {
  id: string;
  item: AddItemPayload;
  selected: boolean;
}

export function AddItemForm({
  open,
  onClose,
  onAdd,
  onAddBatch,
  onUpdateItem,
  existingItems,
  prefill,
}: AddItemFormProps) {
  const [entryMode, setEntryMode] = useState<'single' | 'bulk'>('single');
  const [form, setForm] = useState<AddItemPayload>({ ...defaultState, ...prefill });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<GroceryCatalogItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [parsedBanner, setParsedBanner] = useState<string | null>(null);

  const similarItem = form.item_name.trim().length >= 2
    ? findSimilarItem(form.item_name, existingItems || [])
    : null;

  // Bulk mode states
  const [bulkText, setBulkText] = useState('');
  const [parsedBulkItems, setParsedBulkItems] = useState<ParsedBulkEntry[]>([]);

  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Sync prefill when drawer opens
  useEffect(() => {
    if (open) {
      setForm({ ...defaultState, ...prefill });
      setError('');
      setParsedBanner(null);
      setSuggestions([]);
      setBulkText('');
      setParsedBulkItems([]);
      setEntryMode('single');
    }
  }, [open, prefill]);

  // Voice speech-to-text integration
  const {
    isListening,
    transcript,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
    error: voiceError,
  } = useVoiceInput((liveText) => {
    handleApplySmartParse(liveText);
  });

  useEffect(() => {
    if (voiceError) {
      toast.error(voiceError);
    }
  }, [voiceError]);

  useEffect(() => {
    if (!open && isListening) {
      stopListening();
    }
  }, [open, isListening, stopListening]);

  // Apply parsed attributes from natural language
  function handleApplySmartParse(text: string) {
    if (!text.trim()) return;
    const parsed = parseGroceryInput(text);
    const resolvedName = parsed.item_name || text.trim();
    setForm((prev) => ({
      ...prev,
      item_name: resolvedName,
      category: (parsed.category && parsed.category !== 'other') ? parsed.category : prev.category,
      quantity: parsed.quantity || prev.quantity,
      note: parsed.note || prev.note,
      is_urgent: parsed.is_urgent !== undefined ? parsed.is_urgent : prev.is_urgent,
      for_user: parsed.for_user || prev.for_user,
    }));

    const tags: string[] = [];
    if (parsed.quantity) tags.push(`Qty: ${parsed.quantity}`);
    if (parsed.category && parsed.category !== 'other') tags.push(`Cat: ${parsed.category}`);
    if (parsed.note) tags.push(`Note: ${parsed.note}`);
    if (parsed.is_urgent) tags.push('Urgent');
    if (parsed.for_user) tags.push(`For: ${parsed.for_user}`);

    if (tags.length > 0) {
      setParsedBanner(tags.join(' · '));
    }
  }

  function set<K extends keyof AddItemPayload>(key: K, val: AddItemPayload[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // Handle typing in item name & filter suggestions
  function handleItemNameChange(val: string) {
    set('item_name', val);
    setError('');

    // Filter grocery catalog
    const query = val.trim().toLowerCase();
    if (query.length >= 2) {
      const matches = COMMON_INDIAN_GROCERIES.filter((item) =>
        item.name.toLowerCase().includes(query)
      ).slice(0, 5);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  // Select staple or autocomplete suggestion
  function selectSuggestion(item: GroceryCatalogItem) {
    setForm((prev) => ({
      ...prev,
      item_name: item.name,
      category: item.category,
      quantity: item.defaultQty || prev.quantity,
    }));
    setShowSuggestions(false);
    toast.success(`Selected ${item.emoji} ${item.name}`, { duration: 1500 });
  }

  // Bulk input text handler
  function handleBulkTextChange(val: string) {
    setBulkText(val);
    const parsed = parseBulkGroceryInput(val);
    setParsedBulkItems(
      parsed.map((it, idx) => ({
        id: `p-${idx}-${it.item_name}`,
        item: it,
        selected: true,
      }))
    );
  }

  function toggleBulkItem(id: string) {
    setParsedBulkItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  }

  // Single Item Submit
  async function handleSubmit() {
    if (!form.item_name.trim()) {
      setError('Item name is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onAdd({
        ...form,
        quantity: form.quantity || null,
        note: form.note || null,
        for_user: form.for_user?.trim() || null,
      });
      setForm({ ...defaultState });
      onClose();
    } catch (err: any) {
      console.error('Error adding item:', err);
      toast.error(getFriendlyErrorMessage(err, 'Failed to add item'));
    } finally {
      setLoading(false);
    }
  }

  // Bulk Batch Submit
  async function handleBulkSubmit() {
    const selected = parsedBulkItems.filter((i) => i.selected).map((i) => i.item);
    if (selected.length === 0) {
      toast.error('No items selected to import');
      return;
    }

    setLoading(true);
    try {
      if (onAddBatch) {
        await onAddBatch(selected);
      } else {
        for (const item of selected) {
          await onAdd(item);
        }
      }

      toast.success(`Imported ${selected.length} items to list! 🚀`);
      setBulkText('');
      setParsedBulkItems([]);
      onClose();
    } catch (err: any) {
      console.error('Error importing items:', err);
      toast.error(getFriendlyErrorMessage(err, 'Failed to import items'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add Items to List 🛒" className="max-h-[95vh]">
      <div className="p-5 pb-10 space-y-4">
        {/* Entry Mode Tab Switcher */}
        <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1">
          <button
            type="button"
            onClick={() => setEntryMode('single')}
            className={cn(
              'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all',
              entryMode === 'single'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
            )}
          >
            Item
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('bulk')}
            className={cn(
              'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
              entryMode === 'bulk'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
            )}
          >
            <ListPlus size={14} />
            <span>List (Bulk)</span>
            {parsedBulkItems.length > 0 && (
              <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {parsedBulkItems.length}
              </span>
            )}
          </button>
        </div>

        {/* MODE 1: SINGLE ITEM (VOICE + AUTOCOMPLETE + STAPLES) */}
        {entryMode === 'single' ? (
          <>
            {/* Frequent Staples Shelf */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Quick Staples
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {FREQUENT_STAPLES.map((staple) => (
                  <button
                    key={staple.name}
                    type="button"
                    onClick={() => selectSuggestion(staple)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 active:bg-zinc-250 dark:active:bg-zinc-650 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 whitespace-nowrap transition-all cursor-pointer select-none touch-manipulation active:scale-95 active:translate-y-0.5 shadow-2xs"
                  >
                    <span>{staple.emoji}</span>
                    <span>{staple.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice dictation banner if active */}
            {isListening && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                    Listening... Speak naturally (e.g. &quot;2 packets Amul milk urgent for Alex&quot;)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={stopListening}
                  className="text-xs px-2 py-1 rounded bg-red-600 text-white font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}

            {/* Live parsed badge feedback */}
            {parsedBanner && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                <Sparkles size={13} className="text-emerald-600 flex-shrink-0" />
                <span className="truncate">Auto-parsed: {parsedBanner}</span>
              </div>
            )}

            {/* Item Name with Voice Button and Autocomplete */}
            <div className="relative" ref={autocompleteRef}>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Item Name *"
                    placeholder="e.g. Amul Butter 500g, Onions 1kg..."
                    value={form.item_name}
                    onChange={(e) => handleItemNameChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    error={error}
                  />
                </div>

                {/* Mic Dictation Button */}
                {isVoiceSupported && (
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={cn(
                      'h-10 px-3 rounded-xl border flex items-center justify-center gap-1 text-xs font-bold transition-all shadow-sm flex-shrink-0 mb-[1px] cursor-pointer',
                      isListening
                        ? 'bg-red-500 border-red-500 text-white animate-pulse'
                        : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'
                    )}
                    title={isListening ? 'Stop listening' : 'Speak to add item'}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} className="text-emerald-600" />}
                    <span className="hidden sm:inline">{isListening ? 'Stop' : 'Voice'}</span>
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                  {suggestions.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => selectSuggestion(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.emoji}</span>
                        <span className="font-semibold text-zinc-900 dark:text-white">
                          {item.name}
                        </span>
                      </div>
                      {item.defaultQty && (
                        <span className="text-[11px] text-zinc-400 font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                          {item.defaultQty}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Category
              </label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => set('category', e.target.value as ItemCategory)}
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

            {/* Quantity & For Person */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantity"
                placeholder="e.g. 2 packs, 1 kg"
                value={form.quantity ?? ''}
                onChange={(e) => set('quantity', e.target.value)}
              />
              <Input
                label="For Person"
                placeholder="e.g. Alex"
                value={form.for_user ?? ''}
                onChange={(e) => set('for_user', e.target.value)}
              />
            </div>

            {/* Note */}
            <Input
              label="Note"
              placeholder="e.g. Brand preferences or replacement instructions"
              value={form.note ?? ''}
              onChange={(e) => set('note', e.target.value)}
            />

            {/* Preferred Merchant / Specialty Store Tag Dropdown */}
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
                      set('note', cleaned || '');
                    } else {
                      set('note', `${selectedTag} ${cleaned}`.trim());
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

            {/* Urgent toggle */}
            <button
              type="button"
              onClick={() => set('is_urgent', !form.is_urgent)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-sm font-medium cursor-pointer',
                form.is_urgent
                  ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
              )}
            >
              <Zap size={18} className={form.is_urgent ? 'text-red-500 fill-red-500' : ''} />
              Urgent (needed today)
            </button>

            {/* Smart Duplicate Warning & 1-Tap Bump */}
            {similarItem && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-2 text-xs animate-in fade-in">
                <div className="min-w-0">
                  <p className="font-bold text-amber-900 dark:text-amber-200 truncate">
                    ⚠️ Already on list: {similarItem.item_name}
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    Qty: {similarItem.quantity || '1 pc'} · requested by {similarItem.requested_by?.name || 'someone'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const newQty = mergeQuantities(similarItem.quantity, form.quantity || '1');
                    if (onUpdateItem) {
                      await onUpdateItem(similarItem.id, { quantity: newQty });
                    }
                    toast.success(`Updated quantity of ${similarItem.item_name} to ${newQty}! 📈`);
                    onClose();
                  }}
                  className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                >
                  + Merge Qty
                </button>
              </div>
            )}

            <Button className="w-full" size="lg" onClick={handleSubmit} loading={loading}>
              <Plus size={18} />
              Add to List
            </Button>
          </>
        ) : (
          /* MODE 2: BULK PASTE (WHATSAPP / NOTES IMPORTER) */
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Shopping List
                </label>
                <span className="text-[11px] text-zinc-400">Bullets & numbers auto-detected</span>
              </div>
              <textarea
                rows={5}
                value={bulkText}
                onChange={(e) => handleBulkTextChange(e.target.value)}
                placeholder={`Paste here...\ne.g.\n- 2 packets Amul milk urgent\n- Brown bread\n- 6 eggs for Rahul\n- 1kg onions and tomatoes`}
                className="w-full text-xs p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            {/* Live Parsed Preview */}
            {parsedBulkItems.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-0.5">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    Detected {parsedBulkItems.length} items ({parsedBulkItems.filter((i) => i.selected).length} selected)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = parsedBulkItems.every((i) => i.selected);
                      setParsedBulkItems((prev) =>
                        prev.map((i) => ({ ...i, selected: !allSelected }))
                      );
                    }}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline text-[11px] font-semibold cursor-pointer"
                  >
                    {parsedBulkItems.every((i) => i.selected) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {parsedBulkItems.map((entry) => {
                    const cat = ITEM_CATEGORIES.find((c) => c.value === entry.item.category);
                    return (
                      <div
                        key={entry.id}
                        onClick={() => toggleBulkItem(entry.id)}
                        className={cn(
                          'flex items-center gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all',
                          entry.selected
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                            : 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-50'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={entry.selected}
                          onChange={() => {}} // handled by container click
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                        />
                        <span className="text-lg flex-shrink-0">{cat?.emoji || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-zinc-900 dark:text-white truncate">
                            {entry.item.item_name}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {entry.item.quantity && (
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                                Qty: {entry.item.quantity}
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-400 font-medium">
                              · {cat?.label || 'Other'}
                            </span>
                            {entry.item.is_urgent && (
                              <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold px-1.5 py-0.2 rounded">
                                Urgent
                              </span>
                            )}
                            {entry.item.for_user && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-medium px-1.5 py-0.2 rounded">
                                For: {entry.item.for_user}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  className="w-full"
                  size="lg"
                  onClick={handleBulkSubmit}
                  loading={loading}
                  disabled={parsedBulkItems.filter((i) => i.selected).length === 0}
                >
                  <Plus size={18} />
                  Add All ({parsedBulkItems.filter((i) => i.selected).length} items) to List 🚀
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-zinc-400 text-xs">
                <FileText size={20} className="mx-auto mb-1 text-zinc-300 dark:text-zinc-600" />
                Paste any list above to automatically preview & import items.
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
