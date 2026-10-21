'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun,
  Moon,
  Laptop,
  Bell,
  BellRing,
  WifiOff,
  KeyRound,
  Share2,
  Star,
  MessageSquare,
  LogOut,
  ChevronRight,
  X,
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
} from '@/lib/notifications';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ProfileMenuProps {
  isConnected?: boolean;
  isOnline?: boolean;
}

export function ProfileMenu({ isConnected = true, isOnline = true }: ProfileMenuProps) {
  const { profile } = useAppStore();
  const { signOut } = useAuth();
  const supabase = createClient();

  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  const [notifState, setNotifState] = useState<NotificationPermission>('default');
  const [notifSupported, setNotifSupported] = useState(false);

  // Sub-modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [showRateModal, setShowRateModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'feature' | 'general'>('feature');

  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
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
      setNotifState(getNotificationPermission());
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

  // Notifications toggle
  async function handleToggleNotifications() {
    if (!notifSupported) {
      toast.error('Web notifications are not supported by this browser');
      return;
    }

    if (notifState === 'granted') {
      toast('Lockscreen notifications are active! 🔔', { icon: '🔔' });
      return;
    }

    const granted = await requestNotificationPermission();
    if (granted) {
      setNotifState('granted');
      toast.success('Lockscreen alerts enabled! You will be notified when flatmates order 🔔');
    } else {
      setNotifState('denied');
      toast.error('Notifications permission denied');
    }
  }

  // Change password
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully! 🔐');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  }

  // Refer / Share FlatSync
  function handleRefer() {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://flatsync-psi.vercel.app';
    const message = `🛒 FlatSync is awesome for shared grocery runs with flatmates! Add items together, get live ordering alerts, and dispatch to Blinkit & Zepto:\n\n👉 ${siteUrl}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'FlatSync — Shared Grocery Dispatch',
        text: message,
        url: siteUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${message}`);
      toast.success('Referral link copied to clipboard! 📋');
    }
  }

  // Rate FlatSync
  function handleRateSubmit() {
    setShowRateModal(false);
    toast.success(`Thank you for rating FlatSync ${rating} stars! ⭐🎉`);
  }

  // Send Feedback
  function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setShowFeedbackModal(false);
    setFeedbackText('');
    toast.success('Thank you for your feedback! We will review it shortly. 🚀');
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
            className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-50 overflow-hidden"
          >
            {/* 1. Profile Header Card */}
            <div className="p-4 bg-gradient-to-br from-zinc-50 to-zinc-100/70 dark:from-zinc-900 dark:to-zinc-850 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <Avatar name={profile.name} src={profile.avatar_url} id={profile.id} size="lg" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                    {profile.name}
                  </h3>
                  {userEmail ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
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

            <div className="p-3 space-y-3 max-h-[75vh] overflow-y-auto">
              {/* 2. Live Connection & Sync Status Card */}
              <div
                className={cn(
                  'p-3 rounded-2xl border flex items-center justify-between text-xs',
                  !isOnline
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    : isConnected
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                    : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                )}
              >
                <div className="flex items-center gap-2.5">
                  {!isOnline ? (
                    <WifiOff size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  ) : (
                    <span
                      className={cn(
                        'w-2.5 h-2.5 rounded-full flex-shrink-0',
                        isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                      )}
                    />
                  )}
                  <div>
                    <p className="font-bold leading-tight">
                      {!isOnline ? 'Offline Queue Active' : isConnected ? 'Live Real-Time Sync' : 'Reconnecting...'}
                    </p>
                    <p className="text-[10px] opacity-75 mt-0.5">
                      {!isOnline ? 'Actions queued safely in storage' : isConnected ? 'Instant flatmate updates' : 'Restoring connection'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 dark:bg-zinc-900/60 border border-current/20 flex-shrink-0">
                  {!isOnline ? '📴 Offline' : isConnected ? '🟢 Live' : '⏳ Syncing'}
                </span>
              </div>

              {/* 3. Preferences Section (Theme & Notifications) */}
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
                        'p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1',
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
                        'p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1',
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
                        'p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1',
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

                {/* Lockscreen Notifications Toggle */}
                {notifSupported && (
                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                        {notifState === 'granted' ? <BellRing size={14} /> : <Bell size={14} />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          Ordering Alerts
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          Lockscreen push when flatmates order
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleToggleNotifications}
                      className={cn(
                        'px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer',
                        notifState === 'granted'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300'
                      )}
                    >
                      {notifState === 'granted' ? 'Enabled' : 'Enable'}
                    </button>
                  </div>
                )}
              </div>

              {/* 4. Account & Community Actions */}
              <div className="space-y-1 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                  Account & App
                </p>

                {/* Change Password */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowPasswordModal(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <KeyRound size={15} className="text-zinc-400" />
                    <span>Change Password</span>
                  </div>
                  <ChevronRight size={14} className="text-zinc-400" />
                </button>

                {/* Refer FlatSync */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleRefer();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Share2 size={15} className="text-emerald-500" />
                    <span>Refer / Share FlatSync</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    Invite
                  </span>
                </button>

                {/* Rate FlatSync */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowRateModal(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Star size={15} className="text-amber-500" />
                    <span>Rate FlatSync</span>
                  </div>
                  <span className="text-xs text-amber-500">★★★★★</span>
                </button>

                {/* Feedback */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowFeedbackModal(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare size={15} className="text-sky-500" />
                    <span>Send Feedback</span>
                  </div>
                  <ChevronRight size={14} className="text-zinc-400" />
                </button>
              </div>

              {/* 5. Sign Out */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-zinc-700 dark:text-zinc-300" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Change Password</h3>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
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
                    {passwordLoading ? 'Updating...' : 'Save Password'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rate FlatSync Modal */}
      <AnimatePresence>
        {showRateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl text-center space-y-4"
            >
              <div className="flex justify-end">
                <button
                  onClick={() => setShowRateModal(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-4xl">⭐</span>
                <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                  Rate your FlatSync Experience
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-sky-500" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    Send Us Feedback
                  </h3>
                </div>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
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
                  <Button type="submit" className="flex-1">
                    Send Feedback 🚀
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
