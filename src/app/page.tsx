import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function RootPage() {
  let target = '/login';

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('flat_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.flat_id) {
        target = `/flat/${profile.flat_id}`;
      } else {
        target = '/onboarding';
      }
    }
  } catch {
    target = '/login';
  }

  redirect(target);
}
