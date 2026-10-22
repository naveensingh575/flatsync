'use client';

import { useState } from 'react';
import { ShoppingBag, Zap } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Platform } from '@/types/app.types';
import { PLATFORMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface StartOrderDrawerProps {
  open: boolean;
  onClose: () => void;
  onStartOrder: (platform: Platform) => Promise<void>;
}

export function StartOrderDrawer({ open, onClose, onStartOrder }: StartOrderDrawerProps) {
  const [selected, setSelected] = useState<Platform>('blinkit');
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    await onStartOrder(selected);
    setLoading(false);
    onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="I'm Ordering Now 🛒">
      <div className="p-5 space-y-5">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Select the app and group members will get notified!
        </p>

        <div className="grid grid-cols-2 gap-3">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              onClick={() => setSelected(p.value)}
              className={cn(
                'relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150',
                selected === p.value
                  ? `border-current ${p.bgColor} ${p.color}`
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300'
              )}
            >
              <ShoppingBag size={28} />
              <span className="font-semibold text-sm">{p.label}</span>
              {selected === p.value && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white/40 flex items-center justify-center text-xs">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleStart}
          loading={loading}
        >
          <Zap size={18} />
          Start Ordering on {PLATFORMS.find((p) => p.value === selected)?.label}
        </Button>
      </div>
    </Drawer>
  );
}
