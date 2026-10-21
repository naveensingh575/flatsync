'use client';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Avatar } from '@/components/ui/Avatar';
import { GroupSwitcher } from '@/components/layout/GroupSwitcher';
import { useAppStore } from '@/store/useAppStore';
import { Flat } from '@/types/app.types';

interface HeaderProps {
  flat?: Flat | null;
  isConnected?: boolean;
}

export function Header({ flat, isConnected = true }: HeaderProps) {
  const { profile } = useAppStore();

  return (
    <header className="sticky top-0 z-20 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center justify-between px-3.5 h-14 max-w-lg mx-auto gap-2">
        <GroupSwitcher currentFlat={flat} />

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Live Sync Connection Status Indicator */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50"
            title={isConnected ? 'Live Real-Time Sync Connected' : 'Reconnecting to live sync...'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-zinc-600 dark:text-zinc-300">
              {isConnected ? 'Live' : 'Reconnecting'}
            </span>
          </div>

          <ThemeToggle />

          {profile && (
            <div
              className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/60 dark:border-zinc-700/60"
              title={`Logged in as ${profile.name}`}
            >
              <Avatar name={profile.name} src={profile.avatar_url} id={profile.id} size="sm" />
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 max-w-[80px] sm:max-w-[120px] truncate">
                {profile.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
