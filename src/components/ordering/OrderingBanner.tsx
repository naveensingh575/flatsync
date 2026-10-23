'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Zap, Plus } from 'lucide-react';
import { OrderingSession, GroceryItem } from '@/types/app.types';
import { PLATFORMS } from '@/lib/constants';
import { QUICK_COMMERCE_APPS, openQuickCommerceApp } from '@/lib/quickCommerce';
import toast from 'react-hot-toast';

const TEN_MINUTES_MS = 10 * 60 * 1000;

interface OrderingBannerProps {
  session: OrderingSession | null;
  currentUserId?: string;
  items?: GroceryItem[];
  onViewChecklist: () => void;
  onQuickAdd?: () => void;
}

export function OrderingBanner({
  session,
  currentUserId,
  items = [],
  onViewChecklist,
  onQuickAdd,
}: OrderingBannerProps) {
  const [isExpired, setIsExpired] = useState(false);

  // Auto-disappear after 10 minutes without showing any counter
  useEffect(() => {
    const startTime = session?.started_at || (session as any)?.created_at;
    if (!startTime) {
      setIsExpired(false);
      return;
    }

    const elapsed = Date.now() - new Date(startTime).getTime();
    const remaining = TEN_MINUTES_MS - elapsed;

    if (remaining <= 0) {
      setIsExpired(true);
      return;
    }

    setIsExpired(false);
    const timer = setTimeout(() => {
      setIsExpired(true);
    }, remaining);

    const interval = setInterval(() => {
      const curElapsed = Date.now() - new Date(startTime).getTime();
      if (curElapsed >= TEN_MINUTES_MS) {
        setIsExpired(true);
      }
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [session?.started_at, (session as any)?.created_at, session?.id]);

  if (!session || isExpired) {
    return null;
  }

  const platform = PLATFORMS.find((p) => p.value === session.platform);
  const isMe = session.buyer_id === currentUserId;
  const appMeta = session.platform && session.platform !== 'other' ? QUICK_COMMERCE_APPS[session.platform] : null;

  const inCartCount = items.filter((i) => i.status === 'in_cart').length;
  const totalCount = items.length;
  const percent = totalCount > 0 ? Math.round((inCartCount / totalCount) * 100) : 0;

  function handleLaunchFromBanner() {
    if (!session) return;
    // Copy active list to clipboard
    const active = items.filter((i) => i.status === 'pending' || i.status === 'in_cart');
    if (active.length > 0) {
      const lines = active.map((item) => {
        const qty = item.quantity?.trim() ? ` - ${item.quantity.trim()}` : '';
        return `${item.item_name.trim()}${qty}`;
      });
      navigator.clipboard.writeText(lines.join('\n'));
    }
    openQuickCommerceApp(session.platform);
    toast.success(`Opening ${appMeta?.name || session.platform} with list copied! 📋`, {
      icon: appMeta?.emoji || '🚀',
    });
  }

  return (
    <AnimatePresence>
      <motion.div
        key={session.id}
        initial={{ opacity: 0, y: -20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.97 }}
        transition={{ type: 'spring', damping: 20, stiffness: 260 }}
        className="mx-4 mt-2 rounded-2xl overflow-hidden shadow-md"
      >
        <div className={`${platform?.bgColor ?? 'bg-amber-500'} p-3.5 text-white`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-white/20 rounded-full p-2 flex-shrink-0 animate-pulse">
                <ShoppingCart size={17} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm leading-tight truncate">
                  {isMe ? 'You are' : `${session.buyer?.name ?? 'Someone'} is`} ordering on{' '}
                  <span className="capitalize underline decoration-white/50">{session.platform}</span>!
                </p>
                <p className="text-white/80 text-[11px] truncate mt-0.5">
                  {isMe ? 'Group members can add items before you checkout' : 'Need anything? Tap Add Item!'}
                </p>
              </div>
            </div>

            {isMe ? (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={handleLaunchFromBanner}
                  className="flex items-center gap-1 bg-white text-zinc-900 text-xs font-bold px-2.5 py-1.5 rounded-xl shadow-sm hover:bg-zinc-100 transition-transform active:scale-95 cursor-pointer"
                  title={`Open ${appMeta?.name || session.platform} app`}
                >
                  <span>{appMeta?.emoji || '🚀'}</span>
                  <span>Open App</span>
                </button>
                <button
                  onClick={onViewChecklist}
                  className="flex items-center gap-1 bg-white/25 hover:bg-white/35 text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  <Zap size={13} />
                  Checklist
                </button>
              </div>
            ) : onQuickAdd ? (
              <button
                onClick={onQuickAdd}
                className="flex items-center gap-1 bg-white text-zinc-900 text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm hover:bg-zinc-100 transition-colors flex-shrink-0 cursor-pointer"
              >
                <Plus size={13} />
                Add Item
              </button>
            ) : null}
          </div>

          {/* Real-time Cart Bagging Progress Bar (clean visual bar, no timer counter) */}
          {totalCount > 0 && (
            <div className="mt-2.5 pt-2 border-t border-white/20 space-y-1">
              <div className="flex justify-between items-center text-[11px] font-medium text-white/90">
                <span>🛒 Bagged into cart</span>
                <span>
                  {inCartCount} / {totalCount} items ({percent}%)
                </span>
              </div>
              <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  animate={{ width: `${percent}%` }}
                  transition={{ type: 'spring', stiffness: 180, damping: 25 }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

