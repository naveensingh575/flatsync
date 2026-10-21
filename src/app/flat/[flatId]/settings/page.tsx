'use client';

import { useParams, useRouter } from 'next/navigation';
import { useFlat } from '@/hooks/useFlat';
import { useAppStore } from '@/store/useAppStore';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { GroupCard } from '@/components/groups/GroupCard';
import { Plus } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const routeParams = useParams();
  const flatId = (routeParams?.flatId as string) || '';
  const { flat, groupMembersMap, leaveGroup, deleteGroup } = useFlat(flatId);
  const { userGroups } = useAppStore();

  async function handleLeaveGroup(groupId: string) {
    const success = await leaveGroup(groupId);
    if (success && groupId === flatId) {
      const remaining = userGroups.filter((g) => g.id !== groupId);
      if (remaining.length > 0) router.push(`/flat/${remaining[0].id}`);
      else router.push('/onboarding');
    }
    return success;
  }

  async function handleDeleteGroup(groupId: string) {
    const success = await deleteGroup(groupId);
    if (success && groupId === flatId) {
      const remaining = userGroups.filter((g) => g.id !== groupId);
      if (remaining.length > 0) router.push(`/flat/${remaining[0].id}`);
      else router.push('/onboarding');
    }
    return success;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-28">
      <Header flat={flat} />

      <main className="max-w-lg mx-auto p-4 space-y-5 mt-2">
        {/* All user groups with members & actions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm">🗂️</span>
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                Your Groups ({userGroups.length})
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
            {userGroups.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                members={groupMembersMap[g.id] || []}
                isActive={g.id === flatId}
                onSelectGroup={(id) => router.push(`/flat/${id}`)}
                onLeaveGroup={handleLeaveGroup}
                onDeleteGroup={handleDeleteGroup}
              />
            ))}
          </div>
        </div>
      </main>

      <BottomNav flatId={flatId} />
    </div>
  );
}
