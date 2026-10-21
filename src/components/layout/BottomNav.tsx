'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBasket, History, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  flatId: string;
}

export function BottomNav({ flatId }: BottomNavProps) {
  const pathname = usePathname();

  const links = [
    { href: `/flat/${flatId}`,          icon: ShoppingBasket, label: 'List'     },
    { href: `/flat/${flatId}/history`,   icon: History,         label: 'History'  },
    { href: `/flat/${flatId}/settings`,  icon: Settings,        label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 px-4 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors"
            >
              <Icon
                size={22}
                className={cn(
                  'transition-colors',
                  active ? 'text-emerald-500' : 'text-zinc-400 dark:text-zinc-500'
                )}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span className={cn(
                'text-[10px] font-medium',
                active ? 'text-emerald-500' : 'text-zinc-400 dark:text-zinc-500'
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
