'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, Users, X } from 'lucide-react';
import { useFlat } from '@/hooks/useFlat';
import { GroupCard } from '@/components/groups/GroupCard';
import { Flat } from '@/types/app.types';
import { cn } from '@/lib/utils';

interface GroupSwitcherProps {
  currentFlat?: Flat | null;
}

export function GroupSwitcher({ currentFlat }: GroupSwitcherProps) {
  const router = useRouter();
  const { userGroups, groupMembersMap, leaveGroup, deleteGroup } = useFlat(currentFlat?.id);
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

  async function handleLeaveGroup(groupId: string) {
    const success = await leaveGroup(groupId);
    if (success && groupId === currentFlat?.id) {
      const remaining = userGroups.filter((g) => g.id !== groupId);
      if (remaining.length > 0) {
        router.push(`/flat/${remaining[0].id}`);
      } else {
        router.push('/onboarding');
      }
      setIsOpen(false);
    }
    return success;
  }

  async function handleDeleteGroup(groupId: string) {
    const success = await deleteGroup(groupId);
    if (success && groupId === currentFlat?.id) {
      const remaining = userGroups.filter((g) => g.id !== groupId);
      if (remaining.length > 0) {
        router.push(`/flat/${remaining[0].id}`);
      } else {
        router.push('/onboarding');
      }
      setIsOpen(false);
    }
    return success;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Group Switcher Header Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      >
        <span className="text-xl flex-shrink-0">{currentIcon}</span>
        <div className="flex flex-col min-w-0 max-w-[130px] sm:max-w-[160px]">
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

      {/* Rich Groups Dropdown / Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-emerald-500" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Your Groups ({userGroups.length})
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X size={15} />
              </button>
            </div>

            {/* Groups List */}
            <div className="p-3 space-y-2.5 max-h-[65vh] overflow-y-auto">
              {userGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  members={groupMembersMap[group.id] || []}
                  isActive={group.id === currentFlat?.id}
                  onSelectGroup={(id) => {
                    setIsOpen(false);
                    router.push(`/flat/${id}`);
                  }}
                  onLeaveGroup={handleLeaveGroup}
                  onDeleteGroup={handleDeleteGroup}
                />
              ))}

              {userGroups.length === 0 && (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No other groups found
                </div>
              )}
            </div>

            {/* Create or Join Group Footer */}
            <div className="p-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/onboarding');
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-2xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white transition-all shadow-xs cursor-pointer"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Create or Join New Group</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
