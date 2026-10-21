'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

function LoginContent() {
  const { signIn } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }

    const regParam = searchParams.get('registered');
    if (regParam === 'true') {
      setJustRegistered(true);
    }

    const codeParam = searchParams.get('code');
    if (codeParam) {
      const clean = codeParam.trim().toUpperCase().slice(0, 6);
      setCode(clean);
      if (typeof window !== 'undefined') {
        localStorage.setItem('flatsync_pending_code', clean);
      }
    } else if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('flatsync_pending_code');
      if (stored) setCode(stored);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password, code || undefined);
    } catch (err: any) {
      toast.error(err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Logo */}
      <div className="text-center space-y-2">
        <div className="text-5xl">🛒</div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">FlatSync</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Grocery sync for your flat
        </p>
      </div>

      {justRegistered && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
          <span>Account created! Enter your password to sign in.</span>
        </div>
      )}

      {code && !justRegistered && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-medium animate-in fade-in">
          <Sparkles size={16} className="text-amber-500 flex-shrink-0" />
          <span>Sign in to join group #{code}!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl space-y-4 border border-zinc-100 dark:border-zinc-800">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus={!!email}
        />
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Sign In
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        New here?{' '}
        <Link
          href={`/register${code ? `?code=${code}` : ''}`}
          className="text-emerald-600 font-semibold hover:underline"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Suspense fallback={<div className="text-sm text-zinc-400">Loading...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}

