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
import { reportLovableError } from "../lib/lovable-error-reporting";
import { PlanFeaturesProvider } from "@/lib/use-plan-features";
import { useSiteSettings, platformName, supportEmail, websiteUrl } from "@/hooks/use-site-settings";



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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Assignmate — AI-powered assignment workspace for students" },
      { name: "description", content: "AI-powered assignment workspace for students." },
      { property: "og:title", content: "Assignmate — AI assignment workspace" },
      { property: "og:description", content: "AI-powered assignment workspace for students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
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

  useEffect(() => {
    const theme = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (theme === "light") document.documentElement.classList.add("light");
    else document.documentElement.classList.remove("light");
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
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
        <div className="h-12 w-12 mx-auto rounded-xl gradient-bg grid place-items-center glow mb-4">
          <span className="text-white text-xl">⚙️</span>
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


function SiteHeadSync() {
  const site = useSiteSettings();

  useEffect(() => {
    if (typeof document === "undefined" || !site) return;
    const name = site.general.platform_name || "Assignmate";
    const tagline = site.general.tagline || "AI-powered assignment workspace for students.";
    document.title = `${name} — ${tagline}`;
    if (site.branding.favicon_url) {
      let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = site.branding.favicon_url;
    }
  }, [site]);
  return null;
}

