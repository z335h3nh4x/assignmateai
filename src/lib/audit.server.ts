// Server-only audit logging helper.
// Writes to public.audit_logs via the service-role client so that RLS
// (admin-read-only, no INSERT policy) cannot block legitimate writes.

import { getRequest, getRequestIP } from "@tanstack/react-start/server";

export type AuditContext = {
  userId: string;
  claims?: { email?: string; [k: string]: unknown } | null;
};

export type AuditEntry = {
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  targetUserId?: string | null;
  metadata?: Record<string, unknown>;
};

function safeRequestMeta(): { ip: string | null; ua: string | null } {
  try {
    const req = getRequest();
    const ua = req?.headers?.get("user-agent") ?? null;
    let ip: string | null = null;
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
    } catch {
      ip = req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    }
    return { ip, ua };
  } catch {
    return { ip: null, ua: null };
  }
}

export async function logAudit(context: AuditContext, entry: AuditEntry): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ip, ua } = safeRequestMeta();
    const email =
      (context.claims && typeof context.claims.email === "string" ? context.claims.email : null) ??
      null;
    await supabaseAdmin.from("audit_logs" as never).insert({
      actor_id: context.userId,
      actor_email: email,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId != null ? String(entry.entityId) : null,
      target_user_id: entry.targetUserId ?? null,
      ip,
      user_agent: ua,
      metadata: entry.metadata ?? {},
    } as never);
  } catch (err) {
    // Never let audit-log failures break the underlying admin action.
    console.error("[audit] failed to record entry", entry.action, err);
  }
}
