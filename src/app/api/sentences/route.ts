import { grammarItems } from "@/lib/grammar";

/** Example sentences for the Lernen page: unique full sentences of one topic, shuffled. */
export async function GET(request: Request) {
  const topic = new URL(request.url).searchParams.get("topic") ?? "";
  const seen = new Set<string>();
  const out: { id: number; de: string; en: string; ur: string }[] = [];
  for (const it of grammarItems) {
    if (it.topic !== topic || seen.has(it.de) || it.de.includes(" = ") || it.de.includes("→")) continue;
    seen.add(it.de);
    out.push({ id: it.id, de: it.de, en: it.en, ur: it.ur });
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return Response.json({ total: out.length, sentences: out.slice(0, 12) });
}
