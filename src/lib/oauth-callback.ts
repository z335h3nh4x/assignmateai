import { supabase } from "@/integrations/supabase/client";

/**
 * Completes the full-page OAuth redirect flow.
 *
 * `lovable.auth.signInWithOAuth` uses a popup + web_message when the app runs
 * inside the editor iframe (the wrapper calls `setSession` itself there). On a
 * normal browser tab it instead does `window.location.href = broker`, so the
 * page unloads *before* the wrapper can exchange anything. The broker then
 * returns to `redirect_uri` with the tokens on the URL — and it is the app's
 * job to read them and install the session. Without this step the user simply
 * lands back on the homepage, unauthenticated.
 */

const REDIRECT_KEY = "assignmate:post-auth-redirect";
const LOG = "[oauth-callback]";

export function rememberPostAuthRedirect(path: string) {
  try {
    if (path.startsWith("/") && !path.startsWith("//")) {
      sessionStorage.setItem(REDIRECT_KEY, path);
    }
  } catch {
    /* storage unavailable */
  }
}

function takePostAuthRedirect(): string | null {
  try {
    const v = sessionStorage.getItem(REDIRECT_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
    return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
  } catch {
    return null;
  }
}

type UrlTokens = {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

function readTokensFromUrl(): { tokens: UrlTokens; from: "hash" | "query" | null } {
  if (typeof window === "undefined") return { tokens: {}, from: null };

  const pick = (params: URLSearchParams): UrlTokens => ({
    access_token: params.get("access_token") ?? undefined,
    refresh_token: params.get("refresh_token") ?? undefined,
    error: params.get("error") ?? undefined,
    error_description: params.get("error_description") ?? undefined,
  });

  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  if (hash) {
    const t = pick(new URLSearchParams(hash));
    if (t.access_token || t.error) return { tokens: t, from: "hash" };
  }

  const t = pick(new URLSearchParams(window.location.search));
  if (t.access_token || t.error) return { tokens: t, from: "query" };

  return { tokens: {}, from: null };
}

function stripAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  ["access_token", "refresh_token", "expires_in", "expires_at", "token_type", "provider_token", "state", "error", "error_description", "error_code"].forEach(
    (k) => url.searchParams.delete(k),
  );
  if (url.hash.includes("access_token") || url.hash.includes("error")) url.hash = "";
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

/**
 * Returns the path the app should navigate to once the session is installed,
 * or `null` when this page load is not an OAuth return.
 */
export async function completeOAuthRedirect(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const { tokens, from } = readTokensFromUrl();
  if (!from) return null;

  if (tokens.error || !tokens.access_token || !tokens.refresh_token) {
    console.error(`${LOG} OAuth return had no usable tokens`, {
      from,
      error: tokens.error,
      description: tokens.error_description,
    });
    stripAuthParamsFromUrl();
    return null;
  }

  console.info(`${LOG} tokens found on ${from} — installing session`);
  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  stripAuthParamsFromUrl();

  if (error || !data.session) {
    console.error(`${LOG} setSession failed`, error);
    return null;
  }

  console.info(`${LOG} session installed for`, data.session.user.email);
  return takePostAuthRedirect() ?? "/dashboard";
}
