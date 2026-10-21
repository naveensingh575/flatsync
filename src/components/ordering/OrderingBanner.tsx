'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Zap, Clock, Plus } from 'lucide-react';
import { OrderingSession, GroceryItem } from '@/types/app.types';
import { PLATFORMS } from '@/lib/constants';
import { timeAgo } from '@/lib/utils';

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
  const platform = PLATFORMS.find((p) => p.value === session?.platform);
  const isMe = session?.buyer_id === currentUserId;

  const inCartCount = items.filter((i) => i.status === 'in_cart').length;
  const totalCount = items.length;
  const percent = totalCount > 0 ? Math.round((inCartCount / totalCount) * 100) : 0;

  return (
    <AnimatePresence>
      {session && (
        <motion.div
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
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock size={11} className="text-white/80" />
                    <p className="text-white/80 text-[11px]">Started {timeAgo(session.started_at)}</p>
                  </div>
                </div>
              </div>

              {isMe ? (
                <button
                  onClick={onViewChecklist}
                  className="flex items-center gap-1 bg-white/25 hover:bg-white/35 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex-shrink-0 shadow-sm"
                >
                  <Zap size={13} />
                  Checklist
                </button>
              ) : onQuickAdd ? (
                <button
                  onClick={onQuickAdd}
                  className="flex items-center gap-1 bg-white text-zinc-900 text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm hover:bg-zinc-100 transition-colors flex-shrink-0"
                >
                  <Plus size={13} />
                  Add Item
                </button>
              ) : null}
            </div>

            {/* Real-time Cart Bagging Progress Bar */}
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
