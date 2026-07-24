import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, FileStack, BarChart3, CreditCard, Settings, LogOut, Menu, X, ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { platformName } from "@/hooks/use-site-settings";
import { useSiteSettings } from "@/hooks/use-site-settings";


export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) throw redirect({ to: "/auth" });

    const { data: roles } = await supabase
      .from("user_roles" as never)
      .select("role")
      .eq("user_id", userData.user.id);

    const isAdmin = Array.isArray(roles) && roles.some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });

    return { user: userData.user };
  },
  component: AdminLayout,
});

const NAV: Array<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/assignments", label: "Assignments", icon: FileStack },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const site = useSiteSettings();
  const name = platformName(site);

  useEffect(() => setOpen(false), [pathname]);


  useEffect(() => {
    import("@/lib/admin-settings.functions").then(({ recordAdminAccess }) => {
      recordAdminAccess().catch(() => {});
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }


  return (
    <div className="min-h-screen flex">
      <aside
        className={`fixed lg:sticky top-0 h-screen z-40 w-64 shrink-0 p-4 transition-transform ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="glass rounded-2xl h-full p-4 flex flex-col">
          <Link to="/admin" className="flex items-center gap-2 px-2 py-2">
            <BrandLogo showName={false} />
            <div className="flex flex-col leading-tight">
              <span className="font-display font-semibold">{name}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin</span>
            </div>
          </Link>


          <nav className="mt-6 space-y-1">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to as "/admin"}
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

          <div className="mt-auto space-y-1">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back to app
            </Link>
            <Button
              variant="ghost"
              onClick={signOut}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </aside>

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
