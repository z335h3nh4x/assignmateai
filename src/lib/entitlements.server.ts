// Centralized Entitlement & Quota Service (server-only).
// The single source of truth for feature permissions, upload limits, and
// atomic assignment quota reservation/refund. Every AI endpoint MUST call
// this service — do not implement plan/quota logic anywhere else.

export type UploadItem = { name: string; mimeType: string; dataUrl: string; sizeBytes?: number };

export type Entitlements = {
  plan: {
    id: string | null;
    slug: string;
    name: string;
    features: Record<string, boolean>;
    monthly_limit: number;
    credits: number;
    max_upload_mb: number;
    max_upload_pages: number;
  };
  usage: { month_used: number; credits_used: number };
  remaining: { monthly: number | null; credits: number | null };
  resets: { monthly: string };
};

export type QuotaReason = "daily_limit" | "monthly_limit" | "credits" | "upload_size" | "upload_pages";

export class EntitlementError extends Error {
  code: "FEATURE_LOCKED" | "QUOTA_EXCEEDED" | "UPLOAD_LIMIT";
  reason: QuotaReason | "feature";
  detail: Record<string, unknown>;
  planName: string;
  constructor(opts: {
    code: EntitlementError["code"];
    reason: EntitlementError["reason"];
    message: string;
    planName: string;
    detail?: Record<string, unknown>;
  }) {
    super(opts.message);
    this.code = opts.code;
    this.reason = opts.reason;
    this.detail = opts.detail ?? {};
    this.planName = opts.planName;
  }
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ---- Read ----
export async function getEntitlements(userId: string): Promise<Entitlements> {
  const sb = await adminClient();
  const { data, error } = await sb.rpc("get_entitlements", { _user_id: userId } as never);
  if (error) throw new Error(`Entitlements read failed: ${error.message}`);
  return data as unknown as Entitlements;
}

// ---- Feature access ----
export async function assertFeature(userId: string, feature: string): Promise<Entitlements> {
  const ent = await getEntitlements(userId);
  if (!ent.plan.features?.[feature]) {
    throw new EntitlementError({
      code: "FEATURE_LOCKED",
      reason: "feature",
      planName: ent.plan.name,
      message: `Your ${ent.plan.name} plan does not include this feature. Upgrade to unlock it.`,
      detail: { feature },
    });
  }
  return ent;
}

// ---- Upload limits (server-side enforcement) ----
function estimatePagesFromAttachments(items: UploadItem[]): number {
  let pages = 0;
  for (const a of items) {
    if (a.mimeType.startsWith("image/")) {
      pages += 1; // 1 image = 1 page
    } else if (a.mimeType === "application/pdf") {
      // Rough estimate: base64 payload ≈ 4/3 of file bytes; assume ~55KB per scanned page.
      const size = a.sizeBytes ?? estimateBytesFromDataUrl(a.dataUrl);
      pages += Math.max(1, Math.ceil(size / (55 * 1024)));
    } else {
      pages += 1;
    }
  }
  return pages;
}

function estimateBytesFromDataUrl(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

export async function assertUploadLimits(userId: string, items: UploadItem[]): Promise<Entitlements> {
  const ent = await getEntitlements(userId);
  if (items.length === 0) return ent;

  const maxMb = ent.plan.max_upload_mb || 0;
  const maxPages = ent.plan.max_upload_pages || 0;

  if (maxMb > 0) {
    for (const a of items) {
      const bytes = a.sizeBytes ?? estimateBytesFromDataUrl(a.dataUrl);
      const mb = bytes / (1024 * 1024);
      if (mb > maxMb + 0.01) {
        throw new EntitlementError({
          code: "UPLOAD_LIMIT",
          reason: "upload_size",
          planName: ent.plan.name,
          message: `"${a.name}" is ${mb.toFixed(1)}MB — your ${ent.plan.name} plan allows up to ${maxMb}MB per file. Upgrade for larger uploads.`,
          detail: { file: a.name, sizeMb: Number(mb.toFixed(2)), limitMb: maxMb },
        });
      }
    }
  }

  if (maxPages > 0) {
    const estimated = estimatePagesFromAttachments(items);
    if (estimated > maxPages) {
      throw new EntitlementError({
        code: "UPLOAD_LIMIT",
        reason: "upload_pages",
        planName: ent.plan.name,
        message: `This upload is roughly ${estimated} pages — your ${ent.plan.name} plan allows ${maxPages} pages per assignment. Upgrade for larger uploads.`,
        detail: { estimatedPages: estimated, limitPages: maxPages },
      });
    }
  }

  return ent;
}

// ---- Atomic quota reservation ----
type ReserveOk = {
  allowed: true;
  plan_name: string;
  plan_slug: string;
  day_used: number;
  day_limit: number;
  month_used: number;
  month_limit: number;
  credits_used: number;
  credits_limit: number;
  resets: { daily: string; monthly: string };
};
type ReserveDeny = {
  allowed: false;
  reason: QuotaReason;
  plan_name: string;
  plan_slug: string;
  limit: number;
  used: number;
  remaining: number;
  resets_at: string;
};

export async function reserveAssignmentSlot(userId: string, credits = 0): Promise<ReserveOk> {
  const sb = await adminClient();
  const { data, error } = await sb.rpc("reserve_assignment_slot", {
    _user_id: userId,
    _credits: Math.max(0, Math.round(credits)),
  } as never);
  if (error) throw new Error(`Quota reservation failed: ${error.message}`);
  const res = data as unknown as ReserveOk | ReserveDeny;
  if (!res.allowed) {
    const reasonLabel: Record<QuotaReason, string> = {
      daily_limit: "daily assignment limit",
      monthly_limit: "monthly assignment limit",
      credits: "monthly credit balance",
      upload_size: "upload size limit",
      upload_pages: "upload page limit",
    };
    throw new EntitlementError({
      code: "QUOTA_EXCEEDED",
      reason: res.reason,
      planName: res.plan_name,
      message: `You've reached your ${reasonLabel[res.reason]} on the ${res.plan_name} plan (${res.used}/${res.limit}). Upgrade to Pro or wait until ${new Date(res.resets_at).toLocaleString()}.`,
      detail: {
        limit: res.limit,
        used: res.used,
        remaining: res.remaining,
        resetsAt: res.resets_at,
        planSlug: res.plan_slug,
      },
    });
  }
  return res;
}

export async function refundAssignmentSlot(userId: string, credits = 0): Promise<void> {
  const sb = await adminClient();
  await sb.rpc("refund_assignment_slot", {
    _user_id: userId,
    _credits: Math.max(0, Math.round(credits)),
  } as never);
}
