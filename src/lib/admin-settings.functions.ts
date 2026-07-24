import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

// ------------------------- Platform Settings -------------------------

export type PlatformSetting = {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
};

export const listPlatformSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformSetting[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("platform_settings" as never)
      .select("key, value, updated_at, updated_by")
      .order("key", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as PlatformSetting[];
  });

export const upsertPlatformSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        entries: z
          .array(z.object({ key: z.string().min(1).max(200), value: z.unknown() }))
          .min(1)
          .max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = data.entries.map((e) => ({
      key: e.key,
      value: (e.value ?? null) as unknown,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabaseAdmin
      .from("platform_settings" as never)
      .upsert(rows as never, { onConflict: "key" });
    if (error) throw new Error(error.message);
    const { logAudit } = await import("./audit.server");
    await logAudit(context, {
      action: "settings.update",
      entityType: "platform_settings",
      metadata: { keys: data.entries.map((e) => e.key) },
    });
    return { ok: true, count: rows.length };
  });

// ------------------------- Feature Flags -------------------------

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  description: string | null;
  updated_at: string;
};

export const listFeatureFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FeatureFlag[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("feature_flags" as never)
      .select("key, enabled, description, updated_at")
      .order("key", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as FeatureFlag[];
  });

export const setFeatureFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        key: z.string().min(1).max(120),
        enabled: z.boolean(),
        description: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {
      key: data.key,
      enabled: data.enabled,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    };
    if (data.description !== undefined) patch.description = data.description;
    const { error } = await supabaseAdmin
      .from("feature_flags" as never)
      .upsert(patch as never, { onConflict: "key" });
    if (error) throw new Error(error.message);
    const { logAudit } = await import("./audit.server");
    await logAudit(context, {
      action: "feature_flag.update",
      entityType: "feature_flag",
      entityId: data.key,
      metadata: { enabled: data.enabled },
    });
    return { ok: true };
  });

// ------------------------- Announcements -------------------------

export type Announcement = {
  id: string;
  title: string;
  message: string;
  button_text: string | null;
  button_url: string | null;
  bg_color: string;
  audiences: string[];
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const announcementInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  button_text: z.string().max(80).nullable().optional(),
  button_url: z.string().max(500).nullable().optional(),
  bg_color: z.string().max(32).default("#6366f1"),
  audiences: z.array(z.enum(["homepage", "dashboard", "admin"])).min(1),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Announcement[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("announcements" as never)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Announcement[];
  });

export const upsertAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => announcementInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload: Record<string, unknown> = {
      title: data.title,
      message: data.message,
      button_text: data.button_text ?? null,
      button_url: data.button_url ?? null,
      bg_color: data.bg_color,
      audiences: data.audiences,
      starts_at: data.starts_at ?? null,
      ends_at: data.ends_at ?? null,
      is_active: data.is_active,
    };
    let resultId = data.id;
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("announcements" as never)
        .update(payload as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      payload.created_by = context.userId;
      const { data: inserted, error } = await supabaseAdmin
        .from("announcements" as never)
        .insert(payload as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      resultId = (inserted as { id: string }).id;
    }
    const { logAudit } = await import("./audit.server");
    await logAudit(context, {
      action: data.id ? "announcement.update" : "announcement.create",
      entityType: "announcement",
      entityId: resultId ?? null,
      metadata: { title: data.title, is_active: data.is_active, audiences: data.audiences },
    });
    return { ok: true, id: resultId };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("announcements" as never)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    const { logAudit } = await import("./audit.server");
    await logAudit(context, {
      action: "announcement.delete",
      entityType: "announcement",
      entityId: data.id,
    });
    return { ok: true };
  });

// ------------------------- Audit Logs -------------------------

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  target_user_id: string | null;
  target_user_email: string | null;
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(500).default(200),
        action: z.string().max(120).optional(),
        actorId: z.string().uuid().optional(),
        targetUserId: z.string().uuid().optional(),
        since: z.string().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<AuditLogRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("audit_logs" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.action) q = q.eq("action", data.action);
    if (data.actorId) q = q.eq("actor_id", data.actorId);
    if (data.targetUserId) q = q.eq("target_user_id", data.targetUserId);
    if (data.since) q = q.gte("created_at", data.since);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = new Set<string>();
    for (const r of (rows ?? []) as Array<{ actor_id: string | null; target_user_id: string | null }>) {
      if (r.actor_id) userIds.add(r.actor_id);
      if (r.target_user_id) userIds.add(r.target_user_id);
    }
    const profileMap = new Map<string, { name: string | null; email: string | null }>();
    if (userIds.size) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, email")
        .in("id", Array.from(userIds));
      for (const p of (profs ?? []) as Array<{
        id: string;
        display_name: string | null;
        email: string | null;
      }>) {
        profileMap.set(p.id, { name: p.display_name, email: p.email });
      }
    }

    return ((rows ?? []) as Array<Record<string, unknown>>).map((r) => {
      const actor = r.actor_id ? profileMap.get(r.actor_id as string) : null;
      const target = r.target_user_id ? profileMap.get(r.target_user_id as string) : null;
      return {
        id: r.id as string,
        actor_id: (r.actor_id as string) ?? null,
        actor_email: (r.actor_email as string) ?? actor?.email ?? null,
        actor_name: actor?.name ?? null,
        action: r.action as string,
        entity_type: (r.entity_type as string) ?? null,
        entity_id: (r.entity_id as string) ?? null,
        target_user_id: (r.target_user_id as string) ?? null,
        target_user_email: target?.email ?? null,
        ip: (r.ip as string) ?? null,
        user_agent: (r.user_agent as string) ?? null,
        metadata: ((r.metadata as Record<string, unknown>) ?? {}) as Record<string, unknown>,
        created_at: r.created_at as string,
      };
    });
  });

export const exportAuditLogsCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("audit_logs" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    const headers = [
      "created_at",
      "actor_id",
      "actor_email",
      "action",
      "entity_type",
      "entity_id",
      "target_user_id",
      "ip",
      "user_agent",
      "metadata",
    ];
    const esc = (v: unknown) => {
      if (v == null) return "";
      const s = typeof v === "string" ? v : JSON.stringify(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [headers.join(",")];
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      lines.push(headers.map((h) => esc(r[h])).join(","));
    }
    return lines.join("\n");
  });
