'use client';


import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, LogIn, Copy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { generateJoinCode } from '@/lib/utils';
import toast from 'react-hot-toast';

type Mode = 'choose' | 'create' | 'join';

export default function OnboardingPage() {
  const supabase = createClient();
  const { profile } = useAppStore();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('choose');
  const [flatName, setFlatName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function createFlat() {
    if (!flatName.trim()) { toast.error('Enter a flat name'); return; }
    setLoading(true);
    try {
      const code = generateJoinCode();
      const { data: flat, error } = await supabase
        .from('flats')
        .insert({ name: flatName.trim(), join_code: code })
        .select()
        .single();
      if (error) throw error;
      await supabase.from('profiles').update({ flat_id: flat.id }).eq('id', profile!.id);
      toast.success(`Flat created! Code: ${code}`);
      router.push(`/flat/${flat.id}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create flat');
    } finally {
      setLoading(false);
    }
  }

  async function joinFlat() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) { toast.error('Enter a 6-character join code'); return; }
    setLoading(true);
    try {
      const { data: flat, error } = await supabase
        .from('flats')
        .select('*')
        .eq('join_code', code)
        .single();
      if (error || !flat) throw new Error('Invalid join code. Check with your flatmate!');
      await supabase.from('profiles').update({ flat_id: flat.id }).eq('id', profile!.id);
      toast.success(`Joined ${flat.name}! 🏠`);
      router.push(`/flat/${flat.id}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to join flat');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">🏠</div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Set Up Your Flat</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Hi {profile?.name ?? 'there'}! Create a new flat or join an existing one.
          </p>
        </div>

        {mode === 'choose' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <button
              onClick={() => setMode('create')}
              className="w-full flex items-center gap-4 p-5 bg-white dark:bg-zinc-900 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-2xl">🏡</div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-white">Create a Flat</p>
                <p className="text-sm text-zinc-400">Start fresh, invite your flatmates</p>
              </div>
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full flex items-center gap-4 p-5 bg-white dark:bg-zinc-900 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-2xl">🔑</div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-white">Join a Flat</p>
                <p className="text-sm text-zinc-400">Enter a 6-character code from your flatmate</p>
              </div>
            </button>
          </motion.div>
        )}

        {mode === 'create' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border border-zinc-100 dark:border-zinc-800 space-y-4"
          >
            <h2 className="font-semibold text-zinc-900 dark:text-white">Name Your Flat</h2>
            <Input
              placeholder="e.g. Tower B – 404, Koramangala Guys…"
              value={flatName}
              onChange={(e) => setFlatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createFlat()}
              autoFocus
            />
            <Button className="w-full" onClick={createFlat} loading={loading}>
              <Plus size={18} /> Create Flat
            </Button>
            <button onClick={() => setMode('choose')} className="w-full text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
              ← Back
            </button>
          </motion.div>
        )}

        {mode === 'join' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border border-zinc-100 dark:border-zinc-800 space-y-4"
          >
            <h2 className="font-semibold text-zinc-900 dark:text-white">Enter Join Code</h2>
            <Input
              placeholder="e.g. AB12XY"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="tracking-[0.4em] text-center font-mono text-lg uppercase"
              onKeyDown={(e) => e.key === 'Enter' && joinFlat()}
              autoFocus
            />
            <Button className="w-full" onClick={joinFlat} loading={loading}>
              <LogIn size={18} /> Join Flat
            </Button>
            <button onClick={() => setMode('choose')} className="w-full text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
              ← Back
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
