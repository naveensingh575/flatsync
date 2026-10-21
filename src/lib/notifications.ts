/**
 * Web Notification helper for lockscreen and background ordering alerts
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

export function sendOrderingAlertNotification(buyerName: string, platform: string): void {
  if (!areAlertsEnabled()) return;
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  try {
    const title = `⚡ ${buyerName} is ordering on ${platform.toUpperCase()}!`;
    const options: NotificationOptions = {
      body: 'Need anything? Tap to add your items before checkout.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: `order-${platform}`,
    };

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, options);
      });
    } else {
      new Notification(title, options);
    }
  } catch (err) {
    console.error('Failed to display notification:', err);
  }
}
