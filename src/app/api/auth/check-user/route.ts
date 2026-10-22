import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    const cleanEmail = email?.trim()?.toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ exists: false, error: 'Email is required' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ exists: true });
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false },
    });

    // 1. If RPC function check_user_exists is created in Supabase (highest accuracy for auth.users)
    try {
      const { data: rpcExists, error: rpcErr } = await supabase.rpc('check_user_exists', {
        check_email: cleanEmail,
      });
      if (!rpcErr && typeof rpcExists === 'boolean') {
        return NextResponse.json({ exists: rpcExists });
      }
    } catch {
      // Continue to next check if RPC doesn't exist
    }

    // 2. If service role key is available, check admin listUsers directly
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { data } = await supabase.auth.admin.listUsers();
        const match = data?.users?.some((u) => u.email?.toLowerCase() === cleanEmail);
        return NextResponse.json({ exists: !!match });
      } catch {
        // Fallback
      }
    }

    // 3. Check profiles table if email column exists
    try {
      const { data: profileMatch, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!profileErr) {
        return NextResponse.json({ exists: !!profileMatch });
      }
    } catch {
      // Fallback
    }

    // Default to true if unable to definitively query so we don't accidentally lock out valid users
    return NextResponse.json({ exists: true });
  } catch (err: any) {
    return NextResponse.json({ exists: true });
  }
}
