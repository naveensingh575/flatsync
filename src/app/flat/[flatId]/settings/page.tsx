'use client';

import { useParams, useRouter } from 'next/navigation';
import { useFlat } from '@/hooks/useFlat';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GroupCard } from '@/components/groups/GroupCard';
import { Copy, LogOut, Users, Plus, Share2, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const router = useRouter();
  const routeParams = useParams();
  const flatId = (routeParams?.flatId as string) || '';
  const { flat, members, groupMembersMap, leaveGroup, deleteGroup } = useFlat(flatId);
  const { userGroups, profile } = useAppStore();
  const { signOut } = useAuth();

  function copyCode() {
    if (!flat) return;
    navigator.clipboard.writeText(flat.join_code);
    toast.success('Join code copied!');
  }

  function shareOnWhatsApp() {
    if (!flat) return;
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://flatsync-psi.vercel.app';
    const joinUrl = `${siteUrl}/onboarding?code=${flat.join_code}`;
    const message = `🛒 Join our "${flat.name}" group on FlatSync to add grocery items together:\n\n👉 ${joinUrl}\n\nInvite Code: ${flat.join_code}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  }

  async function shareNative() {
    if (!flat) return;
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://flatsync-psi.vercel.app';
    const joinUrl = `${siteUrl}/onboarding?code=${flat.join_code}`;
    const text = `Join our "${flat.name}" group on FlatSync with code: ${flat.join_code}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${flat.name} on FlatSync`,
          text,
          url: joinUrl,
        });
      } catch {
        // User dismissed share sheet
      }
    } else {
      navigator.clipboard.writeText(`${text}\n${joinUrl}`);
      toast.success('Invite link copied to clipboard!');
    }
  }

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
        {/* Current group info */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{flat?.icon || '👥'}</span>
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-white leading-tight">
                {flat?.name ?? 'Group'}
              </h2>
              {flat?.group_type && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 capitalize">
                  {flat.group_type} Group
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
            <div>
              <p className="text-xs text-zinc-400">Invite Code</p>
              <p className="font-mono font-bold text-xl tracking-widest text-zinc-900 dark:text-white">
                {flat?.join_code}
              </p>
            </div>
            <button
              onClick={copyCode}
              className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 transition-colors"
              title="Copy code"
            >
              <Copy size={18} />
            </button>
          </div>

          {/* WhatsApp & Native Share Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={shareOnWhatsApp}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <MessageCircle size={15} />
              Share on WhatsApp
            </button>

            <button
              onClick={shareNative}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium text-xs transition-colors"
            >
              <Share2 size={15} />
              Share Link
            </button>
          </div>
        </Card>

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
              onClick={() => router.push('/onboarding')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Plus size={14} /> Add Group
            </button>
          </div>

          <div className="space-y-2.5">
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

        {/* Members in current group with name and indicator */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-zinc-400" />
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              Group Members ({members.length})
            </h3>
          </div>
          <div className="space-y-2">
            {members.map((m) => {
              const isMe = m.id === profile?.id;
              const displayName = m.name || (isMe ? profile?.name : null) || 'Member';
              return (
                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
                  <div className="flex items-center gap-3">
                    <Avatar name={displayName} src={m.avatar_url} id={m.id} size="md" />
                    <div>
                      <p className="font-medium text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                        {displayName}
                        {isMe && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            You
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Sign out */}
        <Button variant="danger" className="w-full" onClick={signOut}>
          <LogOut size={16} />
          Sign Out
        </Button>
      </main>

      <BottomNav flatId={flatId} />
    </div>
  );
}
