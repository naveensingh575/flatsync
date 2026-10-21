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

  async function signIn(email: string, password: string) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

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
    }

    router.push('/onboarding');
  }

  async function signUp(email: string, password: string, name: string) {
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
      setProfile(newProfile);
    }
    router.push('/onboarding');
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    router.push('/login');
  }

  return { profile, signIn, signUp, signOut };
}
