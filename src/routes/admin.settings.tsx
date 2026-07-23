import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Admin" }] }),
  component: AdminSettings,
});

function AdminSettings() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Platform-wide configuration.</p>
      </div>
      <Card className="glass border-white/10 rounded-2xl p-10 text-center">
        <SettingsIcon className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Admin settings coming soon.</p>
      </Card>
    </div>
  );
}
