'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, LogIn, ArrowLeft, Users, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { generateJoinCode, cn } from '@/lib/utils';
import { GROUP_TYPES } from '@/lib/constants';
import { GroupType } from '@/types/app.types';
import { getFriendlyErrorMessage } from '@/lib/sanitizeError';
import toast from 'react-hot-toast';

type Mode = 'choose' | 'create' | 'join';

function OnboardingContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const { profile, setProfile, userGroups, setUserGroups } = useAppStore();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('choose');
  const [groupName, setGroupName] = useState('');
  const [selectedType, setSelectedType] = useState<GroupType>('flat');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitedCode, setInvitedCode] = useState<string | null>(null);

  // Check for invite query param: ?code=AB12XY
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      const cleanCode = codeParam.trim().toUpperCase().slice(0, 6);
      setJoinCode(cleanCode);
      setInvitedCode(cleanCode);
      setMode('join');
    }
  }, [searchParams]);

  // Guard: If an existing user who already belongs to a group lands on onboarding (e.g. relogin),
  // automatically forward them to their active flat unless explicitly adding a new group or joining with a code
  useEffect(() => {
    const codeParam = searchParams.get('code');
    const isExplicitNew = searchParams.get('new') === 'true';

    if (!codeParam && !isExplicitNew && profile?.id) {
      if ((userGroups && userGroups.length > 0) || profile.flat_id || profile.group_id) {
        router.replace('/list');
      }
    }
  }, [searchParams, userGroups, profile, router]);

  const activeGroupType = GROUP_TYPES.find((g) => g.value === selectedType) || GROUP_TYPES[0];

  async function createGroup() {
    if (!groupName.trim()) { toast.error('Enter a group name'); return; }
    if (!profile?.id) { toast.error('Please log in first'); return; }
    setLoading(true);
    try {
      const code = generateJoinCode();

      // Insert directly into 'groups' table
      const { data: group, error: createErr } = await supabase
        .from('groups')
        .insert({
          name: groupName.trim(),
          join_code: code,
          group_type: selectedType,
          icon: activeGroupType.emoji,
          created_by: profile.id,
        })
        .select()
        .single();

      if (createErr || !group?.id) {
        throw createErr || new Error('Failed to create group');
      }

      // 1. Preserve previous group in group_members if present
      const userPrevGroup = profile.group_id || profile.flat_id;
      if (userPrevGroup && userPrevGroup !== group.id) {
        try {
          await supabase.from('group_members').upsert(
            { group_id: userPrevGroup, user_id: profile.id, role: 'member' },
            { onConflict: 'group_id,user_id' }
          );
        } catch (_) {}
      }

      // 2. Add creator to group_members as admin
      await supabase.from('group_members').upsert(
        { group_id: group.id, user_id: profile.id, role: 'admin' },
        { onConflict: 'group_id,user_id' }
      );

      // 3. Update profile.group_id as default
      await supabase.from('profiles').update({ group_id: group.id }).eq('id', profile.id);

      // 4. Update local app store immediately
      setUserGroups([...userGroups.filter((g) => g.id !== group.id), group]);
      setProfile({ ...profile, group_id: group.id, flat_id: group.id });

      toast.success(`${group.name} created! Code: ${code}`);
      router.push('/list');
    } catch (err: any) {
      console.error('Group creation error:', err);
      toast.error(getFriendlyErrorMessage(err, 'Unable to create group. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function joinGroup() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) { toast.error('Enter a 6-character code'); return; }
    if (!profile?.id) { toast.error('Please log in first'); return; }
    setLoading(true);
    try {
      // Query 'groups' table directly
      const { data: group, error: groupErr } = await supabase
        .from('groups')
        .select('*')
        .eq('join_code', code)
        .maybeSingle();

      if (groupErr) throw groupErr;
      if (!group) throw new Error('Invalid code. Check with group members!');

      // 1. Preserve previous group in group_members if present
      const userPrevGroup = profile.group_id || profile.flat_id;
      if (userPrevGroup && userPrevGroup !== group.id) {
        try {
          await supabase.from('group_members').upsert(
            { group_id: userPrevGroup, user_id: profile.id, role: 'member' },
            { onConflict: 'group_id,user_id' }
          );
        } catch (_) {}
      }

      // 2. Add to group_members table
      await supabase.from('group_members').upsert(
        { group_id: group.id, user_id: profile.id, role: 'member' },
        { onConflict: 'group_id,user_id' }
      );

      // 3. Update profile.group_id
      await supabase.from('profiles').update({ group_id: group.id }).eq('id', profile.id);

      // 4. Update local app store immediately
      setUserGroups([...userGroups.filter((g) => g.id !== group.id), group]);
      setProfile({ ...profile, group_id: group.id, flat_id: group.id });

      toast.success(`Joined ${group.name}! 🎉`);
      router.push('/list');
    } catch (err: any) {
      console.error('Group join error:', err);
      toast.error(getFriendlyErrorMessage(err, 'Could not find a group with this join code. Please check and try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-4 sm:space-y-5">
      {userGroups.length > 0 && (
        <button
          onClick={() => router.push('/list')}
          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer select-none active:scale-95 transition-transform"
        >
          <ArrowLeft size={14} /> Back to {userGroups[0].name}
        </button>
      )}

      {invitedCode && mode === 'join' && (
        <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
          <Users size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>You were invited to join group #{invitedCode}! Tap Join below.</span>
        </div>
      )}

      <div className="text-center space-y-1.5 sm:space-y-2">
        <div className="text-4xl sm:text-5xl">{mode === 'create' ? activeGroupType.emoji : '👥'}</div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
          {mode === 'choose' && 'Groups & Wishlists'}
          {mode === 'create' && 'Create a New Group'}
          {mode === 'join' && 'Join a Group'}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
          {mode === 'choose' && 'Organize groceries & quick-orders for flatmates, family, friends, or colleagues.'}
          {mode === 'create' && 'Pick a group category and invite members with a code.'}
          {mode === 'join' && 'Enter the 6-character code shared by your group.'}
        </p>
      </div>

      {mode === 'choose' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2.5 sm:space-y-3"
        >
          <button
            onClick={() => setMode('create')}
            className="w-full flex items-center gap-3.5 p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 transition-colors text-left shadow-xs active:scale-[0.99] cursor-pointer"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <Plus size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white">Create a Group</p>
              <p className="text-xs sm:text-sm text-zinc-400">Family, Flat, Friends, or Office</p>
            </div>
          </button>

          <button
            onClick={() => setMode('join')}
            className="w-full flex items-center gap-3.5 p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 transition-colors text-left shadow-xs active:scale-[0.99] cursor-pointer"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <KeyRound size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white">Join with Code</p>
              <p className="text-xs sm:text-sm text-zinc-400">Enter a 6-character invite code</p>
            </div>
          </button>
        </motion.div>
      )}

      {mode === 'create' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-zinc-900 rounded-3xl p-4.5 sm:p-6 shadow-xl border border-zinc-100 dark:border-zinc-800 space-y-3.5 sm:space-y-4"
        >
          <div>
            <label className="text-[11px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider">Group Type</label>
            <div className="grid grid-cols-3 gap-2 mt-1.5 sm:mt-2">
              {GROUP_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 sm:p-2.5 rounded-xl border-2 text-[11px] sm:text-xs font-medium transition-all active:scale-95 cursor-pointer',
                    selectedType === type.value
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
                  )}
                >
                  <span className="text-lg sm:text-xl">{type.emoji}</span>
                  <span className="truncate">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Group Name"
            placeholder={
              selectedType === 'flat' ? 'e.g. 404 Koramangala' :
              selectedType === 'family' ? 'e.g. Home Groceries' :
              selectedType === 'colleagues' ? 'e.g. Office Snack Stash' :
              'e.g. Goa Trip Gang'
            }
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createGroup()}
          />

          <Button className="w-full" onClick={createGroup} loading={loading}>
            <Plus size={18} /> Create {activeGroupType.label} Group
          </Button>

          <button
            onClick={() => setMode('choose')}
            className="w-full text-xs sm:text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors py-1 cursor-pointer"
          >
            ← Back
          </button>
        </motion.div>
      )}

      {mode === 'join' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 shadow-xl border border-zinc-100 dark:border-zinc-800 space-y-3.5 sm:space-y-4"
        >
          <h2 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white">Enter Join Code</h2>
          <Input
            placeholder="e.g. AB12XY"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="tracking-[0.4em] text-center font-mono text-lg uppercase"
            onKeyDown={(e) => e.key === 'Enter' && joinGroup()}
          />
          <Button className="w-full" onClick={joinGroup} loading={loading}>
            <LogIn size={18} /> Join Group
          </Button>
          <button
            onClick={() => setMode('choose')}
            className="w-full text-xs sm:text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors py-1 cursor-pointer"
          >
            ← Back
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col items-center justify-start sm:justify-center px-4 pt-10 sm:pt-12 pb-8 sm:py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Suspense fallback={<div className="text-sm text-zinc-400">Loading...</div>}>
        <OnboardingContent />
      </Suspense>
    </div>
  );
}
