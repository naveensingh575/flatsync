'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setDark(true);
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
        className
      )}
      aria-label="Toggle theme"
    >
      {dark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-zinc-500" />}
    </button>
  );
}
