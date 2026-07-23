import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Users, FileStack, Download, DollarSign, ArrowUpRight, UserPlus, FileText, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getAdminOverview } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — AssignAI" }] }),
  component: AdminHome,
});

function formatMoney(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const KIND_META = {
  signup: { icon: UserPlus, color: "text-emerald-400" },
  assignment: { icon: FileText, color: "text-blue-400" },
  export: { icon: Download, color: "text-purple-400" },
  payment: { icon: CreditCard, color: "text-amber-400" },
} as const;

function AdminHome() {
  const fetchOverview = useServerFn(getAdminOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 30_000,
  });

  const stats = [
    { label: "Total Users", value: data?.totals.users ?? 0, icon: Users, hint: "All registered accounts" },
    { label: "Total Assignments", value: data?.totals.assignments ?? 0, icon: FileStack, hint: "Generated to date" },
    { label: "Total Exports", value: data?.totals.exports ?? 0, icon: Download, hint: "PDF / DOCX downloads" },
    { label: "Revenue", value: formatMoney(data?.totals.revenueCents ?? 0), icon: DollarSign, hint: "Completed payments" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl md:text-4xl font-display font-bold">Admin overview</h1>
        <p className="text-muted-foreground mt-1">High-level metrics across the AssignAI platform.</p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
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
              <div className="mt-4 text-2xl font-display font-semibold">
                {isLoading ? "…" : s.value}
              </div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <div className="text-xs text-muted-foreground/70 mt-2">{s.hint}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="glass border-white/10 p-6 rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg">Recent activity</h2>
          <span className="text-xs text-muted-foreground">Auto-refreshes every 30s</span>
        </div>
        <div className="mt-4 space-y-2">
          {isLoading && [1, 2, 3, 4].map((n) => (
            <div key={n} className="h-12 rounded-lg bg-white/5 animate-pulse" />
          ))}
          {!isLoading && (data?.activity.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">No activity yet.</p>
          )}
          {!isLoading && data?.activity.map((item, i) => {
            const meta = KIND_META[item.kind];
            const Icon = meta.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition">
                <div className={`h-9 w-9 rounded-lg bg-white/5 grid place-items-center ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.title}</div>
                  {item.subtitle && (
                    <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{relTime(item.at)}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
