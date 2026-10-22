'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ArrowLeft, KeyRound, Mail, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Step 1: 'request' (enter email) -> Step 2: 'verify_and_reset' (enter OTP, new password, confirm password)
  const [step, setStep] = useState<'request' | 'verify_and_reset'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam.trim().toLowerCase());
    }
  }, [searchParams]);

  // Timer countdown for resending OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Request Password Reset OTP via Email
  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) throw error;

      toast.success('Verification code / link sent to your email! 📬');
      setStep('verify_and_reset');
      setCountdown(60);
    } catch (err: any) {
      console.error('Password reset request error:', err);
      toast.error(err.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  }

  // Resend OTP
  async function handleResendOtp() {
    if (countdown > 0) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
      if (error) throw error;
      toast.success('New code sent to your email! 📬');
      setCountdown(60);
    } catch (err: any) {
      toast.error(err.message || 'Could not resend code. Please try again.');
    } finally {
      setResending(false);
    }
  }

  // Verify OTP and Update Password
  async function handleVerifyAndResetPassword(e: React.FormEvent) {
    e.preventDefault();
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      toast.error('Please enter the 6-digit OTP code sent to your email');
      return;
    }
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
      // 1. Verify the recovery OTP with Supabase
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cleanOtp,
        type: 'recovery',
      });

      if (verifyError) {
        // Fallback: check 'email' type as fallback in case token was generated as email signup token
        const fallbackVerify = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: cleanOtp,
          type: 'email',
        });
        if (fallbackVerify.error) {
          throw new Error(verifyError.message || 'Invalid or expired OTP code. Please check your email.');
        }
      }

      // 2. Set the new password for the authenticated session
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // 3. Clean sign out so user logs in with new credentials
      await supabase.auth.signOut();

      toast.success('Password successfully reset! Please sign in with your new password 🔐');
      router.push(`/login?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: any) {
      console.error('Password change error:', err);
      toast.error(err.message || 'Failed to change password. Please verify your OTP.');
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
          {step === 'request' ? 'Forgot Password' : 'Reset Password'}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-xs mx-auto">
          {step === 'request'
            ? 'Enter your registered email and we will send you an OTP to reset your password.'
            : `Enter the code sent to ${email} and choose your new password.`}
        </p>
      </div>

      {step === 'request' ? (
        <form onSubmit={handleSendOtp} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl space-y-4 border border-zinc-100 dark:border-zinc-800">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Send Reset Code
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
      ) : (
        <form onSubmit={handleVerifyAndResetPassword} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl space-y-4 border border-zinc-100 dark:border-zinc-800">
          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <Mail size={16} className="text-emerald-500 flex-shrink-0" />
              <span className="truncate">{email}</span>
            </div>
            <button
              type="button"
              onClick={() => setStep('request')}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex-shrink-0 cursor-pointer"
            >
              Change
            </button>
          </div>

          <Input
            label="Verification Code (OTP)"
            type="text"
            placeholder="Enter 6-digit code from email"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            autoFocus
            maxLength={10}
          />

          <Input
            label="New Password"
            type="password"
            placeholder="At least 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
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
            Verify &amp; Change Password
          </Button>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => setStep('request')}
              className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              ← Back
            </button>

            <button
              type="button"
              disabled={countdown > 0 || resending}
              onClick={handleResendOtp}
              className="font-semibold text-emerald-600 dark:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed hover:underline"
            >
              {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
            </button>
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
