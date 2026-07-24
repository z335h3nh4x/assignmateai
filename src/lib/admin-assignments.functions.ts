import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAudit } from "./audit.server";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}


export type AdminAssignmentRow = {
  id: string;
  title: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  user_avatar: string | null;
  subject: string | null;
  education_level: string;
  template: string;
  output_style: string;
  citation_style: string;
  word_count: number;
  exports_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  tokens_used: number | null;
};

export type AdminAssignmentStats = {
  total: number;
  today: number;
  avgWordCount: number;
  totalExports: number;
  avgGenerationSeconds: number;
};

export type AdminAssignmentsResponse = {
  rows: AdminAssignmentRow[];
  stats: AdminAssignmentStats;
};

function subjectFromTitle(title: string): string | null {
  const m = title.match(/^([A-Za-z][\w\s]{0,40}?)\s+[—-]\s+/);
  return m ? m[1].trim() : null;
}

export const listAdminAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminAssignmentsResponse> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [aRes, pRes] = await Promise.all([
      supabaseAdmin
        .from("assignments")
        .select(
          "id, title, user_id, education_level, template, output_style, citation_style, word_count, exports_count, status, created_at, updated_at, tokens_used",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      supabaseAdmin.from("profiles").select("id, display_name, email, avatar_url"),
    ]);

    if (aRes.error) throw new Error(aRes.error.message);

    const profileMap = new Map<string, { name: string | null; email: string | null; avatar: string | null }>();
    for (const p of pRes.data ?? []) {
      profileMap.set(p.id, { name: p.display_name, email: p.email, avatar: p.avatar_url });
    }

    const rows: AdminAssignmentRow[] = (aRes.data ?? []).map((a: any) => {
      const p = profileMap.get(a.user_id);
      return {
        id: a.id,
        title: a.title,
        user_id: a.user_id,
        user_name: p?.name ?? null,
        user_email: p?.email ?? null,
        user_avatar: p?.avatar ?? null,
        subject: subjectFromTitle(a.title),
        education_level: a.education_level,
        template: a.template,
        output_style: a.output_style,
        citation_style: a.citation_style,
        word_count: a.word_count ?? 0,
        exports_count: a.exports_count ?? 0,
        status: a.status,
        created_at: a.created_at,
        updated_at: a.updated_at,
        tokens_used: a.tokens_used ?? null,
      };
    });

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const todayIso = startOfToday.toISOString();
    const today = rows.filter((r) => r.created_at >= todayIso).length;

    const total = rows.length;
    const avgWordCount =
      total === 0 ? 0 : Math.round(rows.reduce((s, r) => s + (r.word_count ?? 0), 0) / total);
    const totalExports = rows.reduce((s, r) => s + (r.exports_count ?? 0), 0);

    // Approximate generation time = updated_at - created_at for completed rows
    const times: number[] = [];
    for (const r of rows) {
      if (r.status === "completed" && r.created_at && r.updated_at) {
        const dt = new Date(r.updated_at).getTime() - new Date(r.created_at).getTime();
        if (dt > 0 && dt < 20 * 60 * 1000) times.push(dt / 1000);
      }
    }
    const avgGenerationSeconds =
      times.length === 0 ? 0 : Math.round(times.reduce((s, t) => s + t, 0) / times.length);

    return {
      rows,
      stats: { total, today, avgWordCount, totalExports, avgGenerationSeconds },
    };
  });

export type AdminAssignmentDetail = AdminAssignmentRow & {
  result: string | null;
  prompt: string;
  sources: any;
  question_statuses: any;
  grammar_report: any;
  quality_score: any;
  messages_count: number;
};

export const getAdminAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<AdminAssignmentDetail> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: a, error } = await supabaseAdmin
      .from("assignments")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!a) throw new Error("Assignment not found");

    const [{ data: prof }, { count }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("display_name, email, avatar_url")
        .eq("id", a.user_id)
        .maybeSingle(),
      supabaseAdmin
        .from("assignment_messages")
        .select("id", { count: "exact", head: true })
        .eq("assignment_id", data.id),
    ]);

    return {
      id: a.id,
      title: a.title,
      user_id: a.user_id,
      user_name: prof?.display_name ?? null,
      user_email: prof?.email ?? null,
      user_avatar: prof?.avatar_url ?? null,
      subject: subjectFromTitle(a.title),
      education_level: a.education_level,
      template: a.template,
      output_style: a.output_style,
      citation_style: a.citation_style,
      word_count: a.word_count ?? 0,
      exports_count: a.exports_count ?? 0,
      status: a.status,
      created_at: a.created_at,
      updated_at: a.updated_at,
      tokens_used: a.tokens_used ?? null,
      result: a.result,
      prompt: a.prompt,
      sources: a.sources,
      question_statuses: a.question_statuses,
      grammar_report: a.grammar_report,
      quality_score: a.quality_score,
      messages_count: count ?? 0,
    };
  });

export const deleteAdminAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("assignment_messages").delete().in("assignment_id", data.ids);
    const { error } = await supabaseAdmin.from("assignments").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    await logAudit(context, {
      action: "assignment.delete",
      entityType: "assignment",
      metadata: { ids: data.ids, count: data.ids.length },
    });
    return { ok: true, deleted: data.ids.length };
  });

