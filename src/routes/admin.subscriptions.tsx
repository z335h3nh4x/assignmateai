import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export const Route = createFileRoute("/admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions — Admin" }] }),
  component: AdminSubscriptions,
});

function AdminSubscriptions() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">Track paid plans, renewals, and churn.</p>
      </div>
      <Card className="glass border-white/10 rounded-2xl p-10 text-center">
        <CreditCard className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Subscription controls coming soon.</p>
      </Card>
    </div>
  );
}
