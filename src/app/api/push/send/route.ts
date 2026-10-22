import { NextResponse, type NextRequest } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BHhD9fmr2ihIdXssKRr0JduCLv0FS0ykaQMfVAdmpZd-6GOBCiyz9MLAE_a2wj5HH8Fu960Kvb-MwfA3NU1Pw4A';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'XM27KosZTTTqqV3G0PTG4aJS8VxatEAdqt6xD-kESpU';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:navisingh2100@gmail.com';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  console.warn('VAPID setup warning:', e);
}

export async function POST(request: NextRequest) {
  try {
    const { flatId, senderId, title, body, url = '/', tag = 'flatsync-alert' } = await request.json();

    if (!flatId || !title) {
      return NextResponse.json({ error: 'Missing flatId or title' }, { status: 400 });
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
      tag,
    });

    const targetSubscriptions: any[] = [];

    // 1. Check in-memory global cache
    if (globalThis.__pushSubscriptionsCache?.has(flatId)) {
      const cached = globalThis.__pushSubscriptionsCache.get(flatId) || [];
      for (const sub of cached) {
        if (!senderId || sub.userId !== senderId) {
          targetSubscriptions.push({
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          });
        }
      }
    }

    // 2. Query Supabase push_subscriptions table
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      try {
        let query = supabase.from('push_subscriptions').select('*').eq('flat_id', flatId);
        if (senderId) {
          query = query.neq('user_id', senderId);
        }
        const { data: dbSubs } = await query;
        if (dbSubs && dbSubs.length > 0) {
          for (const sub of dbSubs) {
            // Avoid duplicates
            if (!targetSubscriptions.some((s) => s.endpoint === sub.endpoint)) {
              targetSubscriptions.push({
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              });
            }
          }
        }
      } catch (dbErr) {
        console.warn('Database push_subscriptions query notice:', dbErr);
      }
    }

    if (targetSubscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No active push subscriptions found' });
    }

    // 3. Dispatch web push to all matching subscriptions
    let sentCount = 0;
    const sendPromises = targetSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
        sentCount++;
      } catch (pushErr: any) {
        // If expired or unsubscribed (404 or 410 Gone)
        if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
          console.log('Expired subscription removed:', sub.endpoint);
        } else {
          console.warn('Web push dispatch warning:', pushErr.message);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    return NextResponse.json({ success: true, sent: sentCount });
  } catch (err: any) {
    console.error('Push dispatch error:', err);
    return NextResponse.json({ error: err.message || 'Failed to dispatch push' }, { status: 500 });
  }
}
