'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ArrowLeft, KeyRound, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { getFriendlyErrorMessage } from '@/lib/sanitizeError';
import toast from 'react-hot-toast';

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Mode:
  // 'request': User enters email to receive password reset link
  // 'email_sent': Confirmation that verification reset mail was sent
  // 'reset': User opened the email link and is setting their new & confirmed password
  const [mode, setMode] = useState<'request' | 'email_sent' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [userNotFound, setUserNotFound] = useState(false);

  useEffect(() => {
    // 1. Detect if user arrived via the email reset link
    const modeParam = searchParams.get('mode');
    const typeParam = searchParams.get('type');
    const codeParam = searchParams.get('code');

    // Supabase can deliver hash fragments or session callback for recovery
    if (modeParam === 'reset' || typeParam === 'recovery' || codeParam) {
      setMode('reset');
    }

    // 2. Read email param if passed
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam.trim().toLowerCase());
    }

    // Check if an existing recovery session is active
    async function checkRecoverySession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && (modeParam === 'reset' || window.location.hash.includes('type=recovery'))) {
        setMode('reset');
      }
    }
    checkRecoverySession();

    // Listen for PASSWORD_RECOVERY auth event
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: any) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [searchParams, supabase]);

  // Timer countdown for resending
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Request Password Reset Link via Email
  async function handleSendResetEmail(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    setUserNotFound(false);

    try {
      // 1. Check if an account is attached to this email
      const checkRes = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const checkData = await checkRes.json();

      if (checkData && checkData.exists === false) {
        setUserNotFound(true);
        setLoading(false);
        return;
      }

      // 2. Determine exact project URL (never localhost in production)
      const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://flatsync-psi.vercel.app';
      const redirectTo = `${siteUrl}/auth/callback?type=recovery&next=/forgot-password?mode=reset`;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox 📬', { duration: 6000 });
      setMode('email_sent');
      setCountdown(60);
    } catch (err: any) {
      console.error('Password reset email error:', err);
      toast.error(getFriendlyErrorMessage(err, 'Failed to send reset email. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  // Resend reset email
  async function handleResendEmail() {
    if (countdown > 0) return;
    setResending(true);
    try {
      const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://flatsync-psi.vercel.app';
      const redirectTo = `${siteUrl}/auth/callback?type=recovery&next=/forgot-password?mode=reset`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo,
      });
      if (error) throw error;
      toast.success('New password reset email sent! 📬');
      setCountdown(60);
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Could not resend email. Please try again.'));
    } finally {
      setResending(false);
    }
  }

  // Submit New & Confirmed Password
  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setLoading(true);
    try {
      // 1. Update password in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // 2. Immediately sign out session so user signs in cleanly with credentials
      await supabase.auth.signOut();

      toast.success('Password reset successfully! Please sign in with your new password 🔐', { duration: 5000 });

      // Redirect to signin page without auto-fill email or password
      router.push('/login');
    } catch (err: any) {
      console.error('Password change error:', err);
      toast.error(getFriendlyErrorMessage(err, 'Failed to update password. Your reset link may have expired.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center text-2xl shadow-xs">
          <KeyRound size={28} />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {mode === 'reset' ? 'Set New Password' : 'Forgot Password'}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-xs mx-auto">
          {mode === 'reset'
            ? 'Choose a strong new password and confirm it below.'
            : mode === 'email_sent'
            ? `We sent a reset verification link to ${email}. Tap the link in your email to set a new password.`
            : 'Enter your registered email address to receive a secure password reset link.'}
        </p>
      </div>

      {userNotFound && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle size={16} className="text-rose-500 flex-shrink-0" />
            <span>User doesn&apos;t exist</span>
          </div>
          <p className="leading-relaxed">
            No account is attached to this email address. Please check for typos or create a new account.
          </p>
          <div className="pt-1">
            <Link
              href="/register"
              className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400 hover:underline"
            >
              <span>Create Account →</span>
            </Link>
          </div>
        </div>
      )}

      {/* Mode 1: Request Email Form */}
      {mode === 'request' && (
        <form onSubmit={handleSendResetEmail} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl space-y-4 border border-zinc-100 dark:border-zinc-800">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (userNotFound) setUserNotFound(false);
            }}
            required
            autoFocus
          />

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Send Reset Link
          </Button>

          <div className="pt-1 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </form>
      )}

      {/* Mode 2: Email Sent Confirmation View */}
      {mode === 'email_sent' && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl space-y-5 border border-zinc-100 dark:border-zinc-800 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Mail size={24} />
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Check your email</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              We sent a password reset link to <strong className="text-zinc-800 dark:text-zinc-200">{email}</strong>.
              Click the link in the email to open the password reset page.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              disabled={countdown > 0 || resending}
              onClick={handleResendEmail}
              className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {countdown > 0 ? `Resend email in ${countdown}s` : 'Resend Email'}
            </button>

            <button
              type="button"
              onClick={() => setMode('request')}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Use a different email
            </button>
          </div>
        </div>
      )}

      {/* Mode 3: Reset Password (opened from email link) */}
      {mode === 'reset' && (
        <form onSubmit={handleUpdatePassword} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl space-y-4 border border-zinc-100 dark:border-zinc-800">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
            <span>Email verified! Enter your new password below.</span>
          </div>

          <Input
            label="New Password"
            type="password"
            placeholder="Min. 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Save New Password
          </Button>

          <div className="pt-1 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Cancel and Sign In</span>
            </Link>
          </div>
        </form>
      )}

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Remember your password?{' '}
        <Link href="/login" className="text-emerald-600 font-semibold hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Suspense fallback={<div className="text-sm text-zinc-400">Loading...</div>}>
        <ForgotPasswordContent />
      </Suspense>
    </div>
  );
}
