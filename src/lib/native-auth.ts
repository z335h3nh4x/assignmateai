import { ANDROID_PACKAGE_NAME } from "@/lib/deeplinks";

/**
 * Google sign-in inside the native (Capacitor WebView) shell.
 *
 * Google refuses OAuth inside embedded WebViews ("disallowed_useragent"), so
 * the app must hand the flow to Chrome Custom Tabs and get the session back
 * through an Android App Link.
 *
 * Flow:
 *  1. App opens `<web>/auth?native_google=1` in a Custom Tab.
 *  2. That page starts the normal Google OAuth with
 *     `redirect_uri = <web>/auth-native-callback`.
 *  3. Android App Links hand that URL to the installed app, which reads the
 *     tokens, installs the session and closes the Custom Tab.
 */

export const WEB_ORIGIN = "https://assignmateai.in";
export const NATIVE_CALLBACK_PATH = "/auth-native-callback";

export function nativeCallbackUrl() {
  return `${WEB_ORIGIN}${NATIVE_CALLBACK_PATH}`;
}

export async function startNativeGoogleSignIn(next?: string) {
  const url = new URL("/auth", WEB_ORIGIN);
  url.searchParams.set("native_google", "1");
  if (next) url.searchParams.set("next", next);

  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: url.toString(), windowName: "_self" });
}

export async function closeNativeAuthBrowser() {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    /* browser plugin unavailable */
  }
}

/**
 * Builds an `intent://` URL that hands the callback (tokens included) to the
 * installed app when the Custom Tab was not intercepted by App Links.
 */
export function callbackIntentUrl(search: string) {
  const host = new URL(WEB_ORIGIN).host;
  return (
    `intent://${host}${NATIVE_CALLBACK_PATH}${search}` +
    `#Intent;scheme=https;package=${ANDROID_PACKAGE_NAME};end`
  );
}
