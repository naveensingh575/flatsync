/**
 * Web Notification & Push Manager
 * Delivers lockscreen, home screen, and background alerts for:
 * 1. Anyone ordering on Blinkit, Zepto, Instamart, etc.
 * 2. Anyone adding an item to the shopping list.
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted' && 'serviceWorker' in navigator) {
      // Auto-register service worker upon permission grant
      registerServiceWorker();
    }
    return result === 'granted';
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

export function areAlertsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('ordering_alerts_enabled') !== 'false';
}

export function setAlertsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ordering_alerts_enabled', enabled ? 'true' : 'false');
}

/**
 * Register Service Worker for PWA & Background Push
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.warn('Service worker registration notice:', err);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribes the current device to Web Push and records subscription in Supabase
 */
export async function subscribeUserToPush(userId?: string, flatId?: string): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !isNotificationSupported() ||
    Notification.permission !== 'granted'
  ) {
    return false;
  }

  try {
    const registration = await registerServiceWorker();
    if (!registration) return false;

    await navigator.serviceWorker.ready;

    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      'BHhD9fmr2ihIdXssKRr0JduCLv0FS0ykaQMfVAdmpZd-6GOBCiyz9MLAE_a2wj5HH8Fu960Kvb-MwfA3NU1Pw4A';

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as BufferSource,
      });
    }

    if (subscription) {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userId,
          flatId,
        }),
      });
      return true;
    }
  } catch (err) {
    console.warn('Failed to subscribe user to Web Push:', err);
  }

  return false;
}

/**
 * Triggers an ordering notification to all flat members (Local + Web Push to closed devices)
 */
export function sendOrderingAlertNotification(
  buyerName: string,
  platform: string,
  flatId?: string,
  senderId?: string
): void {
  if (!areAlertsEnabled()) return;

  const title = `⚡ ${buyerName} is ordering on ${platform.toUpperCase()}!`;
  const body = 'Need anything? Tap to add your items before checkout.';
  const url = flatId ? `/flat/${flatId}` : '/';

  // 1. Show local system notification if permission is active
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      const options: NotificationOptions = {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: `order-${platform}-${Date.now()}`,
        data: { url },
      };

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    } catch (err) {
      console.warn('Failed to display local ordering notification:', err);
    }
  }

  // 2. Dispatch Web Push to reach devices when app is completely closed or locked
  if (flatId) {
    fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flatId,
        senderId,
        title,
        body,
        url,
        tag: `order-${platform}`,
      }),
    }).catch((err) => console.warn('Web push ordering dispatch notice:', err));
  }
}

/**
 * Triggers an item added notification to all flat members (Local + Web Push to closed devices)
 */
export function sendItemAddedNotification(
  requesterName: string,
  itemName: string,
  quantity?: string | null,
  flatId?: string,
  senderId?: string
): void {
  if (!areAlertsEnabled()) return;

  const qtyText = quantity ? ` (${quantity})` : '';
  const title = `🛒 ${requesterName} added to the list`;
  const body = `"${itemName}"${qtyText} was just added.`;
  const url = flatId ? `/flat/${flatId}` : '/';

  // 1. Show local system notification if permission is active
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      const options: NotificationOptions = {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: `item-added-${Date.now()}`,
        data: { url },
      };

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    } catch (err) {
      console.warn('Failed to display local item added notification:', err);
    }
  }

  // 2. Dispatch Web Push to reach devices when app is completely closed or locked
  if (flatId) {
    fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flatId,
        senderId,
        title,
        body,
        url,
        tag: `item-added-${itemName}`,
      }),
    }).catch((err) => console.warn('Web push item dispatch notice:', err));
  }
}
