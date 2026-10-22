import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ProfileFallbackPage() {
  let target = '/login';

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // 1. Check group_members junction table
      const { data: memberRow } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (memberRow?.group_id) {
        target = `/flat/${memberRow.group_id}/profile`;
      } else {
        // 2. Fallback to legacy profiles.flat_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('flat_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.flat_id) {
          target = `/flat/${profile.flat_id}/profile`;
        } else {
          target = '/onboarding';
        }
      }
    }
  } catch {
    target = '/login';
  }

  redirect(target);
}
