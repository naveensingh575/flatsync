import { Platform } from '@/types/app.types';

export interface QuickCommerceAppInfo {
  id: Platform;
  name: string;
  emoji: string;
  appScheme: string;
  webFallback: string;
  badgeBg: string;
  badgeText: string;
  bgClass: string;
  borderClass: string;
}

export const QUICK_COMMERCE_APPS: Record<Exclude<Platform, 'other'>, QuickCommerceAppInfo> = {
  blinkit: {
    id: 'blinkit',
    name: 'Blinkit',
    emoji: '⚡',
    appScheme: 'blinkit://',
    webFallback: 'https://blinkit.com',
    badgeBg: 'bg-yellow-400',
    badgeText: 'text-yellow-950 font-bold',
    bgClass: 'bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-bold',
    borderClass: 'border-yellow-400',
  },
  zepto: {
    id: 'zepto',
    name: 'Zepto',
    emoji: '🚀',
    appScheme: 'zeptonow://',
    webFallback: 'https://www.zeptonow.com',
    badgeBg: 'bg-purple-600',
    badgeText: 'text-white font-bold',
    bgClass: 'bg-purple-600 hover:bg-purple-700 text-white font-bold',
    borderClass: 'border-purple-500',
  },
  instamart: {
    id: 'instamart',
    name: 'Instamart',
    emoji: '🛒',
    appScheme: 'swiggy://instamart',
    webFallback: 'https://www.swiggy.com/instamart',
    badgeBg: 'bg-orange-500',
    badgeText: 'text-white font-bold',
    bgClass: 'bg-orange-500 hover:bg-orange-600 text-white font-bold',
    borderClass: 'border-orange-500',
  },
};

/**
 * Checks if current user environment is mobile (iOS/Android)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * 1-Tap App Launcher:
 * Uses official Universal / App Links (HTTPS) that iOS and Android automatically route
 * directly into the native app if installed, or smoothly open the mobile web store.
 * Synchronous execution inside user gesture prevents browser popup blocking.
 */
export function openQuickCommerceApp(platform: Platform): void {
  if (platform === 'other') {
    window.open('https://www.google.com/search?q=grocery+delivery', '_blank', 'noopener,noreferrer');
    return;
  }

  const app = QUICK_COMMERCE_APPS[platform];
  if (!app) return;

  const targetUrl = app.webFallback;
  try {
    const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = targetUrl;
    }
  } catch (_) {
    window.location.href = targetUrl;
  }
}

/**
 * 1-Tap Item Search Universal Deep-Link:
 * Opens Blinkit, Zepto, or Instamart directly into the search results for the given item.
 * - Blinkit: https://blinkit.com/s/?q=...
 * - Zepto: https://www.zeptonow.com/search?q=... (verified official ?q= query parameter)
 * - Instamart: https://www.swiggy.com/instamart/search?query=...
 * 
 * Works synchronously on mobile iOS & Android without triggering popup blocker.
 */
export function searchItemInQuickCommerceApp(platform: Platform, itemName: string, quantity?: string | null): void {
  const cleanName = itemName.trim();
  const queryParam = encodeURIComponent(cleanName);

  let targetUrl = '';
  if (platform === 'blinkit') {
    targetUrl = `https://blinkit.com/s/?q=${queryParam}`;
  } else if (platform === 'zepto') {
    targetUrl = `https://www.zeptonow.com/search?q=${queryParam}`;
  } else if (platform === 'instamart') {
    targetUrl = `https://www.swiggy.com/instamart/search?query=${queryParam}`;
  } else {
    targetUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanName + ' buy online')}`;
  }

  try {
    const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = targetUrl;
    }
  } catch (_) {
    window.location.href = targetUrl;
  }
}
