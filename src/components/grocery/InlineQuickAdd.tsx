'use client';

import { useState } from 'react';
import { Mic, MicOff, Plus, SlidersHorizontal, Sparkles } from 'lucide-react';
import { parseGroceryInput } from '@/lib/itemParser';
import { AddItemPayload } from '@/types/app.types';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface InlineQuickAddProps {
  onAdd: (payload: AddItemPayload) => Promise<void>;
  onOpenDrawer: () => void;
}

export function InlineQuickAdd({ onAdd, onOpenDrawer }: InlineQuickAddProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    isListening,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
  } = useVoiceInput((spokenText) => {
    setText(spokenText);
  });

  async function handleQuickSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const query = text.trim();
    if (!query) return;

    const parsed = parseGroceryInput(query);
    if (!parsed.item_name) return;

    setSubmitting(true);
    setText('');
    try {
      await onAdd({
        item_name: parsed.item_name,
        category: parsed.category || 'other',
        is_urgent: parsed.is_urgent || false,
        quantity: parsed.quantity || null,
        note: parsed.note || null,
        for_user: parsed.for_user || null,
      });
      toast.success(`${parsed.item_name} added! ⚡`, { duration: 2000 });
    } catch {
      toast.error('Failed to add item');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 pt-1">
      <form
        onSubmit={handleQuickSubmit}
        className={cn(
          'flex items-center gap-1.5 p-1.5 pl-3 rounded-2xl border transition-all duration-200',
          'bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md',
          'shadow-sm hover:shadow-md focus-within:shadow-md',
          isListening
            ? 'border-red-400 ring-2 ring-red-400/20'
            : 'border-zinc-200/80 dark:border-zinc-800 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10'
        )}
      >
        {/* Mic Voice Dictation */}
        {isVoiceSupported && (
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={cn(
              'p-2 rounded-xl transition-all flex items-center justify-center flex-shrink-0 cursor-pointer select-none touch-manipulation active:scale-90',
              isListening
                ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                : 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-zinc-800 active:bg-emerald-100 dark:active:bg-zinc-700'
            )}
            title={isListening ? 'Stop listening' : 'Voice add (e.g. "2 packets milk urgent")'}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}

        {/* Input */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            isListening
              ? 'Listening... speak naturally'
              : 'Quick add (e.g. 2 packets milk urgent)...'
          }
          className="flex-1 text-xs bg-transparent text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none min-w-0"
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {text.trim() ? (
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] active:translate-y-0.5 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/25 border-t border-emerald-400/30 transition-all flex items-center gap-1 cursor-pointer select-none touch-manipulation"
            >
              <Plus size={14} strokeWidth={3} />
              <span>Add</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenDrawer}
              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 active:bg-zinc-200 dark:active:bg-zinc-700 rounded-xl transition-colors cursor-pointer select-none touch-manipulation active:scale-90"
              title="More options / Bulk Paste / Category"
            >
              <SlidersHorizontal size={15} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
