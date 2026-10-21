'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Zap, Clock } from 'lucide-react';
import { OrderingSession } from '@/types/app.types';
import { PLATFORMS } from '@/lib/constants';
import { timeAgo } from '@/lib/utils';

interface OrderingBannerProps {
  session: OrderingSession | null;
  currentUserId?: string;
  onViewChecklist: () => void;
}

export function OrderingBanner({ session, currentUserId, onViewChecklist }: OrderingBannerProps) {
  const platform = PLATFORMS.find((p) => p.value === session?.platform);
  const isMe = session?.buyer_id === currentUserId;

  return (
    <AnimatePresence>
      {session && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
          className="mx-4 mt-3 rounded-2xl overflow-hidden"
        >
          <div className={`${platform?.bgColor ?? 'bg-emerald-400'} p-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-white/20 rounded-full p-1.5">
                  <ShoppingCart size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-none">
                    {isMe ? 'You are' : `${session.buyer?.name ?? 'Someone'} is`} ordering on{' '}
                    <span className="capitalize">{session.platform}</span>!
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock size={11} className="text-white/70" />
                    <p className="text-white/70 text-xs">{timeAgo(session.started_at)}</p>
                  </div>
                </div>
              </div>

              {isMe && (
                <button
                  onClick={onViewChecklist}
                  className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                >
                  <Zap size={12} />
                  Open Checklist
                </button>
              )}
            </div>

            {!isMe && (
              <p className="text-white/80 text-xs mt-2">
                ⚡ Add your items now before checkout!
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
