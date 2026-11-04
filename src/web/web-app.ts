import { useSyncExternalStore } from 'react';

/**
 * Tarayıcı sürümüne özgü işler: service worker kaydı (çevrimdışı çalışma), kalıcı depolama isteği
 * ve yeni sürüm yüklenince sayfayı yenileme uyarısı. Masaüstü sürümde hiçbiri çalışmaz.
 */
export const isWeb = __WEB__;

let updated = false;
const listeners = new Set<() => void>();
const setUpdated = () => { updated = true; listeners.forEach((l) => l()); };

export function registerWebApp() {
  if (!isWeb) return;
  // Tarayıcı yer daralınca siteye ait verileri silebilir; kalıcı depolama bunu önler
  void navigator.storage?.persist?.().catch(() => undefined);
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) setUpdated(); });
  window.addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js').catch(() => undefined); });
}

/** Yeni sürüm arka planda yüklendi mi (sayfa yenilenince devreye girer). */
export function useWebUpdated(): boolean {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => updated);
}

export const DESKTOP_DOWNLOAD_URL = 'https://github.com/thekannex/dolap/releases/latest';
