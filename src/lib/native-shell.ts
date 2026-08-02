import { useEffect } from "react";

/**
 * Native (Capacitor) shell integration. No-ops in the browser, so the deployed
 * web app behaves exactly as before.
 */
export function useNativeShell() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (cancelled || !Capacitor.isNativePlatform()) return;

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
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}

export function isNativeApp() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("is-native");
}
