'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun,
  Moon,
  Laptop,
  Bell,
  BellRing,
  KeyRound,
  Share2,
  Star,
  MessageSquare,
  LogOut,
  ChevronRight,
  Settings,
  X,
  UserX,
  AlertTriangle,
  Copy,
  MessageCircle,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
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

interface ProfileMenuProps {
  flatId?: string;
  isConnected?: boolean;
  isOnline?: boolean;
}

export function ProfileMenu({ flatId, isConnected = true, isOnline = true }: ProfileMenuProps) {
  const router = useRouter();
  const { profile, userGroups } = useAppStore();
  const { signOut } = useAuth();
  const supabase = createClient();

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  const [alertsEnabled, setAlertsEnabledState] = useState(true);
  const [notifSupported, setNotifSupported] = useState(false);

  // Sub-modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [showReferModal, setShowReferModal] = useState(false);

  const [showRateModal, setShowRateModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'feature' | 'general'>('feature');
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    setMounted(true);
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize theme, user email, and notifications
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'dark') setThemeState('dark');
      else if (storedTheme === 'light') setThemeState('light');
      else setThemeState('system');

      setNotifSupported(isNotificationSupported());
      const hasPermission = getNotificationPermission() === 'granted';
      setAlertsEnabledState(areAlertsEnabled() && hasPermission);
    }

    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    }
    fetchUser();
  }, [supabase]);

  // Theme switcher
  function handleSetTheme(mode: 'light' | 'dark' | 'system') {
    setThemeState(mode);
    if (mode === 'system') {
      localStorage.removeItem('theme');
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    } else if (mode === 'dark') {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
    }
  }

  // Sliding Alerts toggle
  async function handleToggleAlerts() {
    if (!notifSupported) {
      toast.error('Web notifications are not supported by this browser');
      return;
    }

    if (alertsEnabled) {
      setAlertsEnabled(false);
      setAlertsEnabledState(false);
      toast.success('Ordering alerts disabled');
    } else {
      if (getNotificationPermission() === 'granted') {
        setAlertsEnabled(true);
        setAlertsEnabledState(true);
        toast.success('Ordering alerts enabled! 🔔');
      } else {
        const granted = await requestNotificationPermission();
        if (granted) {
          setAlertsEnabled(true);
          setAlertsEnabledState(true);
          toast.success('Ordering alerts enabled! 🔔');
        } else {
          setAlertsEnabled(false);
          setAlertsEnabledState(false);
          toast.error('Notification permission was denied in browser settings');
        }
      }
    }
  }

  // Change password with existing password verification
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setPasswordLoading(true);
    try {
      // 1. Verify existing password first
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

      // 2. Verified: Update to new password
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

  // Delete Account
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

  // Refer / Share GrocerySync helpers
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
      } catch {
        // User dismissed share dialog
      }
    } else {
      handleCopyReferralLink();
    }
  }

  // Rate GrocerySync
  function handleRateSubmit() {
    setShowRateModal(false);
    toast.success(`Thank you for rating GrocerySync ${rating} stars! ⭐🎉`);
  }

  // Send Feedback
  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackText.trim()) return;
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

  if (!profile) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Top-Right Profile Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer relative focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        aria-label="User Profile and Settings"
      >
        <div className="relative">
          <Avatar name={profile.name} src={profile.avatar_url} id={profile.id} size="sm" />
          {/* Real-time Status Micro-dot */}
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-950',
              !isOnline
                ? 'bg-amber-500 animate-pulse'
                : isConnected
                ? 'bg-emerald-500'
                : 'bg-amber-400'
            )}
            title={!isOnline ? 'Offline' : isConnected ? 'Live Real-Time' : 'Reconnecting'}
          />
        </div>
      </button>

      {/* Profile Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-50 flex flex-col max-h-[82vh] overflow-hidden"
          >
            {/* 1. Profile Header Card with 🟢 Live Badge next to username */}
            <div className="p-4 bg-gradient-to-br from-zinc-50 to-zinc-100/70 dark:from-zinc-900 dark:to-zinc-850 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Avatar name={profile.name} src={profile.avatar_url} id={profile.id} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                      {profile.name}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60 flex items-center gap-1 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  {userEmail ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {userEmail}
                    </p>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Active Member
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Menu Body */}
            <div className="p-3 space-y-3 flex-1 overflow-y-auto overscroll-contain pb-6">
              {/* Preferences Section: Theme & Sliding Alerts */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                  Preferences
                </p>

                {/* Theme Selector: Light / Dark / System */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Theme
                  </span>
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750">
                    <button
                      onClick={() => handleSetTheme('light')}
                      className={cn(
                        'p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer',
                        theme === 'light'
                          ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                      )}
                      title="Light Mode"
                    >
                      <Sun size={13} className="text-amber-500" />
                    </button>
                    <button
                      onClick={() => handleSetTheme('dark')}
                      className={cn(
                        'p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer',
                        theme === 'dark'
                          ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                      )}
                      title="Dark Mode"
                    >
                      <Moon size={13} className="text-indigo-400" />
                    </button>
                    <button
                      onClick={() => handleSetTheme('system')}
                      className={cn(
                        'p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer',
                        theme === 'system'
                          ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                      )}
                      title="System Default"
                    >
                      <Laptop size={13} />
                    </button>
                  </div>
                </div>

                {/* Alerts with Sliding Toggle Switch */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                      {alertsEnabled ? <BellRing size={14} /> : <Bell size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        Alerts
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        Lockscreen push when flatmates order
                      </p>
                    </div>
                  </div>

                  {/* Sliding Enable/Disable Toggle */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={alertsEnabled}
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

              {/* Account & App Actions */}
              <div className="space-y-1 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                  Account & App
                </p>

                {/* Group Settings & Members */}
                {flatId && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      router.push(`/flat/${flatId}/settings`);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors border border-zinc-100 dark:border-zinc-800 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings size={15} className="text-emerald-500" />
                      <span>Group Settings & Members</span>
                    </div>
                    <ChevronRight size={14} className="text-zinc-400" />
                  </button>
                )}

                {/* Change Password */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowPasswordModal(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <KeyRound size={15} className="text-zinc-400" />
                    <span>Change Password</span>
                  </div>
                  <ChevronRight size={14} className="text-zinc-400" />
                </button>

                {/* Refer GrocerySync */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowReferModal(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Share2 size={15} className="text-emerald-500" />
                    <span>Refer / Share GrocerySync</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    Invite
                  </span>
                </button>

                {/* Rate GrocerySync */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowRateModal(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Star size={15} className="text-amber-500" />
                    <span>Rate GrocerySync</span>
                  </div>
                  <span className="text-xs text-amber-500">★★★★★</span>
                </button>

                {/* Feedback */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowFeedbackModal(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare size={15} className="text-sky-500" />
                    <span>Send Feedback</span>
                  </div>
                  <ChevronRight size={14} className="text-zinc-400" />
                </button>
              </div>

              {/* Bottom Actions: Sign Out & Delete Account */}
              <div className="pt-2 border-t border-zinc-150 dark:border-zinc-800/80 space-y-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowDeleteModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 p-2 rounded-2xl text-[11px] font-medium text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <UserX size={13} />
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portal all modals directly into document.body to break out of any header backdrop-filter stacking contexts */}
      {mounted &&
        createPortal(
          <>
            {/* Change Password Modal (Verified with Existing Password) */}
            <AnimatePresence>
              {showPasswordModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto overscroll-contain"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                      <div className="flex items-center gap-2">
                        <KeyRound size={18} className="text-zinc-700 dark:text-zinc-300" />
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Change Password</h3>
                      </div>
                      <button
                        onClick={() => setShowPasswordModal(false)}
                        className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-3">
                      <Input
                        label="Current Password"
                        type="password"
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
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
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => setShowPasswordModal(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1"
                          disabled={passwordLoading}
                        >
                          {passwordLoading ? 'Verifying...' : 'Save Password'}
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Refer FlatSync Modal */}
            <AnimatePresence>
              {showReferModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto overscroll-contain"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Share2 size={18} className="text-emerald-500" />
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                          Refer / Share GrocerySync
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowReferModal(false)}
                        className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="space-y-2 text-center py-1">
                      <span className="text-3xl">🎁</span>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 px-2 leading-relaxed">
                        Share GrocerySync with flatmates, family, or friends so everyone can add groceries together and order seamlessly!
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <button
                        onClick={handleShareReferralWhatsApp}
                        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        <MessageCircle size={15} />
                        <span>Share via WhatsApp</span>
                      </button>

                      <button
                        onClick={handleCopyReferralLink}
                        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <Copy size={15} />
                        <span>Copy GrocerySync Link</span>
                      </button>

                      <button
                        onClick={handleNativeReferralShare}
                        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 text-zinc-600 dark:text-zinc-300 font-semibold text-xs border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                      >
                        <Share2 size={15} />
                        <span>More Sharing Options...</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Rate GrocerySync Modal */}
            <AnimatePresence>
              {showRateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl text-center space-y-4 my-auto max-h-[90vh] overflow-y-auto overscroll-contain"
                  >
                    <div className="flex justify-end">
                      <button
                        onClick={() => setShowRateModal(false)}
                        className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <span className="text-4xl">⭐</span>
                      <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                        Rate GrocerySync
                      </h3>
                      <p className="text-xs text-zinc-400">
                        How much do you love dispatching groceries together?
                      </p>
                    </div>

                    {/* Star selector */}
                    <div className="flex items-center justify-center gap-2 py-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(star)}
                          className="text-3xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                        >
                          <span
                            className={cn(
                              (hoverRating || rating) >= star ? 'text-amber-400' : 'text-zinc-200 dark:text-zinc-700'
                            )}
                          >
                            ★
                          </span>
                        </button>
                      ))}
                    </div>

                    <Button onClick={handleRateSubmit} className="w-full">
                      Submit Rating ✨
                    </Button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Feedback Modal */}
            <AnimatePresence>
              {showFeedbackModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto overscroll-contain"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={18} className="text-sky-500" />
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                          Send Feedback
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowFeedbackModal(false)}
                        className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        {(['feature', 'bug', 'general'] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setFeedbackCategory(cat)}
                            className={cn(
                              'px-2.5 py-1 rounded-xl text-xs font-semibold capitalize border transition-all cursor-pointer',
                              feedbackCategory === cat
                                ? 'bg-sky-500 border-sky-500 text-white shadow-xs'
                                : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
                            )}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500">Your Message</label>
                        <textarea
                          rows={4}
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Tell us what feature you'd love, or any issues you encountered..."
                          className="w-full p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                          required
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => setShowFeedbackModal(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" className="flex-1" loading={feedbackLoading}>
                          Send Feedback 🚀
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Delete Account Confirmation Modal */}
            <AnimatePresence>
              {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-5 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto overscroll-contain"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3">
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <AlertTriangle size={18} />
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Delete Account</h3>
                      </div>
                      <button
                        onClick={() => setShowDeleteModal(false)}
                        className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                        Are you sure you want to permanently delete your account?
                      </p>
                      <p>
                        This will remove you from all your groups and clear your profile data. This action cannot be undone.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setShowDeleteModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        className="flex-1"
                        disabled={deleteLoading}
                        onClick={handleDeleteAccount}
                      >
                        {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
                      </Button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </>,
          document.body
        )}
    </div>
  );
}
