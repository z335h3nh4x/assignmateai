import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  component: AdminAnalytics,
});

function AdminAnalytics() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Platform performance and growth insights.</p>
      </div>
      <Card className="glass border-white/10 rounded-2xl p-10 text-center">
        <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Charts and metrics coming soon.</p>
      </Card>
    </div>
  );
}
