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
import { Copy, LogOut, Users, Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const router = useRouter();
  const routeParams = useParams();
  const flatId = (routeParams?.flatId as string) || '';
  const { flat, members } = useFlat(flatId);
  const { userGroups } = useAppStore();
  const { signOut } = useAuth();

  function copyCode() {
    if (!flat) return;
    navigator.clipboard.writeText(flat.join_code);
    toast.success('Join code copied!');
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
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
          <p className="text-xs text-zinc-400">Share this code with friends, family, or colleagues so they can join.</p>
        </Card>

        {/* All user groups */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🗂️</span>
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                Your Groups ({userGroups.length})
              </h3>
            </div>
            <button
              onClick={() => router.push('/onboarding')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
            >
              <Plus size={14} /> Add Group
            </button>
          </div>

          <div className="space-y-1.5">
            {userGroups.map((g) => {
              const isCurrent = g.id === flatId;
              return (
                <button
                  key={g.id}
                  onClick={() => router.push(`/flat/${g.id}`)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                    isCurrent
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{g.icon || '👥'}</span>
                    <div>
                      <p className="text-sm leading-snug">{g.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">#{g.join_code}</p>
                    </div>
                  </div>
                  {isCurrent ? (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <Check size={14} /> Active
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">Switch →</span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Members in current group */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-zinc-400" />
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              Members ({members.length})
            </h3>
          </div>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar name={m.name} src={m.avatar_url} id={m.id} size="md" />
                <p className="font-medium text-sm text-zinc-900 dark:text-white">{m.name}</p>
              </div>
            ))}
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
