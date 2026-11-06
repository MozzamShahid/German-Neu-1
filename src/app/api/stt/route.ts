import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/**
 * Speech-to-text for Sprechen with ElevenLabs Scribe (much better with accents than the browser).
 * Needs ELEVENLABS_API_KEY on the server; GET tells the page whether it is available.
 */
const MAX_BYTES = 2_000_000; // ~1 minute of compressed audio

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

export async function GET() {
  return Response.json({ configured: !!process.env.ELEVENLABS_API_KEY });
}

export async function POST(request: Request) {
  if (!process.env.ELEVENLABS_API_KEY) return Response.json({ configured: false }, { status: 503 });
  if (limited(request)) return Response.json({ error: "Too many recordings, please wait a few minutes." }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof Blob) || file.size === 0) return Response.json({ error: "No audio" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Recording too long (max ~1 minute)" }, { status: 413 });
  const keyterms = String(form?.get("keyterms") ?? "")
    .split("|")
    .map((k) => k.trim())
    .filter((k) => k && k.length <= 40)
    .slice(0, 20);

  try {
    const client = new ElevenLabsClient();
    const result = await client.speechToText.convert({
      file,
      modelId: "scribe_v2",
      languageCode: "de",
      tagAudioEvents: false,
      ...(keyterms.length ? { keyterms } : {}),
    });
    const text = "text" in result ? String(result.text ?? "") : "";
    return Response.json({ configured: true, text: text.trim() });
  } catch (e) {
    return Response.json({ configured: true, error: (e as Error).message.slice(0, 200) }, { status: 502 });
  }
}
