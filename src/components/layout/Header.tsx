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
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
        <GroupSwitcher currentFlat={flat} />

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {profile && (
            <Avatar name={profile.name} src={profile.avatar_url} id={profile.id} size="sm" />
          )}
        </div>
      </div>
    </header>
  );
}
