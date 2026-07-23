import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Users, FileStack, Download, DollarSign, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — AssignAI" }] }),
  component: AdminHome,
});

const STATS = [
  { label: "Total Users", value: "—", icon: Users, hint: "All registered accounts" },
  { label: "Total Assignments", value: "—", icon: FileStack, hint: "Generated to date" },
  { label: "Total Exports", value: "—", icon: Download, hint: "PDF / DOCX downloads" },
  { label: "Revenue", value: "$—", icon: DollarSign, hint: "Placeholder" },
];

function AdminHome() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl md:text-4xl font-display font-bold">Admin overview</h1>
        <p className="text-muted-foreground mt-1">High-level metrics across the AssignAI platform.</p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="glass border-white/10 p-5 rounded-2xl">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg gradient-bg grid place-items-center">
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-4 text-2xl font-display font-semibold">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <div className="text-xs text-muted-foreground/70 mt-2">{s.hint}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass border-white/10 p-6 rounded-2xl">
          <h2 className="font-display font-semibold text-lg">Recent activity</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Live activity feed will appear here once wired up.
          </p>
          <div className="mt-6 space-y-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-10 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        </Card>
        <Card className="glass border-white/10 p-6 rounded-2xl">
          <h2 className="font-display font-semibold text-lg">Usage trends</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Charts for generations, exports, and revenue over time.
          </p>
          <div className="mt-6 h-40 rounded-lg bg-white/5" />
        </Card>
      </div>
    </div>
  );
}
