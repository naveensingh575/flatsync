import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// In-memory fallback cache for push subscriptions if the DB table isn't created yet
declare global {
  // eslint-disable-next-line no-var
  var __pushSubscriptionsCache: Map<string, any[]> | undefined;
}

if (!globalThis.__pushSubscriptionsCache) {
  globalThis.__pushSubscriptionsCache = new Map();
}

export async function POST(request: NextRequest) {
  try {
    const { subscription, userId, flatId } = await request.json();

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid push subscription' }, { status: 400 });
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    // 1. Store in global server cache for immediate availability
    if (flatId) {
      const existing = globalThis.__pushSubscriptionsCache?.get(flatId) || [];
      const filtered = existing.filter((s) => s.endpoint !== endpoint);
      filtered.push({
        userId,
        flatId,
        endpoint,
        p256dh,
        auth,
        updatedAt: new Date().toISOString(),
      });
      globalThis.__pushSubscriptionsCache?.set(flatId, filtered);
    }

    // 2. Persist to Supabase push_subscriptions table
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      try {
        await supabase.from('push_subscriptions').upsert(
          {
            user_id: userId || null,
            flat_id: flatId || null,
            endpoint,
            p256dh,
            auth,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'endpoint' }
        );
      } catch (dbErr) {
        console.warn('Database push_subscriptions upsert notice:', dbErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Push subscription save error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save subscription' }, { status: 500 });
  }
}
