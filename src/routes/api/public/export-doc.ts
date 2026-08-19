import { createFileRoute } from "@tanstack/react-router";
import { base64ToBytes } from "@/lib/pdf-bytes";

/**
 * Delivers a generated document (assignment PDF print view, notebook PDF view,
 * or .doc export) as a real HTTP response instead of a client-side blob: URL.
 *
 * Mobile browsers and WebView wrappers cannot reliably save blob:/data: URLs,
 * so the client posts the already-rendered HTML here and the browser handles
 * the response natively (inline print view, or a real file download).
 *
 * Security: the payload is caller-supplied HTML echoed back, so the response is
 * served in a sandboxed opaque origin (no access to app cookies/storage) and is
 * never indexed or cached.
 */

const MAX_BYTES = 6 * 1024 * 1024;

function sanitizeFilename(input: string, fallback: string) {
  const cleaned = (input || "").replace(/[^\w.\- ]+/g, "").trim().slice(0, 120);
  return cleaned || fallback;
}

export const Route = createFileRoute("/api/public/export-doc")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const html = String(form.get("html") ?? "");
        const mode = String(form.get("mode") ?? "inline");
        const encoding = String(form.get("encoding") ?? "");
        const mime = String(form.get("mime") ?? "text/html");
        const filename = sanitizeFilename(String(form.get("filename") ?? ""), "assignment.html");

        if (!html) return new Response("Missing document", { status: 400 });
        if (html.length > (encoding === "base64" ? MAX_BYTES * 5 : MAX_BYTES)) return new Response("Document too large", { status: 413 });

        const attachment = mode === "attachment";
        const binary = encoding === "base64";
        const contentType = attachment && mime ? mime : "text/html";

        const headers: Record<string, string> = {
          "Content-Type": binary ? contentType : `${contentType}; charset=utf-8`,
          "Cache-Control": "no-store, private",
          "X-Robots-Tag": "noindex, nofollow",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "sandbox allow-scripts allow-popups allow-modals allow-downloads",
          "Content-Disposition": attachment
            ? `attachment; filename="${filename}"`
            : `inline; filename="${filename}"`,
        };

        if (binary) {
          const bytes = base64ToBytes(html);
          return new Response(bytes as unknown as BodyInit, { headers });
        }

        return new Response(html, { headers });
      },
    },
  },
});
