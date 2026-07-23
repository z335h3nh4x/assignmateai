import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { FileStack } from "lucide-react";

export const Route = createFileRoute("/admin/assignments")({
  head: () => ({ meta: [{ title: "Assignments — Admin" }] }),
  component: AdminAssignments,
});

function AdminAssignments() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Assignments</h1>
        <p className="text-muted-foreground mt-1">Review generated assignments across all users.</p>
      </div>
      <Card className="glass border-white/10 rounded-2xl p-10 text-center">
        <FileStack className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Assignment browser coming soon.</p>
      </Card>
    </div>
  );
}
