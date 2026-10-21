'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { Profile } from '@/types/app.types';

export function useAuth() {
  const supabase = createClient();
  const { profile, setProfile } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    // 1. Immediately load session on mount/refresh
    async function loadInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          const resolvedName =
            userProfile?.name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'User';

          const loadedProfile: Profile = {
            id: session.user.id,
            name: resolvedName,
            avatar_url: userProfile?.avatar_url || null,
            flat_id: userProfile?.flat_id || null,
            joined_at: userProfile?.joined_at || new Date().toISOString(),
          };

          setProfile(loadedProfile);

          // If profiles table was missing the name, backfill it now
          if (!userProfile?.name && resolvedName !== 'User') {
            await supabase.from('profiles').upsert(loadedProfile);
          }
        }
      } catch (err) {
        console.error('Error loading session:', err);
      }
    }

    loadInitialSession();

    // 2. Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        const resolvedName =
          userProfile?.name ||
          session.user.user_metadata?.name ||
          session.user.email?.split('@')[0] ||
          'User';

        setProfile({
          id: session.user.id,
          name: resolvedName,
          avatar_url: userProfile?.avatar_url || null,
          flat_id: userProfile?.flat_id || null,
          joined_at: userProfile?.joined_at || new Date().toISOString(),
        });
      } else {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [setProfile]);

  async function signIn(email: string, password: string, explicitCode?: string) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    let targetFlatId: string | null = null;

    if (authData.user) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      const resolvedName =
        userProfile?.name ||
        authData.user.user_metadata?.name ||
        authData.user.email?.split('@')[0] ||
        'User';

      setProfile({
        id: authData.user.id,
        name: resolvedName,
        avatar_url: userProfile?.avatar_url || null,
        flat_id: userProfile?.flat_id || null,
        joined_at: userProfile?.joined_at || new Date().toISOString(),
      });

      // 1. Check if user already has groups in group_members or profile
      try {
        const { data: memberRows } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', authData.user.id)
          .limit(1);

        if (memberRows && memberRows.length > 0 && memberRows[0].group_id) {
          targetFlatId = memberRows[0].group_id;
        } else if (userProfile?.flat_id) {
          targetFlatId = userProfile.flat_id;
        }
      } catch (err) {
        // Fallback to profile flat_id
        if (userProfile?.flat_id) {
          targetFlatId = userProfile.flat_id;
        }
      }
    }

    // 2. Check for pending group code (from referral or invite link)
    let pendingCode = explicitCode;
    if (!pendingCode && typeof window !== 'undefined') {
      pendingCode = localStorage.getItem('flatsync_pending_code') || undefined;
      if (pendingCode) {
        localStorage.removeItem('flatsync_pending_code');
      }
    }

    if (pendingCode) {
      router.push(`/onboarding?code=${encodeURIComponent(pendingCode.trim().toUpperCase())}`);
      return;
    }

    // 3. If user already belongs to at least one group, go directly to their flat
    if (targetFlatId) {
      router.push(`/flat/${targetFlatId}`);
      return;
    }

    // 4. Otherwise, only new users without any group go to onboarding
    router.push('/onboarding');
  }

  async function signUp(email: string, password: string, name: string, pendingCode?: string) {
    const trimmedName = name.trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: trimmedName },
      },
    });
    if (error) throw error;

    if (data.user) {
      const newProfile: Profile = {
        id: data.user.id,
        name: trimmedName,
        avatar_url: null,
        flat_id: null,
        joined_at: new Date().toISOString(),
      };

      await supabase.from('profiles').upsert(newProfile);
    }

    // Ensure session is cleanly signed out so user signs in with credentials
    await supabase.auth.signOut();
    setProfile(null);

    // Preserve pending code if provided
    let codeParam = pendingCode;
    if (!codeParam && typeof window !== 'undefined') {
      codeParam = localStorage.getItem('flatsync_pending_code') || undefined;
    }

    const codeQuery = codeParam ? `&code=${encodeURIComponent(codeParam.trim().toUpperCase())}` : '';
    router.push(`/login?email=${encodeURIComponent(email)}&registered=true${codeQuery}`);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    router.push('/login');
  }

  return { profile, signIn, signUp, signOut };
}
