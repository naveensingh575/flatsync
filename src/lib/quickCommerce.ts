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
 * Attempts native app deep-link scheme on mobile, falling back to web store.
 * Opens web store directly on desktop.
 */
export function openQuickCommerceApp(platform: Platform): void {
  if (platform === 'other') {
    window.open('https://www.google.com/search?q=grocery+delivery', '_blank');
    return;
  }

  const app = QUICK_COMMERCE_APPS[platform];
  if (!app) return;

  if (isMobileDevice()) {
    const start = Date.now();
    // Attempt deep link
    window.location.href = app.appScheme;

    // Fallback to web if app isn't installed after 1.5 seconds
    setTimeout(() => {
      const elapsed = Date.now() - start;
      if (document.hidden || elapsed > 2500) {
        // App opened successfully
        return;
      }
      window.open(app.webFallback, '_blank');
    }, 1500);
  } else {
    // Desktop: Open web URL directly
    window.open(app.webFallback, '_blank');
  }
}

/**
 * 1-Tap Item Search Deep-Link:
 * Directly opens the quick-commerce app (or web store) into the search view for the specific grocery item.
 * On mobile, attempts app deep-link first and falls back to the search page.
 */
export function searchItemInQuickCommerceApp(platform: Platform, itemName: string, quantity?: string | null): void {
  const cleanName = itemName.trim();
  const queryParam = encodeURIComponent(cleanName);

  if (platform === 'blinkit') {
    const webUrl = `https://blinkit.com/s/?q=${queryParam}`;
    const appUri = `blinkit://search?q=${queryParam}`;
    if (isMobileDevice()) {
      window.location.href = appUri;
      setTimeout(() => {
        window.open(webUrl, '_blank');
      }, 1400);
    } else {
      window.open(webUrl, '_blank');
    }
    return;
  }

  if (platform === 'zepto') {
    const webUrl = `https://www.zeptonow.com/search?query=${queryParam}`;
    const appUri = `zeptonow://search?query=${queryParam}`;
    if (isMobileDevice()) {
      window.location.href = appUri;
      setTimeout(() => {
        window.open(webUrl, '_blank');
      }, 1400);
    } else {
      window.open(webUrl, '_blank');
    }
    return;
  }

  if (platform === 'instamart') {
    const webUrl = `https://www.swiggy.com/instamart/search?query=${queryParam}`;
    const appUri = `swiggy://instamart/search?query=${queryParam}`;
    if (isMobileDevice()) {
      window.location.href = appUri;
      setTimeout(() => {
        window.open(webUrl, '_blank');
      }, 1400);
    } else {
      window.open(webUrl, '_blank');
    }
    return;
  }

  // Fallback Google search
  window.open(`https://www.google.com/search?q=${encodeURIComponent(cleanName + ' buy online')}`, '_blank');
}
