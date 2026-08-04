import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { LayoutDashboard, Clock, Settings, LogOut, Menu, X, Pencil } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { PromoCard } from "@/components/promo-card";
import { sendWelcomeEmailOnce } from "@/lib/welcome-email.functions";



export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { to: "/handwriting", label: "My Handwriting", shortLabel: "Writing", icon: Pencil },
  { to: "/history", label: "History", shortLabel: "History", icon: Clock },
  { to: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, to: string) {
  return pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
}

function AuthedLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const sendWelcome = useServerFn(sendWelcomeEmailOnce);

  useEffect(() => setOpen(false), [pathname]);

  // Fires once per browser session; the server side is idempotent per user.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("welcome-email-checked")) return;
    void sendWelcome({ data: undefined })
      .then((res: any) => {
        // Retry later in this session only if the check was inconclusive.
        if (res?.reason !== "not_confirmed") {
          window.sessionStorage.setItem("welcome-email-checked", "1");
        }
      })
      .catch((error) => {
        console.error("[welcome-email]", error);
      });
  }, [sendWelcome]);





  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block sticky top-0 h-screen shrink-0 w-64 p-4">
        <div className="glass rounded-2xl h-full p-4 flex flex-col">
          <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
            <BrandLogo />
          </Link>

          <nav className="mt-6 space-y-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.to);
              return (
                <Link
                  key={item.to} to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                    active ? "gradient-bg text-white" : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-2">
            <PromoCard placement="sidebar" />
            <Button variant="ghost" onClick={signOut} className="w-full justify-start text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed inset-x-0 top-0 z-40 pt-safe">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 glass px-4 py-3">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
            <BrandLogo />
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 grid h-11 w-11 place-items-center rounded-xl hover:bg-white/5"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile slide-over menu */}
      {open ? (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
          <button
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-3 top-20 pt-safe glass rounded-2xl p-3 space-y-2">
            <PromoCard placement="sidebar" />
            <Button
              variant="ghost"
              onClick={signOut}
              className="w-full justify-start h-12 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      ) : null}

      <main className="flex-1 min-w-0 p-4 pt-20 pb-28 lg:p-8 lg:pt-8 lg:pb-8">
        <Outlet />
        <div className="mt-8">
          <PromoCard placement="bottom" />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 glass border-t border-white/10 pb-safe"
        aria-label="Primary"
      >
        <ul className="grid grid-cols-4">
          {NAV.map((item) => {
            const active = isActive(pathname, item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] transition ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="truncate px-1">{item.shortLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
