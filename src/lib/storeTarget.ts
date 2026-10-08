export const APP_STORE_URL = "https://apps.apple.com/kr/app/pawstamp/id6778623989";
export const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.pawstamp.mobile";

export type StoreTarget = "ios" | "android" | "desktop";

/** User-Agent 로 기기 판별. iPadOS(데스크톱 UA + 터치)도 iOS 로 본다. */
export function detectStoreTarget(): StoreTarget {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  return "desktop";
}
