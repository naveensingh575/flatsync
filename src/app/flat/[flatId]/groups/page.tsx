'use client';

import { useParams, useRouter } from 'next/navigation';
import { useFlat } from '@/hooks/useFlat';
import { useAppStore } from '@/store/useAppStore';
import { BottomNav } from '@/components/layout/BottomNav';
import { ArrowLeft, Check, Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GroupsSwitchPage() {
  const router = useRouter();
  const routeParams = useParams();
  const flatId = (routeParams?.flatId as string) || '';
  const { flat } = useFlat(flatId);
  const { userGroups, setCurrentGroupId } = useAppStore();

  function handleSelectGroup(groupId: string) {
    setCurrentGroupId(groupId);
    router.push(`/flat/${groupId}`);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-28">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <button
            onClick={() => router.push(`/flat/${flatId}`)}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to List</span>
          </button>
          <h2 className="font-bold text-sm text-zinc-900 dark:text-white">Switch Group</h2>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Simple Group Switch List */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1 mb-2">
            Your Groups ({userGroups.length})
          </p>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden shadow-sm">
            {userGroups.map((g) => {
              const isActive = g.id === flatId;
              return (
                <button
                  key={g.id}
                  onClick={() => handleSelectGroup(g.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-4 text-left transition-colors cursor-pointer group',
                    isActive
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{g.icon || '🏠'}</span>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'font-bold text-sm leading-tight truncate',
                          isActive
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                        )}
                      >
                        {g.name}
                      </p>
                      <p className="text-[11px] text-zinc-400 capitalize mt-0.5">
                        {g.group_type || 'Group'} · #{g.join_code}
                      </p>
                    </div>
                  </div>

                  {isActive ? (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex-shrink-0">
                      <Check size={13} strokeWidth={3} />
                      <span>Active</span>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 flex-shrink-0">
                      Tap to switch →
                    </span>
                  )}
                </button>
              );
            })}

            {userGroups.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-400">
                No groups found.
              </div>
            )}
          </div>
        </div>

        {/* Action: Add/Join Another Group */}
        <button
          onClick={() => router.push('/onboarding?new=true')}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-transform cursor-pointer"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Create or Join Another Group</span>
        </button>

        {/* Link to Full Group Management in Settings */}
        <div className="pt-2 text-center">
          <button
            onClick={() => router.push(`/flat/${flatId}/settings`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Settings size={13} />
            <span>Manage members, leave, or delete groups in Settings →</span>
          </button>
        </div>
      </main>

      <BottomNav flatId={flatId} />
    </div>
  );
}
