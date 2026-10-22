import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next');

  // Determine production/runtime base URL
  const host = request.headers.get('host') || requestUrl.host;
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  // If host is localhost, use origin, otherwise force https in production
  const origin = host.includes('localhost') ? `${requestUrl.protocol}//${host}` : `https://${host}`;

  const response = NextResponse.redirect(new URL('/login', origin));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (code && url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.user) {
        // If this was a password recovery email link, redirect to /forgot-password in reset mode
        if (type === 'recovery' || next?.includes('forgot-password')) {
          const resetUrl = new URL('/forgot-password?mode=reset', origin);
          return NextResponse.redirect(resetUrl);
        }

        // For email signup confirmation:
        // Immediately sign out server session so user signs in cleanly with credentials without auto-fill
        await supabase.auth.signOut();

        const loginUrl = new URL('/login?verified=true', origin);
        return NextResponse.redirect(loginUrl);
      }
    } catch (e) {
      console.error('Error in auth callback exchange:', e);
    }
  }

  // Fallback redirect to /login
  return NextResponse.redirect(new URL('/login', origin));
}
