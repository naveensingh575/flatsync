'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Flat } from '@/types/app.types';

interface HeaderProps {
  flat?: Flat | null;
  isConnected?: boolean;
  isOnline?: boolean;
}

export function Header({ flat, isConnected = true, isOnline = true }: HeaderProps) {
  const { profile } = useAppStore();
  const flatId = flat?.id || '';

  const currentIcon = flat?.icon || '🛒';
  const displayName = flat?.name || 'My Group';

  return (
    <header className="sticky top-0 z-20 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center justify-between px-3.5 h-14 max-w-lg mx-auto gap-2">
        {/* Top Left: Group Switcher Link */}
        <Link
          href={`/flat/${flatId}/groups`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          title="Switch Group"
        >
          <span className="text-xl flex-shrink-0">{currentIcon}</span>
          <div className="flex flex-col min-w-0 max-w-[130px] sm:max-w-[160px]">
            <span className="font-bold text-sm text-zinc-900 dark:text-white truncate leading-tight">
              {displayName}
            </span>
            {flat?.join_code && (
              <span className="text-[10px] text-zinc-400 font-mono">
                #{flat.join_code}
              </span>
            )}
          </div>
          <ChevronDown size={14} className="text-zinc-400 flex-shrink-0" />
        </Link>

        {/* Top Right: Profile & Settings Page Link */}
        <Link
          href={`/flat/${flatId}/profile`}
          className="relative flex items-center justify-center p-1 rounded-full cursor-pointer hover:ring-2 hover:ring-emerald-500/20 transition-all"
          title="Profile & Settings"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {profile?.name?.charAt(0).toUpperCase() || 'U'}
          </div>

          {/* Connection status micro-dot */}
          <span
            className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 ring-2 ring-white dark:ring-zinc-950 ${
              isConnected && isOnline
                ? 'bg-emerald-500'
                : !isOnline
                ? 'bg-zinc-400'
                : 'bg-amber-400 animate-pulse'
            }`}
          />
        </Link>
      </div>
    </header>
  );
}


