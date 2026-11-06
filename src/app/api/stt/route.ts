import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/**
 * Speech-to-text for Sprechen. Tries, in order:
 *   1. ElevenLabs Scribe v2 (ELEVENLABS_API_KEY) – best with accents
 *   2. an audio-capable model on OpenRouter (OPENROUTER_API_KEY, STT_MODEL, default Gemini 2.5 Flash Lite)
 * If both fail the page falls back to the browser's own speech recognition.
 * The page sends 16 kHz mono WAV (converted in the browser), so every engine accepts it.
 */
const MAX_BYTES = 4_000_000; // ~2 minutes of 16 kHz mono WAV

const hits = new Map<string, number[]>();
function limited(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 40;
}

const configured = () => !!(process.env.ELEVENLABS_API_KEY || process.env.OPENROUTER_API_KEY);

export async function GET() {
  return Response.json({ configured: configured() });
}

async function elevenlabs(file: Blob, keyterms: string[]) {
  const result = await new ElevenLabsClient().speechToText.convert({
    file,
    modelId: "scribe_v2",
    languageCode: "de",
    tagAudioEvents: false,
    ...(keyterms.length ? { keyterms } : {}),
  });
  return "text" in result ? String(result.text ?? "").trim() : "";
}

async function openrouter(file: Blob, keyterms: string[]) {
  const format = file.type.includes("wav") ? "wav" : file.type.includes("mpeg") ? "mp3" : file.type.includes("ogg") ? "ogg" : "wav";
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    body: JSON.stringify({
      model: process.env.STT_MODEL || "google/gemini-2.5-flash-lite",
      provider: { sort: "latency" },
      temperature: 0,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Transcribe exactly what the speaker says. The speaker is a beginner learning German (A1), so write the words as spoken: " +
                "do NOT correct grammar or mistakes and do NOT translate. Return only the transcript, no quotes, no comments. " +
                "If there is no speech, return an empty string." +
                (keyterms.length ? ` Words that may occur: ${keyterms.join(", ")}.` : ""),
            },
            { type: "input_audio", input_audio: { data, format } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const d = await res.json();
  return String(d.choices?.[0]?.message?.content ?? "")
    .replace(/^["„“]|["“”]$/g, "")
    .trim();
}

export async function POST(request: Request) {
  if (!configured()) return Response.json({ configured: false }, { status: 503 });
  if (limited(request)) return Response.json({ error: "Too many recordings, please wait a few minutes." }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof Blob) || file.size === 0) return Response.json({ error: "No audio" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Recording too long" }, { status: 413 });
  const keyterms = String(form?.get("keyterms") ?? "")
    .split("|")
    .map((k) => k.trim())
    .filter((k) => k && k.length <= 40)
    .slice(0, 20);

  const errors: string[] = [];
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      const text = await elevenlabs(file, keyterms);
      if (text) return Response.json({ configured: true, text, engine: "elevenlabs" });
    } catch (e) {
      errors.push(`elevenlabs: ${(e as Error).message.slice(0, 120)}`); // e.g. credits used up → try the next one
    }
  }
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const text = await openrouter(file, keyterms);
      return Response.json({ configured: true, text, engine: "openrouter" });
    } catch (e) {
      errors.push(`openrouter: ${(e as Error).message.slice(0, 120)}`);
    }
  }
  return Response.json({ configured: true, error: errors.join(" · ") || "No speech recognised" }, { status: 502 });
}
