/**
 * Direct Lovable AI Gateway call (OpenAI-compatible chat completions).
 * Server-only.
 */
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
        | { type: "file"; file: { filename: string; file_data: string } }
      >;
}

export async function callLovableAI(opts: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-3-flash-preview",
      messages: opts.messages,
      temperature: opts.temperature ?? 0.8,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 429) throw new Error("Rate limit reached — try again in a moment.");
    if (resp.status === 402) throw new Error("AI credits exhausted — please upgrade your plan.");
    throw new Error(`AI gateway error (${resp.status}): ${text.slice(0, 200)}`);
  }

  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response");
  return content;
}
