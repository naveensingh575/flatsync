'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBasket, History, Plus, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  flatId: string;
  onAddItem?: () => void;
  onStartOrder?: () => void;
  onViewChecklist?: () => void;
  isOrderingActive?: boolean;
  inCartCount?: number;
  totalCount?: number;
}

export function BottomNav({
  flatId,
  onAddItem,
  onStartOrder,
  onViewChecklist,
  isOrderingActive,
  inCartCount = 0,
  totalCount = 0,
}: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isListActive = pathname === `/flat/${flatId}`;
  const isHistoryActive = pathname.includes('/history');

  return (
    <nav className="fixed bottom-3 left-0 right-0 z-30 px-4 pointer-events-none pb-safe">
      <div className="max-w-xs sm:max-w-sm mx-auto pointer-events-auto">
        <div className="grid grid-cols-4 items-center p-1.5 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl shadow-zinc-950/10 dark:shadow-black/40">
          {/* 1. Grocery List (Left Nav) */}
          <Link
            href={`/flat/${flatId}`}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-1 rounded-full transition-all cursor-pointer group',
              isListActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-medium'
            )}
            title="Grocery List"
          >
            <div
              className={cn(
                'p-1.5 rounded-full transition-all',
                isListActive && 'bg-emerald-500/15 dark:bg-emerald-500/20'
              )}
            >
              <ShoppingBasket size={19} strokeWidth={isListActive ? 2.5 : 2} />
            </div>
            <span className="text-[10px] tracking-tight leading-none mt-0.5">List</span>
          </Link>

          {/* 2. Add Item (Center Action - Emerald) */}
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(12);
              }
              if (onAddItem) {
                onAddItem();
              } else {
                router.push(`/flat/${flatId}?add=true`);
              }
            }}
            className="flex flex-col items-center justify-center py-1 px-1 rounded-full transition-all cursor-pointer group touch-manipulation select-none active:scale-95"
            title="Add Item to List"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 border-t border-emerald-400/30 transition-transform group-hover:scale-105 active:scale-90">
              <Plus size={19} strokeWidth={2.8} />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-tight leading-none mt-0.5">
              Add
            </span>
          </button>

          {/* 3. Cart / I'm Ordering (Center Action - Amber) */}
          {isOrderingActive ? (
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  navigator.vibrate(12);
                }
                if (onViewChecklist) onViewChecklist();
              }}
              className="flex flex-col items-center justify-center py-1 px-1 rounded-full transition-all cursor-pointer group touch-manipulation select-none active:scale-95"
              title={`Active Order Checklist (${inCartCount}/${totalCount})`}
            >
              <div className="relative w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-500/30 border-t border-amber-300/40 animate-pulse transition-transform group-hover:scale-105 active:scale-90">
                <ShoppingCart size={18} strokeWidth={2.4} />
                {totalCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-[16px] rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-zinc-900 leading-none">
                    {inCartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-tight leading-none mt-0.5">
                {totalCount > 0 ? `${inCartCount}/${totalCount}` : 'Cart'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  navigator.vibrate(12);
                }
                if (onStartOrder) {
                  onStartOrder();
                } else {
                  router.push(`/flat/${flatId}?order=true`);
                }
              }}
              className="flex flex-col items-center justify-center py-1 px-1 rounded-full transition-all cursor-pointer group touch-manipulation select-none active:scale-95"
              title="I'm Ordering Now"
            >
              <div className="w-9 h-9 rounded-full bg-amber-500/15 dark:bg-amber-500/20 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-white dark:hover:text-white flex items-center justify-center transition-all group-hover:scale-105 active:scale-90 border border-amber-500/20">
                <ShoppingCart size={18} strokeWidth={2.2} />
              </div>
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 tracking-tight leading-none mt-0.5">
                Order
              </span>
            </button>
          )}

          {/* 4. Order History (Right Nav) */}
          <Link
            href={`/flat/${flatId}/history`}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-1 rounded-full transition-all cursor-pointer group',
              isHistoryActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-medium'
            )}
            title="Order History"
          >
            <div
              className={cn(
                'p-1.5 rounded-full transition-all',
                isHistoryActive && 'bg-emerald-500/15 dark:bg-emerald-500/20'
              )}
            >
              <History size={19} strokeWidth={isHistoryActive ? 2.5 : 2} />
            </div>
            <span className="text-[10px] tracking-tight leading-none mt-0.5">History</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

