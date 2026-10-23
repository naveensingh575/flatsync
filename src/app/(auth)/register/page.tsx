'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Users } from 'lucide-react';
import { getFriendlyErrorMessage } from '@/lib/sanitizeError';
import toast from 'react-hot-toast';

function RegisterContent() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { profile } = useAppStore();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  // If user is already authenticated, redirect immediately back to their list/dashboard
  useEffect(() => {
    if (profile?.id) {
      router.replace('/list');
    }
  }, [profile?.id, router]);

  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      const clean = codeParam.trim().toUpperCase().slice(0, 6);
      setCode(clean);
      if (typeof window !== 'undefined') {
        localStorage.setItem('grocerysync_pending_code', clean);
      }
    } else if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('grocerysync_pending_code') || localStorage.getItem('flatsync_pending_code');
      if (stored) setCode(stored);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await signUp(email, password, name.trim(), code || undefined);
      toast.success('Verification email sent! Please check your inbox and verify to sign in 📬', { duration: 6000 });
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Sign up failed. Please check your information and try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center space-y-2">
        <div className="text-5xl">🛒</div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Create Account</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Join your group & sync groceries</p>
      </div>

      {code && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium animate-in fade-in">
          <Users size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>You were invited to join group #{code}! Create your account to continue.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl space-y-4 border border-zinc-100 dark:border-zinc-800">
        <Input
          label="Your Name"
          placeholder="Rahul, Priya…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
          placeholder="Min. 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Already have an account?{' '}
        <Link
          href={`/login${code ? `?code=${code}` : ''}`}
          className="text-emerald-600 font-semibold hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Suspense fallback={<div className="text-sm text-zinc-400">Loading...</div>}>
        <RegisterContent />
      </Suspense>
    </div>
  );
}

