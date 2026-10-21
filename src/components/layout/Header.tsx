'use client';

import { GroupSwitcher } from '@/components/layout/GroupSwitcher';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { Flat } from '@/types/app.types';

interface HeaderProps {
  flat?: Flat | null;
  isConnected?: boolean;
  isOnline?: boolean;
}

export function Header({ flat, isConnected = true, isOnline = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center justify-between px-3.5 h-14 max-w-lg mx-auto gap-2">
        <GroupSwitcher currentFlat={flat} />
        <ProfileMenu isConnected={isConnected} isOnline={isOnline} />
      </div>
    </header>
  );
}

