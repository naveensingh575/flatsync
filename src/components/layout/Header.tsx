'use client';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Avatar } from '@/components/ui/Avatar';
import { GroupSwitcher } from '@/components/layout/GroupSwitcher';
import { useAppStore } from '@/store/useAppStore';
import { Flat } from '@/types/app.types';

interface HeaderProps {
  flat?: Flat | null;
}

export function Header({ flat }: HeaderProps) {
  const { profile } = useAppStore();

  return (
    <header className="sticky top-0 z-20 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center justify-between px-3.5 h-14 max-w-lg mx-auto gap-2">
        <GroupSwitcher currentFlat={flat} />

        <div className="flex items-center gap-2 flex-shrink-0">
          <ThemeToggle />

          {profile && (
            <div
              className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/60 dark:border-zinc-700/60"
              title={`Logged in as ${profile.name}`}
            >
              <Avatar name={profile.name} src={profile.avatar_url} id={profile.id} size="sm" />
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 max-w-[85px] sm:max-w-[120px] truncate">
                {profile.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
