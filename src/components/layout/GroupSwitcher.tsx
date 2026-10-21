'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, Check, Users } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Flat } from '@/types/app.types';
import { cn } from '@/lib/utils';

interface GroupSwitcherProps {
  currentFlat?: Flat | null;
}

export function GroupSwitcher({ currentFlat }: GroupSwitcherProps) {
  const router = useRouter();
  const { userGroups } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentIcon = currentFlat?.icon || '🛒';
  const displayName = currentFlat?.name || 'My Group';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
      >
        <span className="text-xl flex-shrink-0">{currentIcon}</span>
        <div className="flex flex-col min-w-0 max-w-[130px]">
          <span className="font-bold text-sm text-zinc-900 dark:text-white truncate leading-tight">
            {displayName}
          </span>
          {currentFlat?.join_code && (
            <span className="text-[10px] text-zinc-400 font-mono">
              #{currentFlat.join_code}
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={cn(
            'text-zinc-400 transition-transform duration-200 flex-shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1">
                Your Groups
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
              {userGroups.map((group) => {
                const isSelected = group.id === currentFlat?.id;
                return (
                  <button
                    key={group.id}
                    onClick={() => {
                      setIsOpen(false);
                      router.push(`/flat/${group.id}`);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-sm transition-colors',
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-lg">{group.icon || '👥'}</span>
                      <div className="truncate">
                        <p className="truncate leading-snug">{group.name}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">#{group.join_code}</p>
                      </div>
                    </div>
                    {isSelected && <Check size={16} className="text-emerald-600 flex-shrink-0" />}
                  </button>
                );
              })}

              {userGroups.length === 0 && (
                <div className="px-3 py-3 text-center text-xs text-zinc-400">
                  No other groups found
                </div>
              )}
            </div>

            <div className="p-1.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/onboarding');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
              >
                <Plus size={15} />
                Create or Join New Group
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
