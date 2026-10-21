'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Zap, Mic, MicOff, Sparkles, Check, ChevronDown } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AddItemPayload, ItemCategory } from '@/types/app.types';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { parseGroceryInput } from '@/lib/itemParser';
import { COMMON_INDIAN_GROCERIES, FREQUENT_STAPLES, GroceryCatalogItem } from '@/lib/groceryCatalog';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import toast from 'react-hot-toast';

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
  const [suggestions, setSuggestions] = useState<GroceryCatalogItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [parsedBanner, setParsedBanner] = useState<string | null>(null);

  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Sync prefill when drawer opens
  useEffect(() => {
    if (open) {
      setForm({ ...defaultState, ...prefill });
      setError('');
      setParsedBanner(null);
      setSuggestions([]);
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

  // Apply parsed attributes from natural language
  function handleApplySmartParse(text: string) {
    const parsed = parseGroceryInput(text);
    if (parsed.item_name) {
      setForm((prev) => ({
        ...prev,
        item_name: parsed.item_name || prev.item_name,
        category: (parsed.category && parsed.category !== 'other') ? parsed.category : prev.category,
        quantity: parsed.quantity || prev.quantity,
        is_urgent: parsed.is_urgent !== undefined ? parsed.is_urgent : prev.is_urgent,
        for_user: parsed.for_user || prev.for_user,
      }));

      const tags: string[] = [];
      if (parsed.quantity) tags.push(`Qty: ${parsed.quantity}`);
      if (parsed.category && parsed.category !== 'other') tags.push(`Cat: ${parsed.category}`);
      if (parsed.is_urgent) tags.push('⚡ Urgent');
      if (parsed.for_user) tags.push(`For: ${parsed.for_user}`);

      if (tags.length > 0) {
        setParsedBanner(tags.join(' · '));
      }
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

  async function handleSubmit() {
    if (!form.item_name.trim()) {
      setError('Item name is required');
      return;
    }
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
    <Drawer open={open} onClose={onClose} title="Add Item to List 🛒" className="max-h-[92vh]">
      <div className="p-5 space-y-4">
        {/* Frequent Staples 1-Tap Quick-Shelf */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              ⚡ 1-Tap Quick Staples
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {FREQUENT_STAPLES.map((staple) => (
              <button
                key={staple.name}
                type="button"
                onClick={() => selectSuggestion(staple)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 whitespace-nowrap transition-transform active:scale-95"
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
              onClick={stopListening}
              className="text-xs px-2 py-1 rounded bg-red-600 text-white font-bold"
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
                autoFocus
              />
            </div>

            {/* Mic Dictation Button */}
            {isVoiceSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={cn(
                  'h-10 px-3 rounded-xl border flex items-center justify-center gap-1 text-xs font-bold transition-all shadow-sm flex-shrink-0 mb-[1px]',
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
                  className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center justify-between text-xs transition-colors"
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

        {/* Category grid */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Category</p>
          <div className="grid grid-cols-4 gap-2">
            {ITEM_CATEGORIES.map((cat) => (
              <button
                type="button"
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

        {/* Quantity & For Person */}
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

        {/* Note */}
        <Input
          label="Note (optional)"
          placeholder="e.g. Brand preferences or replacement instructions"
          value={form.note ?? ''}
          onChange={(e) => set('note', e.target.value)}
        />

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
