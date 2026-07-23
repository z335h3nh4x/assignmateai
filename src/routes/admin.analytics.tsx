import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { getAdminAnalytics } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  component: AdminAnalytics,
});

type Series = { date: string; value: number }[];

function Chart({ data, color, label, formatter }: {
  data: Series;
  color: string;
  label: string;
  formatter?: (v: number) => string;
}) {
  return (
    <Card className="glass border-white/10 rounded-2xl p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-display font-semibold mt-1">
        {formatter
          ? formatter(data.reduce((s, d) => s + d.value, 0))
          : data.reduce((s, d) => s + d.value, 0).toLocaleString()}
      </div>
      <div className="h-48 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              tickFormatter={(d: string) => d.slice(5)}
            />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} width={30} />
            <Tooltip
              contentStyle={{
                background: "rgba(20,20,30,0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => (formatter ? formatter(v) : v)}
            />
            <Area type="monotone" dataKey="value" stroke={color} fill={`url(#grad-${label})`} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function AdminAnalytics() {
  const fetchAnalytics = useServerFn(getAdminAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => fetchAnalytics(),
    refetchInterval: 60_000,
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Last 30 days of platform activity.</p>
      </div>

      {isLoading || !data ? (
        <Card className="glass border-white/10 rounded-2xl p-10 text-center">
          <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading live analytics…</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Chart data={data.users} color="#8b5cf6" label="New users / day" />
          <Chart data={data.assignments} color="#3b82f6" label="Assignments generated / day" />
          <Chart data={data.exports} color="#a855f7" label="Exports / day" />
          <Chart
            data={data.revenue}
            color="#f59e0b"
            label="Revenue / day"
            formatter={(v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
        </div>
      )}
    </div>
  );
}
