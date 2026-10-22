'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Sparkles, CheckCircle2, Mail } from 'lucide-react';
import { getFriendlyErrorMessage } from '@/lib/sanitizeError';
import toast from 'react-hot-toast';

function LoginContent() {
  const { signIn } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    // We intentionally do NOT auto-fill email or password as requested:
    // "verification mail link for create account should redirect to signin page nothing auto filled"
    // "after successful reset it should redirect to signin page without auto fill mail or password."
    setEmail('');
    setPassword('');

    if (searchParams.get('checkEmail') === 'true') {
      setCheckEmail(true);
    }

    if (searchParams.get('verified') === 'true') {
      setEmailVerified(true);
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
      toast.error(getFriendlyErrorMessage(err, 'Login failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Logo */}
      <div className="text-center space-y-2">
        <div className="text-5xl">🛒</div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">GrocerySync</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Shared grocery sync for groups & flats
        </p>
      </div>

      {checkEmail && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-medium animate-in fade-in">
          <Mail size={16} className="text-sky-500 flex-shrink-0" />
          <span>Verification email sent! Please verify your email before signing in.</span>
        </div>
      )}

      {emailVerified && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
          <span>Email successfully verified! Enter your credentials to sign in.</span>
        </div>
      )}

      {code && (
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
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
            <Link
              href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus={!!email}
          />
        </div>
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

