import "server-only";

/**
 * Cheap AI checker for Schreiben / Sprechen. Uses an OpenAI-compatible chat API:
 *  - DEEPSEEK_API_KEY  -> api.deepseek.com, model deepseek-chat (cheapest)
 *  - OPENROUTER_API_KEY -> openrouter.ai, model AI_MODEL (default deepseek/deepseek-chat)
 * Returns null when no key is configured, so the UI can say "AI check not set up".
 */
function provider() {
  if (process.env.DEEPSEEK_API_KEY)
    return {
      url: "https://api.deepseek.com/chat/completions",
      key: process.env.DEEPSEEK_API_KEY,
      model: process.env.AI_MODEL || "deepseek-chat",
      extra: {},
    };
  if (process.env.OPENROUTER_API_KEY)
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.AI_MODEL || "deepseek/deepseek-chat",
      // OpenRouter otherwise may route to a slow provider (we measured 128 s vs 18 s)
      extra: { provider: { sort: "latency" } },
    };
  return null;
}

export const aiConfigured = () => provider() !== null;

export async function aiJson<T>(system: string, user: string): Promise<T> {
  try {
    return await callOnce<T>(system, user);
  } catch (e) {
    // one retry: a slow or broken provider is usually fine on the second try
    if ((e as Error).message === "AI not configured") throw e;
    return await callOnce<T>(system, user);
  }
}

async function callOnce<T>(system: string, user: string): Promise<T> {
  const p = provider();
  if (!p) throw new Error("AI not configured");
  const res = await fetch(p.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
    body: JSON.stringify({
      model: p.model,
      ...p.extra,
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(50_000),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  const json = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
  return JSON.parse(json) as T;
}
