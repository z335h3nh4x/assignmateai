import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Moon, Sun, User, CreditCard, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings" }] }),
  component: SettingsPage,
});


function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id,email,display_name,avatar_url")
        .eq("id", uid)
        .maybeSingle();
      return data;
    },
  });

  const { data: sub } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("plan,status").maybeSingle();
      return data;
    },
  });

  const { data: tokens } = useQuery({
    queryKey: ["tokens"],
    queryFn: async () => {
      const { data } = await supabase.from("tokens").select("balance,used").maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile]);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    setDarkMode(t !== "light");
  }, []);

  function toggleTheme(v: boolean) {
    setDarkMode(v);
    if (typeof window === "undefined") return;
    if (v) {
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.remove("light");
    } else {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.add("light");
    }
  }

  async function saveProfile() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", uid);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile, appearance and plan.</p>
      </div>

      <Card className="glass border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Profile</h2>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={profile?.email ?? ""} disabled className="mt-1.5 bg-white/5 border-white/10" />
          </div>
          <div>
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1.5 bg-white/5 border-white/10" />
          </div>
          <Button onClick={saveProfile} disabled={saving} className="gradient-bg text-white border-0">
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </Card>

      <Card className="glass border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          {darkMode ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
          <h2 className="font-semibold">Appearance</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Dark mode</p>
            <p className="text-sm text-muted-foreground">Toggle light or dark theme.</p>
          </div>
          <Switch checked={darkMode} onCheckedChange={toggleTheme} />
        </div>
      </Card>

      <Card className="glass border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Subscription</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium capitalize">{sub?.plan ?? "free"} plan</p>
            <p className="text-sm text-muted-foreground">
              {tokens ? `${tokens.balance.toLocaleString()} tokens remaining · ${tokens.used.toLocaleString()} used` : "—"}
            </p>
          </div>
          <Button className="gradient-bg text-white border-0" onClick={() => toast.message("Upgrades open soon — join the waitlist!")}>
            <Sparkles className="h-4 w-4 mr-2" /> Upgrade
          </Button>
        </div>
        {supportEmail && (
          <div className="mt-4 pt-4 border-t border-white/10 text-sm text-muted-foreground">
            Need help with your plan?{" "}
            <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">
              Contact support
            </a>
          </div>
        )}
      </Card>

    </div>
  );
}
