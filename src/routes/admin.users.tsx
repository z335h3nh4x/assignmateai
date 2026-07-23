import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">Manage registered users, roles, and access.</p>
      </div>
      <Card className="glass border-white/10 rounded-2xl p-10 text-center">
        <Users className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">User management table coming soon.</p>
      </Card>
    </div>
  );
}
