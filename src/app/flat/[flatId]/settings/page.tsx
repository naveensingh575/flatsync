'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFlat } from '@/hooks/useFlat';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAppStore } from '@/store/useAppStore';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { GroupCard } from '@/components/groups/GroupCard';
import { Plus } from 'lucide-react';
import { Flat } from '@/types/app.types';

export default function SettingsPage() {
  const router = useRouter();
  const routeParams = useParams();
  const routeFlatId = (routeParams?.flatId as string) || '';
  const { userGroups, currentGroupId, setCurrentGroupId, profile } = useAppStore();
  const { isOnline } = useNetworkStatus();

  const flatId = (routeFlatId && routeFlatId !== 'current' && routeFlatId !== 'list')
    ? routeFlatId
    : (currentGroupId || profile?.group_id || profile?.flat_id || (userGroups.length > 0 ? userGroups[0]?.id : ''));

  // Multi-tier fallback for userGroups when offline or loading
  const displayGroups = useMemo<Flat[]>(() => {
    if (userGroups && userGroups.length > 0) return userGroups;
    try {
      const stored = localStorage.getItem('grocerysync-app-storage') || localStorage.getItem('flatsync-app-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.userGroups?.length > 0) return parsed.state.userGroups;
      }
    } catch (_) {}
    return [];
  }, [userGroups]);

  // Clean URL: Scrub `/flat/...` from browser address bar and display `/settings`
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.includes('/flat/')) {
      window.history.replaceState(null, '', '/settings');
    }
  }, []);

  const { flat, groupMembersMap, isAdmin, makeAdmin, leaveGroup, deleteGroup } = useFlat(flatId);

  async function handleLeaveGroup(groupId: string) {
    const success = await leaveGroup(groupId);
    if (success && groupId === flatId) {
      const remaining = displayGroups.filter((g) => g.id !== groupId);
      if (remaining.length > 0) router.push('/list');
      else router.push('/onboarding');
    }
    return success;
  }

  async function handleDeleteGroup(groupId: string) {
    const success = await deleteGroup(groupId);
    if (success && groupId === flatId) {
      const remaining = displayGroups.filter((g) => g.id !== groupId);
      if (remaining.length > 0) router.push('/list');
      else router.push('/onboarding');
    }
    return success;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-28">
      <Header flat={flat || displayGroups.find((g) => g.id === flatId)} isConnected={isOnline} isOnline={isOnline} />

      <main className="max-w-lg mx-auto p-4 space-y-4 mt-1">
        {/* Offline Notification Banner */}
        {!isOnline && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs shadow-xs animate-in fade-in">
            <span className="text-xl flex-shrink-0">📴</span>
            <div>
              <p className="font-bold">You are offline</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Showing your saved groups. Changes will sync once your internet connection is restored.
              </p>
            </div>
          </div>
        )}

        {/* All user groups with members & actions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm">🗂️</span>
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                Your Groups ({displayGroups.length})
              </h3>
            </div>
            <button
              onClick={() => router.push('/onboarding?new=true')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Plus size={14} /> Add Group
            </button>
          </div>

          <div className="space-y-3">
            {displayGroups.map((g) => {
              const members = groupMembersMap[g.id] || [];
              const userIsAdmin = Boolean(
                isAdmin(g.id) ||
                g.created_by === profile?.id ||
                members.length <= 1 ||
                members.some((m) => m.id === profile?.id && m.role === 'admin')
              );

              return (
                <GroupCard
                  key={g.id}
                  group={g}
                  members={members}
                  isActive={g.id === flatId}
                  isAdmin={userIsAdmin}
                  onSelectGroup={(id) => {
                    setCurrentGroupId(id);
                    router.push('/list');
                  }}
                  onLeaveGroup={handleLeaveGroup}
                  onDeleteGroup={handleDeleteGroup}
                  onMakeAdmin={(userId) => makeAdmin(g.id, userId)}
                />
              );
            })}

            {displayGroups.length === 0 && (
              <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400">
                No groups found.
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav flatId={flatId} />
    </div>
  );
}
