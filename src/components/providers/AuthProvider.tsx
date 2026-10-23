'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { Profile } from '@/types/app.types';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { profile, setProfile } = useAppStore();

  useEffect(() => {
    let isMounted = true;

    async function syncSessionAndProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session?.user) {
          // If we already have a profile in store for this user, keep it while revalidating
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!isMounted) return;

          const resolvedName =
            userProfile?.name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'User';

          const userGroupId = userProfile?.group_id || userProfile?.flat_id || profile?.group_id || profile?.flat_id || null;
          const resolvedProfile: Profile = {
            id: session.user.id,
            name: resolvedName,
            avatar_url: userProfile?.avatar_url || null,
            group_id: userGroupId,
            flat_id: userGroupId,
            joined_at: userProfile?.joined_at || new Date().toISOString(),
          };

          setProfile(resolvedProfile);

          // If profiles table had empty name, persist resolvedName
          if (!userProfile?.name && resolvedName !== 'User') {
            await supabase.from('profiles').upsert(resolvedProfile);
          }
        }
      } catch (err) {
        console.warn('Session sync warning:', err);
      }
    }

    // 1. Initial sync
    syncSessionAndProfile();

    // 2. Auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        setProfile(null);
        return;
      }

      if (session?.user) {
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!isMounted) return;

          const resolvedName =
            userProfile?.name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'User';

          const userGroupId = userProfile?.group_id || userProfile?.flat_id || profile?.group_id || profile?.flat_id || null;
          setProfile({
            id: session.user.id,
            name: resolvedName,
            avatar_url: userProfile?.avatar_url || null,
            group_id: userGroupId,
            flat_id: userGroupId,
            joined_at: userProfile?.joined_at || new Date().toISOString(),
          });
        } catch (_) {}
      }
    });

    // 3. Tab visibility listener (re-sync on resume/wake)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncSessionAndProfile();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setProfile, supabase]);

  return <>{children}</>;
}
