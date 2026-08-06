import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { completeOAuthRedirect } from "@/lib/oauth-callback";

import { reportLovableError } from "../lib/lovable-error-reporting";
import { PlanFeaturesProvider } from "@/lib/use-plan-features";
import { useNativeShell } from "@/lib/native-shell";
import { useSiteSettings, platformName, supportEmail, websiteUrl } from "@/hooks/use-site-settings";
import { BrandLogo } from "@/components/brand-logo";



function NotFoundComponent() {
  const site = useSiteSettings();
  const name = platformName(site);
  const email = supportEmail(site);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass rounded-2xl p-10 max-w-md text-center">
        <h1 className="text-7xl font-bold gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page drifted off. Head back to {name}.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          <a href="/" className="inline-flex rounded-lg gradient-bg px-5 py-2.5 text-sm font-medium text-white glow">
            Go home
          </a>
          {email && (
            <a href={`mailto:${email}`} className="inline-flex rounded-lg glass px-5 py-2.5 text-sm font-medium">
              Contact support
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const site = useSiteSettings();
  const email = supportEmail(site);
  useEffect(() => { reportLovableError(error, { boundary: "root" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass rounded-2xl p-8 max-w-md text-center">
        <h1 className="text-xl font-semibold">Something broke</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-lg gradient-bg px-5 py-2.5 text-sm font-medium text-white"
          >
            Try again
          </button>
          {email && (
            <a href={`mailto:${email}`} className="rounded-lg glass px-5 py-2.5 text-sm font-medium">
              Contact support
            </a>
          )}
        </div>
      </div>
    </div>
  );
}


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0b0b16" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:site_name", content: "Assignmate" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useNativeShell();



  useEffect(() => {
    const theme = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (theme === "light") document.documentElement.classList.add("light");
    else document.documentElement.classList.remove("light");
  }, []);

  // Full-page OAuth return: the broker sends tokens back on the URL and the
  // app must install the session before anything reads it.
  useEffect(() => {
    let cancelled = false;
    completeOAuthRedirect()
      .then((res) => {
        if (cancelled) return;
        if (res.kind !== "session") return;
        console.info("[oauth-callback] navigating to", res.redirectTo);
        router.navigate({ to: res.redirectTo, replace: true });
      })
      .catch((e) => console.error("[oauth-callback] failed", e));
    return () => {
      cancelled = true;
    };
  }, [router]);


  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      console.info("[auth] onAuthStateChange:", event);
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();

  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <PlanFeaturesProvider>
        <SiteHeadSync />
        
        <MaintenanceGate>
          <Outlet />
        </MaintenanceGate>
        <Toaster position="top-right" />
      </PlanFeaturesProvider>
    </QueryClientProvider>
  );
}


function MaintenanceGate({ children }: { children: ReactNode }) {
  const site = useSiteSettings();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/auth");
  if (!site?.general.maintenance_mode || isAdmin) return <>{children}</>;
  const name = platformName(site);
  const email = supportEmail(site);
  const website = websiteUrl(site);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass rounded-2xl p-10 max-w-lg text-center">
        <div className="flex justify-center mb-4">
          <BrandLogo size="h-12" imgMaxWidth="max-w-[180px]" showName={false} />
        </div>
        <h1 className="text-2xl font-display font-bold">{name} is under maintenance</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We're making improvements and will be back shortly. Thanks for your patience.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {email && (
            <a href={`mailto:${email}`} className="rounded-lg gradient-bg text-white px-5 py-2.5 text-sm font-medium glow">
              Contact support
            </a>
          )}
          {website && (
            <a href={website} target="_blank" rel="noreferrer" className="rounded-lg glass px-5 py-2.5 text-sm font-medium">
              Visit our website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}


function setMeta(selector: string, attr: "content" | "href", value: string, create: () => HTMLElement) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) { el = create(); document.head.appendChild(el); }
  el.setAttribute(attr, value);
}

function SiteHeadSync() {
  const site = useSiteSettings();

  useEffect(() => {
    if (typeof document === "undefined" || !site) return;
    const name = site.general.platform_name || "Assignmate";
    const tagline = site.general.tagline || "AI-powered assignment workspace for students.";
    document.title = `${name} — ${tagline}`;

    // Favicon — the static /favicon.* files (built from the uploaded brand mark)
    // are the default. Only override at runtime when an admin favicon is set.
    const rawFavicon = site.branding.favicon_url?.trim();
    if (rawFavicon) {
      const bust = `${rawFavicon}${rawFavicon.includes("?") ? "&" : "?"}v=${encodeURIComponent(rawFavicon).length}`;
      document.head
        .querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
        .forEach((n) => n.parentNode?.removeChild(n));
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = bust;
      // Type hint helps some browsers pick the right decoder.
      const ext = rawFavicon.split("?")[0].split(".").pop()?.toLowerCase();
      if (ext === "svg") link.type = "image/svg+xml";
      else if (ext === "png") link.type = "image/png";
      else if (ext === "webp") link.type = "image/webp";
      else if (ext === "ico") link.type = "image/x-icon";
      document.head.appendChild(link);
      const apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      apple.href = bust;
      document.head.appendChild(apple);
    }


    // Open Graph / Twitter image
    if (site.branding.og_image_url) {
      setMeta('meta[property="og:image"]', "content", site.branding.og_image_url, () => {
        const m = document.createElement("meta"); m.setAttribute("property", "og:image"); return m;
      });
      setMeta('meta[name="twitter:image"]', "content", site.branding.og_image_url, () => {
        const m = document.createElement("meta"); m.setAttribute("name", "twitter:image"); return m;
      });
    }

    // Description / OG title from tagline+name
    setMeta('meta[name="description"]', "content", tagline, () => {
      const m = document.createElement("meta"); m.setAttribute("name", "description"); return m;
    });
    setMeta('meta[property="og:title"]', "content", `${name} — ${tagline}`, () => {
      const m = document.createElement("meta"); m.setAttribute("property", "og:title"); return m;
    });
    setMeta('meta[property="og:description"]', "content", tagline, () => {
      const m = document.createElement("meta"); m.setAttribute("property", "og:description"); return m;
    });

    // Brand colors — override CSS variables that Tailwind theme maps to.
    const root = document.documentElement;
    const primary = site.branding.primary_color?.trim();
    const accent = site.branding.accent_color?.trim();
    if (primary) {
      root.style.setProperty("--primary", primary);
      root.style.setProperty("--ring", primary);
      root.style.setProperty("--brand-purple", primary);
      root.style.setProperty(
        "--gradient-primary",
        `linear-gradient(135deg, ${primary}, ${accent || primary})`,
      );
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--brand-purple");
      root.style.removeProperty("--gradient-primary");
    }
    if (accent) {
      root.style.setProperty("--accent", accent);
      root.style.setProperty("--brand-blue", accent);
    } else {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--brand-blue");
    }

    // Brand font — inject a Google Fonts stylesheet and override --font-sans/--font-display.
    const font = site.branding.brand_font?.trim();
    const FONT_LINK_ID = "brand-font-link";
    let fontLink = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
    if (font && font.toLowerCase() !== "inter") {
      const family = font.replace(/\s+/g, "+");
      const href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap`;
      if (!fontLink) {
        fontLink = document.createElement("link");
        fontLink.id = FONT_LINK_ID;
        fontLink.rel = "stylesheet";
        document.head.appendChild(fontLink);
      }
      if (fontLink.href !== href) fontLink.href = href;
      const stack = `"${font}", "Inter", ui-sans-serif, system-ui, sans-serif`;
      root.style.setProperty("--font-sans", stack);
      root.style.setProperty("--font-display", stack);
      document.body.style.fontFamily = stack;
    } else {
      fontLink?.remove();
      root.style.removeProperty("--font-sans");
      root.style.removeProperty("--font-display");
      document.body.style.fontFamily = "";
    }
  }, [site]);
  return null;
}


