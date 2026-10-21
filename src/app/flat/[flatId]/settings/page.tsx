'use client';


import { useParams } from 'next/navigation';
import { useFlat } from '@/hooks/useFlat';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Copy, LogOut, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const routeParams = useParams();
  const flatId = (routeParams?.flatId as string) || '';
  const { flat, members } = useFlat(flatId);
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
        {/* Flat info */}
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold text-zinc-900 dark:text-white">{flat?.name ?? 'Your Flat'}</h2>
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
            <div>
              <p className="text-xs text-zinc-400">Join Code</p>
              <p className="font-mono font-bold text-xl tracking-widest text-zinc-900 dark:text-white">
                {flat?.join_code}
              </p>
            </div>
            <button
              onClick={copyCode}
              className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 transition-colors"
            >
              <Copy size={18} />
            </button>
          </div>
          <p className="text-xs text-zinc-400">Share this code with flatmates so they can join</p>
        </Card>

        {/* Members */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-zinc-400" />
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              Flatmates ({members.length})
            </h3>
          </div>
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar name={m.name} src={m.avatar_url} id={m.id} size="md" />
              <p className="font-medium text-sm text-zinc-900 dark:text-white">{m.name}</p>
            </div>
          ))}
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
