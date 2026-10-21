'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBasket, History, Plus, ShoppingCart, Zap } from 'lucide-react';
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

  return (
    <nav className="fixed bottom-4 left-0 right-0 z-30 px-4 pointer-events-none pb-safe">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="flex items-center justify-between p-2 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl shadow-zinc-950/10 dark:shadow-black/40 gap-2">
          {/* Left Navigation: Grocery List & History */}
          <div className="flex items-center gap-1 flex-shrink-0">
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

            <Link
              href={`/flat/${flatId}/history`}
              className={cn(
                'p-2.5 rounded-full transition-all flex items-center justify-center cursor-pointer',
                isHistoryActive
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              )}
              title="Order History"
            >
              <History size={19} strokeWidth={isHistoryActive ? 2.5 : 2} />
            </Link>
          </div>

          {/* Center: Prominent Add Item Button */}
          {onAddItem && (
            <button
              type="button"
              onClick={onAddItem}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/25 transition-transform active:scale-95 cursor-pointer flex-shrink-0"
            >
              <Plus size={17} strokeWidth={2.8} />
              <span>Add Item</span>
            </button>
          )}

          {/* Right: I'm Ordering Button (in place of Settings) */}
          <div className="flex items-center flex-shrink-0">
            {isOrderingActive ? (
              <button
                type="button"
                onClick={onViewChecklist}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/25 transition-transform active:scale-95 animate-pulse cursor-pointer flex-shrink-0"
                title="Active Order Checklist"
              >
                <ShoppingCart size={15} />
                <span className="hidden sm:inline">Bagged {inCartCount}/{totalCount}</span>
                <span className="sm:hidden">{inCartCount}/{totalCount}</span>
              </button>
            ) : (
              onStartOrder && (
                <button
                  type="button"
                  onClick={onStartOrder}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer flex-shrink-0"
                  title="I'm Ordering Now"
                >
                  <Zap size={14} className="fill-white" />
                  <span className="hidden sm:inline">I&apos;m Ordering</span>
                  <span className="sm:hidden">Ordering</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
