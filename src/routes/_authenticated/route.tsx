import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, LayoutDashboard, Clock, Settings, LogOut, Menu, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/history", label: "History", icon: Clock },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AuthedLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 h-screen z-40 w-64 shrink-0 p-4 transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="glass rounded-2xl h-full p-4 flex flex-col">
          <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
            <div className="h-8 w-8 rounded-lg gradient-bg grid place-items-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-semibold">AssignAI</span>
          </Link>
          <nav className="mt-6 space-y-1">
            {NAV.map((item) => {
              const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
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
          <div className="mt-auto">
            <Button variant="ghost" onClick={signOut} className="w-full justify-start text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="lg:hidden fixed top-4 right-4 z-50 glass rounded-lg p-2.5"
        aria-label="Toggle menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <main className="flex-1 min-w-0 p-4 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
