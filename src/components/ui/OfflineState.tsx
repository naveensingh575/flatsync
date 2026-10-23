'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineStateProps {
  title?: string;
  message?: string;
  onRetry?: () => Promise<void> | void;
  className?: string;
}

export function OfflineState({
  title = 'You are Currently Offline',
  message = "GrocerySync couldn't load your items because your internet connection is unavailable or timed out.",
  onRetry,
  className = '',
}: OfflineStateProps) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } finally {
      setTimeout(() => setRetrying(false), 800);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex flex-col items-center justify-center text-center p-6 sm:p-8 max-w-sm mx-auto my-6 ${className}`}
    >
      {/* Broken/Upset Cart Illustration */}
      <div className="relative mb-4 select-none">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center shadow-md">
          {/* Cart with cracked/broken expression */}
          <span className="text-4xl filter drop-shadow-xs">🛒</span>
        </div>
        {/* Disconnect / Lightning badge overlay */}
        <span className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-zinc-900 text-xs font-bold">
          ⚡
        </span>
        <span className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-zinc-900">
          <WifiOff size={12} />
        </span>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
        {message}
      </p>

      {/* Retry Action */}
      <div className="mt-5 flex flex-col items-center gap-2 w-full">
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="w-full max-w-xs flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
          <span>{retrying ? 'Reconnecting...' : 'Retry Connection 🔄'}</span>
        </button>

        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
          Your saved items will sync automatically once reconnected.
        </p>
      </div>
    </motion.div>
  );
}
