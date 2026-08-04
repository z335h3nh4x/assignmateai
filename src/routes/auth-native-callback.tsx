import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { completeOAuthRedirect } from "@/lib/oauth-callback";
import { callbackIntentUrl } from "@/lib/native-auth";
import { isNativeApp } from "@/lib/native-shell";

export const Route = createFileRoute("/auth-native-callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Finishing sign-in — Assignmate" },
      { name: "description", content: "Completing your Assignmate sign-in and returning you to the app." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Finishing sign-in — Assignmate" },
      { property: "og:description", content: "Completing your Assignmate sign-in." },
    ],
  }),
  component: NativeAuthCallback,
});

function NativeAuthCallback() {
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Inside the app's WebView: install the session and continue.
      if (isNativeApp()) {
        const result = await completeOAuthRedirect();
        if (cancelled) return;
        if (result.kind === "session") {
          window.location.replace(result.redirectTo);
          return;
        }
        setMessage("Sign-in could not be completed. Please try again.");
        return;
      }

      // Inside Chrome / the Custom Tab: hand the tokens to the installed app.
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const params = new URLSearchParams(window.location.search);
      if (hash) {
        new URLSearchParams(hash).forEach((v, k) => params.set(k, v));
      }
      const search = params.toString() ? `?${params.toString()}` : "";

      if (/Android/i.test(navigator.userAgent)) {
        window.location.href = callbackIntentUrl(search);
        setMessage("Returning you to the Assignmate app…");
        return;
      }

      const result = await completeOAuthRedirect();
      if (cancelled) return;
      if (result.kind === "session") {
        window.location.replace(result.redirectTo);
        return;
      }
      setMessage("Sign-in could not be completed. Please try again.");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
