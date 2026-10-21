'use client';

import { useState, useEffect } from 'react';
import { Bell, BellRing, WifiOff } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Avatar } from '@/components/ui/Avatar';
import { GroupSwitcher } from '@/components/layout/GroupSwitcher';
import { useAppStore } from '@/store/useAppStore';
import { Flat } from '@/types/app.types';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from '@/lib/notifications';
import toast from 'react-hot-toast';

interface HeaderProps {
  flat?: Flat | null;
  isConnected?: boolean;
  isOnline?: boolean;
}

export function Header({ flat, isConnected = true, isOnline = true }: HeaderProps) {
  const { profile } = useAppStore();
  const [notifState, setNotifState] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupported(isNotificationSupported());
      setNotifState(getNotificationPermission());
    }
  }, []);

  async function handleToggleNotifications() {
    if (!supported) {
      toast.error('Web notifications are not supported by this browser');
      return;
    }

    if (notifState === 'granted') {
      toast('Lockscreen notifications are active! 🔔', { icon: '🔔' });
      return;
    }

    const granted = await requestNotificationPermission();
    if (granted) {
      setNotifState('granted');
      toast.success('Lockscreen alerts enabled! You will be notified when flatmates order 🔔');
    } else {
      setNotifState('denied');
      toast.error('Notifications permission denied');
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center justify-between px-3.5 h-14 max-w-lg mx-auto gap-2">
        <GroupSwitcher currentFlat={flat} />

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Network Connection / Offline Indicator */}
          {!isOnline ? (
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse"
              title="You are currently offline. Changes are saved and will sync when connected."
            >
              <WifiOff size={11} />
              <span>Offline</span>
            </div>
          ) : (
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
          )}

          {/* Web Push Notification Bell */}
          {supported && (
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                notifState === 'granted'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/60 dark:border-zinc-700/60 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title={
                notifState === 'granted'
                  ? 'Lockscreen ordering notifications enabled'
                  : 'Enable lockscreen ordering alerts'
              }
            >
              {notifState === 'granted' ? <BellRing size={15} /> : <Bell size={15} />}
            </button>
          )}

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
