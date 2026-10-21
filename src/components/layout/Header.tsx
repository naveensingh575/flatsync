'use client';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Avatar } from '@/components/ui/Avatar';
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
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛒</span>
          <div>
            <p className="font-bold text-sm text-zinc-900 dark:text-white leading-none">
              {flat?.name ?? 'FlatSync'}
            </p>
            {flat && (
              <p className="text-xs text-zinc-400 mt-0.5">Code: {flat.join_code}</p>
            )}
          </div>
        </div>

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
