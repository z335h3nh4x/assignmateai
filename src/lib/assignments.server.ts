// Server-only helpers used by assignments.functions.ts
import { callLovableAI } from "./ai-gateway.server";
import type { SourceItem } from "./templates";

const URL_FETCH_TIMEOUT_MS = 8000;
const MAX_URL_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;

/** Reject hostnames that resolve to (or literally are) private / loopback / link-local space. */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  // IPv6 loopback / unique-local / link-local
  if (h === "::1" || h === "::" || /^f[cd][0-9a-f]{2}:/i.test(h) || /^fe80:/i.test(h)) return true;
  // IPv4-mapped IPv6
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const candidate = mapped ? mapped[1] : h;
  const m = candidate.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false; // regular DNS name
  const [a, b] = [Number(m[1]), Number(m[2])];
  if ([a, Number(m[2]), Number(m[3]), Number(m[4])].some((n) => n > 255)) return true;
  if (a === 0 || a === 10 || a === 127) return true; // this-network, private, loopback
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 192 && b === 0) return true; // IETF protocol assignments
  if (a >= 224) return true; // multicast / reserved
  return false;
}

/** Only public http(s) URLs may be fetched server-side. */
function assertFetchableUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (isBlockedHost(u.hostname)) return null;
  return u;
}

export async function fetchUrlText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);
    try {
      // Follow redirects manually so every hop is re-validated (blocks
      // redirect-to-internal and DNS-rebinding style bypasses).
      let target = assertFetchableUrl(url);
      if (!target) return null;
      let resp: Response | null = null;
      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        resp = await fetch(target.toString(), {
          signal: controller.signal,
          headers: { "User-Agent": "Assignmate/1.0 (+https://lovable.dev)" },
          redirect: "manual",
        });
        if (resp.status >= 300 && resp.status < 400) {
          const loc = resp.headers.get("location");
          if (!loc) return null;
          const next = assertFetchableUrl(new URL(loc, target).toString());
          if (!next) return null;
          target = next;
          continue;
        }
        break;
      }
      if (!resp || !resp.ok) return null;
      const ct = resp.headers.get("content-type") ?? "";
      if (!ct.includes("text") && !ct.includes("html") && !ct.includes("json")) return null;
      const len = Number(resp.headers.get("content-length") ?? "0");
      if (len && len > MAX_URL_BYTES) return null;
      const raw = (await resp.text()).slice(0, MAX_URL_BYTES);
      // Strip tags/scripts/styles crudely
      return raw
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    } finally {
      clearTimeout(t);
    }
  } catch {
    return null;
  }
}


export async function fetchAllUrlTexts(sources: SourceItem[]): Promise<Record<string, string>> {
  const urls = sources.filter((s): s is Extract<SourceItem, { kind: "url" }> => s.kind === "url").map((s) => s.url);
  const out: Record<string, string> = {};
  await Promise.all(
    urls.map(async (u) => {
      const text = await fetchUrlText(u);
      if (text) out[u] = text;
    }),
  );
  return out;
}

// Ask the model to analyse assignment text and return strict JSON.
export async function analyseAssignmentText(text: string, citationStyle: string): Promise<{
  grammar: {
    suggestions: Array<{ type: string; severity: "low" | "medium" | "high"; excerpt: string; suggestion: string }>;
    tone: string;
    readability: string;
  };
  scores: {
    structure: number;
    grammar: number;
    completeness: number;
    readability: number;
    citations: number;
    overall: number;
  };
}> {
  const raw = await callLovableAI({
    messages: [
      {
        role: "system",
        content: `You are an academic writing reviewer. Analyse the assignment supplied by the user.
Return ONLY compact JSON, no prose, no markdown fences. Shape:
{
  "grammar": {
    "suggestions": [ { "type": "grammar|spelling|style|clarity", "severity": "low|medium|high", "excerpt": "<=120 chars", "suggestion": "<=200 chars" } ],
    "tone": "one-sentence tone assessment",
    "readability": "one-sentence readability assessment (mention approximate grade level)"
  },
  "scores": {
    "structure": 0-100,
    "grammar": 0-100,
    "completeness": 0-100,
    "readability": 0-100,
    "citations": 0-100,
    "overall": 0-100
  }
}
Citation style expected: ${citationStyle}. If citation style is "none", score citations based on general source usage. Return at most 12 suggestions, most impactful first.`,
      },
      { role: "user", content: text.slice(0, 20000) },
    ],
    temperature: 0.2,
  });

  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  return parsed;
}

export async function chatAboutAssignment(opts: {
  assignmentText: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userMessage: string;
}): Promise<string> {
  const system = `You are Assignmate's writing assistant. The user is working on the assignment below. Help them refine it: expand or shorten sections, rewrite paragraphs, explain difficult concepts, answer follow-up questions. Keep replies focused and useful. Use Markdown.

--- ASSIGNMENT START ---
${opts.assignmentText.slice(0, 18000)}
--- ASSIGNMENT END ---`;

  return callLovableAI({
    messages: [
      { role: "system", content: system },
      ...opts.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: opts.userMessage },
    ],
    temperature: 0.7,
  });
}
