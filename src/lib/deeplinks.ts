/** Android package name of the Assignmate app (used for App Links). */
export const ANDROID_PACKAGE_NAME = "app.assignmateai.in";

/** Domains that the native app claims via Android App Links. */
export const APP_LINK_HOSTS = ["assignmateai.in", "www.assignmateai.in"];

const SESSION_KEY = "assignmate:app-link-attempted";

function isAndroidBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua) && !/wv\)/i.test(ua);
}

/**
 * On an Android mobile browser, try to hand the current URL to the installed
 * app once per session. If the app isn't installed the browser simply stays on
 * the page (the intent carries a fallback URL back to the web).
 */
export function tryOpenInAndroidApp() {
  if (typeof window === "undefined") return;
  if (document.documentElement.classList.contains("is-native")) return;
  if (!isAndroidBrowser()) return;
  if (!APP_LINK_HOSTS.includes(window.location.hostname)) return;

  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    return;
  }

  const url = window.location.href;
  const intent =
    `intent://${window.location.host}${window.location.pathname}${window.location.search}` +
    `#Intent;scheme=https;package=${ANDROID_PACKAGE_NAME};` +
    `S.browser_fallback_url=${encodeURIComponent(url)};end`;

  window.location.href = intent;
}
