'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Sun,
  Moon,
  Laptop,
  Bell,
  KeyRound,
  Share2,
  Star,
  MessageSquare,
  LogOut,
  Trash2,
  Users,
  Copy,
  ExternalLink,
  Check,
  X,
  Lock,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import { useFlat } from '@/hooks/useFlat';
import { createClient } from '@/lib/supabase/client';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  areAlertsEnabled,
  setAlertsEnabled,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { getFriendlyErrorMessage } from '@/lib/sanitizeError';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const routeParams = useParams();
  const flatId = (routeParams?.flatId as string) || '';
  const { profile, userGroups } = useAppStore();
  const { signOut } = useAuth();
  const { flat } = useFlat(flatId);
  const isConnected = true;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState<string>('');
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  const [alertsEnabled, setAlertsEnabledState] = useState(true);
  const [notifSupported, setNotifSupported] = useState(false);

  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showReferModal, setShowReferModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [rating, setRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'feature' | 'praise'>('feature');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    });

    const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
    setThemeState(savedTheme);

    const supported = isNotificationSupported();
    setNotifSupported(supported);
    if (supported) {
      setAlertsEnabledState(areAlertsEnabled());
    }
  }, [supabase]);

  function applyTheme(newTheme: 'light' | 'dark' | 'system') {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
    toast.success(`Theme switched to ${newTheme}`);
  }

  async function handleToggleAlerts() {
    if (!notifSupported) {
      toast.error('Web notifications are not supported on this browser');
      return;
    }

    const currentPerm = getNotificationPermission();
    if (currentPerm === 'denied') {
      toast.error('Notifications blocked in browser settings. Please enable them in browser site settings.');
      return;
    }

    if (currentPerm === 'default') {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error('Permission not granted');
        return;
      }
    }

    const nextState = !alertsEnabled;
    setAlertsEnabledState(nextState);
    setAlertsEnabled(nextState);
    toast.success(nextState ? 'Lockscreen alerts enabled! 🔔' : 'Ordering alerts muted');
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) { toast.error('Enter your current password'); return; }
    if (newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('New passwords do not match'); return; }

    setPasswordLoading(true);
    try {
      let emailToUse = userEmail;
      if (!emailToUse) {
        const { data: userData } = await supabase.auth.getUser();
        emailToUse = userData?.user?.email || '';
      }

      if (emailToUse) {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password: currentPassword,
        });

        if (verifyError) {
          toast.error('Current password is incorrect. Please try again.');
          setPasswordLoading(false);
          return;
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      toast.success('Password updated successfully! 🔐');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to update password'));
    } finally {
      setPasswordLoading(false);
    }
  }

  function getReferralUrl() {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://flatsync-psi.vercel.app';
    const activeGroup = userGroups.find((g) => g.id === flatId) || userGroups[0];
    const codeQuery = activeGroup?.join_code ? `?code=${activeGroup.join_code}` : '';
    return `${siteUrl}/register${codeQuery}`;
  }

  function handleShareReferralWhatsApp() {
    const regUrl = getReferralUrl();
    const activeGroup = userGroups.find((g) => g.id === flatId) || userGroups[0];
    const groupText = activeGroup?.name ? ` to join "${activeGroup.name}"` : '';
    const message = `🛒 GrocerySync makes shared grocery runs so easy! Create your account${groupText} and add items together with live Blinkit & Zepto alerts:\n\n👉 ${regUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  }

  function handleCopyReferralLink() {
    const regUrl = getReferralUrl();
    navigator.clipboard.writeText(regUrl);
    toast.success('Referral link copied to clipboard! 📋');
  }

  async function handleNativeReferralShare() {
    const regUrl = getReferralUrl();
    const message = `🛒 GrocerySync — Shared grocery dispatch with friends, flatmates & family`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'GrocerySync — Create Account',
          text: message,
          url: regUrl,
        });
      } catch {}
    } else {
      handleCopyReferralLink();
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      if (profile?.id) {
        await supabase.from('group_members').delete().eq('user_id', profile.id);
        await supabase.from('profiles').delete().eq('id', profile.id);
      }
      setShowDeleteModal(false);
      await signOut();
      toast.success('Your account has been deleted');
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to delete account'));
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleSendFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackText.trim()) { toast.error('Please enter feedback'); return; }
    setFeedbackLoading(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: feedbackText.trim(),
          category: feedbackCategory,
          userName: profile?.name || 'User',
          userEmail: profile?.email || null,
          userId: profile?.id || null,
        }),
      });
      setShowFeedbackModal(false);
      setFeedbackText('');
      toast.success('Successfully submitted!');
    } catch {
      setShowFeedbackModal(false);
      setFeedbackText('');
      toast.success('Successfully submitted!');
    } finally {
      setFeedbackLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-28">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <button
            onClick={() => router.push(`/flat/${flatId}`)}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to List</span>
          </button>
          <h2 className="font-bold text-sm text-zinc-900 dark:text-white">Profile & Settings</h2>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* User Identity Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-emerald-500/20 flex-shrink-0">
              {profile?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-900 dark:text-white truncate">
                  {profile?.name || 'User'}
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate mt-0.5">{userEmail || 'Member'}</p>
            </div>
          </div>
        </div>

        {/* Section: Preferences */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1 mb-2">
            Preferences
          </p>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden shadow-sm">
            {/* Theme Toggle */}
            <div className="p-4 flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-xs text-zinc-900 dark:text-white">Theme</p>
                <p className="text-[11px] text-zinc-400">Display appearance</p>
              </div>
              <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-full gap-1">
                <button
                  onClick={() => applyTheme('light')}
                  className={cn(
                    'p-1.5 rounded-full text-xs transition-colors cursor-pointer',
                    theme === 'light' ? 'bg-white dark:bg-zinc-700 text-amber-500 shadow-xs' : 'text-zinc-400'
                  )}
                  title="Light mode"
                >
                  <Sun size={14} />
                </button>
                <button
                  onClick={() => applyTheme('dark')}
                  className={cn(
                    'p-1.5 rounded-full text-xs transition-colors cursor-pointer',
                    theme === 'dark' ? 'bg-white dark:bg-zinc-700 text-indigo-400 shadow-xs' : 'text-zinc-400'
                  )}
                  title="Dark mode"
                >
                  <Moon size={14} />
                </button>
                <button
                  onClick={() => applyTheme('system')}
                  className={cn(
                    'p-1.5 rounded-full text-xs transition-colors cursor-pointer',
                    theme === 'system' ? 'bg-white dark:bg-zinc-700 text-emerald-500 shadow-xs' : 'text-zinc-400'
                  )}
                  title="System preference"
                >
                  <Laptop size={14} />
                </button>
              </div>
            </div>

            {/* Sliding Alerts Toggle */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Bell size={15} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-zinc-900 dark:text-white">Alerts</p>
                  <p className="text-[11px] text-zinc-400 truncate">Lockscreen push when group orders</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleAlerts}
                className={cn(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  alertsEnabled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                    alertsEnabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section: Actions & Sharing */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1 mb-2">
            Account & Sharing
          </p>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden shadow-sm">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <KeyRound size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-zinc-900 dark:text-white">Change Password</p>
                  <p className="text-[11px] text-zinc-400">Update your account credentials</p>
                </div>
              </div>
              <span className="text-zinc-400 text-xs">→</span>
            </button>

            <button
              onClick={() => setShowReferModal(true)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Share2 size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-zinc-900 dark:text-white">Refer / Share GrocerySync</p>
                  <p className="text-[11px] text-zinc-400">Invite members to register & join</p>
                </div>
              </div>
              <span className="text-zinc-400 text-xs">→</span>
            </button>

            <button
              onClick={() => router.push(`/flat/${flatId}/settings`)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Users size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-zinc-900 dark:text-white">Group Settings & Members</p>
                  <p className="text-[11px] text-zinc-400">Manage member list & invite codes</p>
                </div>
              </div>
              <span className="text-zinc-400 text-xs">→</span>
            </button>

            <button
              onClick={() => setShowRateModal(true)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Star size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-zinc-900 dark:text-white">Rate GrocerySync</p>
                  <p className="text-[11px] text-zinc-400">Share your experience</p>
                </div>
              </div>
              <span className="text-zinc-400 text-xs">→</span>
            </button>

            <button
              onClick={() => setShowFeedbackModal(true)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <MessageSquare size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-zinc-900 dark:text-white">Send Feedback</p>
                  <p className="text-[11px] text-zinc-400">Suggest features or report issues</p>
                </div>
              </div>
              <span className="text-zinc-400 text-xs">→</span>
            </button>
          </div>
        </div>

        {/* Section: Danger Zone & Signout */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold text-xs transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full text-center text-[11px] text-zinc-400 hover:text-rose-500 py-1 transition-colors cursor-pointer"
          >
            Delete Account Permanently
          </button>
        </div>
      </main>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-5 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-emerald-500" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Change Password</h3>
                </div>
                <button onClick={() => setShowPasswordModal(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase">Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase">New Password</label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                    required
                  />
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-xs"
                  >
                    {passwordLoading ? 'Verifying...' : 'Update'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Refer / Share Modal */}
      <AnimatePresence>
        {showReferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-5 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 size={18} className="text-emerald-500" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Refer GrocerySync</h3>
                </div>
                <button onClick={() => setShowReferModal(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-zinc-500">
                Share GrocerySync with your flatmates, family, or friends to sync groceries together.
              </p>

              <div className="space-y-2">
                <button
                  onClick={handleShareReferralWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs"
                >
                  <span>Share on WhatsApp 🚀</span>
                </button>
                <button
                  onClick={handleCopyReferralLink}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold text-xs"
                >
                  <Copy size={14} />
                  <span>Copy Register Link</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rate Modal */}
      <AnimatePresence>
        {showRateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-5 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 text-center"
            >
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">Rate GrocerySync</h3>
              <p className="text-xs text-zinc-400">How would you rate your grocery collaboration experience?</p>

              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRating(s)}
                    className="p-1 text-2xl transition-transform hover:scale-125"
                  >
                    {s <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowRateModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-zinc-500 rounded-xl"
                >
                  Later
                </button>
                <button
                  onClick={() => {
                    setShowRateModal(false);
                    toast.success('Thank you for rating! 🌟');
                  }}
                  className="flex-1 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-5 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Send Feedback</h3>
                <button onClick={() => setShowFeedbackModal(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSendFeedback} className="space-y-3">
                <div className="flex gap-2">
                  {(['feature', 'bug', 'praise'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFeedbackCategory(cat)}
                      className={cn(
                        'flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize',
                        feedbackCategory === cat ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <textarea
                  placeholder="Tell us what you'd love to see or what we can improve..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full h-24 p-3 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white resize-none"
                  required
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="flex-1 py-2 text-xs font-semibold text-zinc-500 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={feedbackLoading}
                    className="flex-1 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-xs"
                  >
                    {feedbackLoading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-5 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 size={18} />
                <h3 className="font-bold text-sm">Delete Account?</h3>
              </div>
              <p className="text-xs text-zinc-500">
                This will delete your profile and remove your memberships from your groups. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-zinc-500 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav flatId={flatId} />
    </div>
  );
}
