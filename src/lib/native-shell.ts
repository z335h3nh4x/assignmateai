import { useEffect } from "react";

import { APP_LINK_HOSTS, tryOpenInAndroidApp } from "@/lib/deeplinks";

/**
 * Native (Capacitor) shell integration. No-ops in the browser, so the deployed
 * web app behaves exactly as before.
 */
export function useNativeShell() {
  useEffect(() => {
    let cancelled = false;
    let removeUrlListener: (() => void) | undefined;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (cancelled || !Capacitor.isNativePlatform()) {
        // Web: offer the installed app the current deep link (no-op if absent).
        tryOpenInAndroidApp();
        return;
      }

      document.documentElement.classList.add("is-native");

      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0b0b16" });
      } catch {
        /* status bar unavailable */
      }

      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        /* splash unavailable */
      }

      // Deep links: when Android hands an https app link to the app, navigate
      // the in-app webview to that path instead of reloading the home screen.
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appUrlOpen", ({ url }: { url: string }) => {
          try {
            const target = new URL(url);
            if (!APP_LINK_HOSTS.includes(target.hostname)) return;
            const path = `${target.pathname}${target.search}${target.hash}`;
            if (path && path !== window.location.pathname + window.location.search + window.location.hash) {
              window.location.assign(path);
            }
          } catch {
            /* malformed deep link */
          }
        });
        removeUrlListener = () => {
          void handle.remove();
        };
        if (cancelled) removeUrlListener();
      } catch {
        /* app plugin unavailable */
      }
    })();

    return () => {
      cancelled = true;
      removeUrlListener?.();
    };

  }, []);
}

export function isNativeApp() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("is-native");
}
