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
        // 2. Check profile group_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('group_id, flat_id')
          .eq('id', user.id)
          .maybeSingle();

        const resolvedGroupId = profile?.group_id || profile?.flat_id;
        if (resolvedGroupId) {
          target = `/flat/${resolvedGroupId}/profile`;
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
