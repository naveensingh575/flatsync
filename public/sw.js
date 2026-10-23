// GrocerySync Service Worker with Offline PWA Caching & Push Notifications
const CACHE_NAME = 'grocerysync-cache-v3';

// Core routes & static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/list',
  '/settings',
  '/profile',
  '/groups',
  '/history',
  '/onboarding',
  '/login',
  '/icon.svg',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache core shell pages
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: 'no-cache' })
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch((err) => {
              console.warn('[SW] Pre-cache skip for:', url, err);
            })
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: timeout a promise (for fast network fallback on weak internet)
function fetchWithTimeout(request, timeoutMs = 2800) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Network request timed out'));
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests and http/https schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 1. Navigation requests (HTML pages: /settings, /list, /profile, etc.)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(request, 2800)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Weak or offline connection: serve from cache immediately!
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          // If exact route not found in cache, match pathname
          const pathnameMatch = await cache.match(url.pathname);
          if (pathnameMatch) {
            return pathnameMatch;
          }

          // Specific route fallbacks
          if (url.pathname.includes('/settings')) {
            const settingsPage = await cache.match('/settings');
            if (settingsPage) return settingsPage;
          }
          if (url.pathname.includes('/profile')) {
            const profilePage = await cache.match('/profile');
            if (profilePage) return profilePage;
          }
          if (url.pathname.includes('/groups')) {
            const groupsPage = await cache.match('/groups');
            if (groupsPage) return groupsPage;
          }

          // General fallback to list or root app shell
          const listFallback = await cache.match('/list');
          if (listFallback) return listFallback;

          const rootFallback = await cache.match('/');
          if (rootFallback) return rootFallback;

          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>GrocerySync — Offline</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #09090b; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
                .card { max-width: 360px; padding: 24px; background: #18181b; border: 1px solid #27272a; border-radius: 20px; }
                .btn { display: inline-block; margin-top: 16px; padding: 10px 20px; background: #10b981; color: #fff; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="card">
                <div style="font-size: 40px; margin-bottom: 12px;">🛒</div>
                <h2 style="margin: 0 0 8px 0; font-size: 20px;">You are currently offline</h2>
                <p style="margin: 0; color: #a1a1aa; font-size: 13px;">Please reconnect to internet or open your cached grocery list.</p>
                <a href="/list" class="btn">Open Grocery List</a>
              </div>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 2. Next.js Static chunks, CSS, JS, fonts, images (_next/static, etc.)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Stale-while-revalidate: return cached, update in background
          fetch(request)
            .then((fresh) => {
              if (fresh && fresh.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, fresh));
              }
            })
            .catch(() => {});
          return cached;
        }

        // Not in cache: fetch and cache
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. API or Supabase requests: try network, gracefully fail without crash
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ offline: true, error: 'Offline mode active' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
  }
});

// Push notification event (triggered when app is closed / phone locked)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'GrocerySync Alert 🛒',
    body: 'New activity in your grocery list',
    url: '/list',
    tag: 'grocerysync-alert',
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload.body = event.data.text();
    }
  }

  const title = payload.title || 'GrocerySync Alert 🛒';
  const options = {
    body: payload.body || 'New activity in your group',
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [200, 100, 200],
    tag: payload.tag || 'grocerysync-notification',
    renotify: true,
    data: {
      url: payload.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event (opens GrocerySync to the target list)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
