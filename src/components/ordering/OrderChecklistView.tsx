'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Package, Copy, ExternalLink, ArrowUpRight } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { GroceryItem, ItemStatus, Platform, AddItemPayload } from '@/types/app.types';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { QUICK_COMMERCE_APPS, openQuickCommerceApp } from '@/lib/quickCommerce';
import toast from 'react-hot-toast';

interface OrderChecklistViewProps {
  open: boolean;
  onClose: () => void;
  items: GroceryItem[];
  platform?: Platform;
  onUpdateStatus: (id: string, status: ItemStatus) => void;
  onUpdateItem?: (id: string, updates: Partial<AddItemPayload>) => Promise<void>;
  onEndOrder: (total?: number) => Promise<void>;
}

export function OrderChecklistView({
  open,
  onClose,
  items,
  platform,
  onUpdateStatus,
  onUpdateItem,
  onEndOrder,
}: OrderChecklistViewProps) {
  const [totalAmount, setTotalAmount] = useState('');
  const [ending, setEnding] = useState(false);
  const [activePlatform, setActivePlatform] = useState<Platform>(platform || 'blinkit');
  const [oosItemIds, setOosItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (platform && platform !== 'other') {
      setActivePlatform(platform);
    }
  }, [platform]);

  const inCartCount = items.filter((i) => i.status === 'in_cart').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  function copyFormattedList(options?: { silent?: boolean }) {
    const activeItems = items.filter((i) => i.status === 'pending' || i.status === 'in_cart');
    if (activeItems.length === 0) {
      if (!options?.silent) toast.error('No items to copy');
      return;
    }

    const lines = activeItems.map((item, idx) => {
      const qty = item.quantity ? ` (${item.quantity})` : '';
      const urgent = item.is_urgent ? ' [⚡ URGENT]' : '';
      const forWho = item.for_user ? ` [For: ${item.for_user}]` : '';
      const requester = item.requested_by?.name ? ` - by ${item.requested_by.name}` : '';
      const checked = item.status === 'in_cart' ? '✅ ' : '⬜ ';
      return `${checked}${idx + 1}. ${item.item_name}${qty}${urgent}${forWho}${requester}`;
    });

    const text = `🛒 FlatSync Quick-Commerce List:\n${lines.join('\n')}\n\nGenerated via FlatSync`;
    navigator.clipboard.writeText(text);
    if (!options?.silent) {
      toast.success('List copied! Ready to paste into Blinkit/Zepto 📋');
    }
  }

  function handleLaunchApp(targetPlatform: Platform) {
    // 1. Copy list to clipboard so user can paste immediately in app search/chat
    copyFormattedList({ silent: true });
    // 2. Deep-link or open web fallback
    openQuickCommerceApp(targetPlatform);
    const appMeta = QUICK_COMMERCE_APPS[targetPlatform as keyof typeof QUICK_COMMERCE_APPS];
    toast.success(`Opening ${appMeta?.name || targetPlatform} with list copied! 📋`, {
      icon: appMeta?.emoji || '🚀',
    });
  }

  async function handleEnd() {
    setEnding(true);

    // Annotate rolled-over Out-of-Stock items so they persist on list
    if (onUpdateItem && oosItemIds.size > 0) {
      for (const id of Array.from(oosItemIds)) {
        const item = items.find((i) => i.id === id);
        if (item) {
          const cleanNote = (item.note || '').replace(/\[OOS[^\]]*\]/g, '').trim();
          const updatedNote = `[OOS on ${activePlatform}] ${cleanNote}`.trim();
          await onUpdateItem(id, { note: updatedNote });
        }
      }
    }

    await onEndOrder(totalAmount ? parseFloat(totalAmount) : undefined);
    if (oosItemIds.size > 0) {
      toast.success(`${oosItemIds.size} out-of-stock items rolled over to list 🔁`);
    }
    setEnding(false);
    onClose();
  }

  const currentApp = QUICK_COMMERCE_APPS[activePlatform as keyof typeof QUICK_COMMERCE_APPS] || QUICK_COMMERCE_APPS.blinkit;

  return (
    <Drawer open={open} onClose={onClose} title="Order Checklist 📋" className="max-h-[95vh]">
      <div className="p-4 space-y-4">
        {/* 1-Tap Quick Commerce App Launcher */}
        <div className="space-y-2">
          <button
            onClick={() => handleLaunchApp(activePlatform)}
            className={cn(
              'w-full flex items-center justify-between p-3.5 rounded-2xl shadow-sm transition-transform active:scale-[0.99] border cursor-pointer',
              currentApp.bgClass,
              currentApp.borderClass
            )}
          >
            <div className="flex items-center gap-3 text-left">
              <span className="text-2xl">{currentApp.emoji}</span>
              <div>
                <div className="flex items-center gap-1.5 leading-tight">
                  <span className="text-base font-extrabold tracking-tight">Open {currentApp.name}</span>
                  <ArrowUpRight size={16} strokeWidth={2.5} />
                </div>
                <p className="text-[11px] opacity-90 font-medium mt-0.5">
                  1-tap app launch · list auto-copied to clipboard
                </p>
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-black/15 font-bold uppercase tracking-wider flex-shrink-0">
              Launch
            </span>
          </button>

          {/* Quick Platform Switcher Pills */}
          <div className="flex items-center gap-1.5 pt-0.5 px-0.5">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mr-0.5">Switch:</span>
            {(['blinkit', 'zepto', 'instamart'] as const).map((p) => {
              const app = QUICK_COMMERCE_APPS[p];
              const isSelected = activePlatform === p;
              return (
                <button
                  key={p}
                  onClick={() => setActivePlatform(p)}
                  className={cn(
                    'text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1',
                    isSelected
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  )}
                >
                  <span>{app.emoji}</span>
                  <span>{app.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress bar & Copy button row */}
        <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>{inCartCount} in cart · {pendingCount} pending</span>
            <button
              onClick={() => copyFormattedList()}
              className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg"
              title="Copy formatted text list"
            >
              <Copy size={13} />
              Copy List
            </button>
          </div>
          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              animate={{ width: `${items.length ? (inCartCount / items.length) * 100 : 0}%` }}
              transition={{ type: 'spring', stiffness: 200 }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2">
          <AnimatePresence>
            {items.map((item) => {
              const catMeta = ITEM_CATEGORIES.find((c) => c.value === item.category);
              const isInCart = item.status === 'in_cart';
              const isOos = oosItemIds.has(item.id);
              const requester = item.requested_by?.name || 'Someone';

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all',
                    isOos
                      ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                      : isInCart
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                  )}
                >
                  <button
                    onClick={() => {
                      if (isOos) {
                        setOosItemIds((prev) => {
                          const next = new Set(prev);
                          next.delete(item.id);
                          return next;
                        });
                      }
                      onUpdateStatus(item.id, isInCart ? 'pending' : 'in_cart');
                    }}
                    className="flex-shrink-0"
                    title={isInCart ? 'Remove from cart' : 'Bag item into cart'}
                  >
                    <motion.div
                      animate={{ scale: isInCart ? 1 : 0.9 }}
                      className={cn(
                        'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors',
                        isInCart
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-zinc-300 dark:border-zinc-600'
                      )}
                    >
                      {isInCart && <CheckCircle2 size={16} className="text-white" fill="white" />}
                    </motion.div>
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-medium text-sm',
                      isOos
                        ? 'line-through text-rose-500/80 dark:text-rose-400/80'
                        : isInCart
                        ? 'line-through text-zinc-400'
                        : 'text-zinc-900 dark:text-white'
                    )}>
                      {item.item_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs">{catMeta?.emoji}</span>
                      {item.quantity && (
                        <span className="text-xs text-zinc-400">{item.quantity}</span>
                      )}
                      {isOos ? (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.2 rounded">
                          ❌ Out of Stock
                        </span>
                      ) : null}
                      {item.is_urgent && (
                        <Badge variant="urgent" className="text-[10px] px-1.5 py-0">Urgent</Badge>
                      )}
                      {item.for_user && (
                        <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded">
                          For: {item.for_user}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Requester */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setOosItemIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) {
                            next.delete(item.id);
                          } else {
                            next.add(item.id);
                            if (isInCart) onUpdateStatus(item.id, 'pending');
                          }
                          return next;
                        });
                      }}
                      className={cn(
                        'text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors flex items-center gap-0.5 cursor-pointer',
                        isOos
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                      )}
                      title={isOos ? 'Restore item as available' : 'Mark Out of Stock on this app'}
                    >
                      {isOos ? '❌ OOS' : 'OOS?'}
                    </button>

                    <Avatar name={requester} id={item.requested_by_id} size="sm" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Order total */}
        <div className="space-y-1">
          <Input
            label="Total Amount (optional)"
            type="number"
            placeholder="e.g. 845"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
          />
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleEnd}
          loading={ending}
          disabled={inCartCount === 0}
        >
          <Package size={18} />
          Mark Order as Placed ({inCartCount} items)
        </Button>
      </div>
    </Drawer>
  );
}
