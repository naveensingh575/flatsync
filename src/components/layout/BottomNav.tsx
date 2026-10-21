'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBasket, History, Settings, Plus, ShoppingCart } from 'lucide-react';
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
  const isListActive = pathname === `/flat/${flatId}`;
  const isHistoryActive = pathname.includes('/history');
  const isSettingsActive = pathname.includes('/settings');

  return (
    <nav className="fixed bottom-4 left-0 right-0 z-30 px-4 pointer-events-none pb-safe">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="flex items-center justify-between p-2 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl shadow-zinc-950/10 dark:shadow-black/40">
          {/* Tab 1: Grocery List */}
          <Link
            href={`/flat/${flatId}`}
            className={cn(
              'p-2.5 rounded-full transition-all flex items-center justify-center cursor-pointer',
              isListActive
                ? 'bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            )}
            title="Grocery List"
          >
            <ShoppingBasket size={20} strokeWidth={isListActive ? 2.5 : 2} />
          </Link>

          {/* Center Dynamic Action Pill */}
          {isOrderingActive ? (
            <button
              type="button"
              onClick={onViewChecklist}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-transform active:scale-95 animate-pulse cursor-pointer"
            >
              <ShoppingCart size={15} />
              <span>
                Bagged {inCartCount}/{totalCount}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              {onAddItem && (
                <button
                  type="button"
                  onClick={onAddItem}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
                >
                  <Plus size={16} strokeWidth={2.8} />
                  <span>Add Item</span>
                </button>
              )}

              {onStartOrder && (
                <button
                  type="button"
                  onClick={onStartOrder}
                  className="p-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white transition-transform active:scale-95 shadow-xs cursor-pointer flex items-center justify-center"
                  title="I'm Ordering Now"
                >
                  <ShoppingCart size={16} />
                </button>
              )}
            </div>
          )}

          {/* Right Tabs: History & Settings */}
          <div className="flex items-center gap-1">
            <Link
              href={`/flat/${flatId}/history`}
              className={cn(
                'p-2.5 rounded-full transition-all flex items-center justify-center cursor-pointer',
                isHistoryActive
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              )}
              title="History"
            >
              <History size={19} strokeWidth={isHistoryActive ? 2.5 : 2} />
            </Link>

            <Link
              href={`/flat/${flatId}/settings`}
              className={cn(
                'p-2.5 rounded-full transition-all flex items-center justify-center cursor-pointer',
                isSettingsActive
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              )}
              title="Settings"
            >
              <Settings size={19} strokeWidth={isSettingsActive ? 2.5 : 2} />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
