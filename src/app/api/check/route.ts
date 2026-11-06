import { aiConfigured, aiJson } from "@/lib/ai";
import schreiben from "@/data/schreiben.json";
import sprechen from "@/data/sprechen.json";

type Mistake = { wrong: string; right: string; why_en: string; why_ur: string };
type Level = "full" | "partial" | "missing" | "wrong";

const COMMON = `You are a kind but honest Goethe-Zertifikat A1 (Start Deutsch 1) examiner.
The learner is from Pakistan and speaks Urdu and English. Judge by A1 standards: simple sentences are fine,
the message must be understandable. Explanations must be short and easy. "why_ur" and "feedback_ur" must be in
Urdu script (not Roman Urdu). Return ONLY a JSON object, no markdown.`;

const MISTAKES_SPEC = `"mistakes": [{"wrong": "...", "right": "...", "why_en": "short reason", "why_ur": "اردو میں مختصر وجہ"}] (max 6, most important first, empty if none)`;

const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);
const levelScore = (l: Level, full: number) => (l === "full" ? full : l === "partial" ? full / 2 : 0);

// simple per-IP limit so nobody can burn the AI key: 60 checks per 10 minutes
const hits = new Map<string, number[]>();
function limited(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 60;
}

export async function POST(request: Request) {
  if (limited(request)) return Response.json({ error: "Too many checks, please wait a few minutes." }, { status: 429 });
  if (!aiConfigured())
    return Response.json({ configured: false, reason: "AI check is not set up (DEEPSEEK_API_KEY or OPENROUTER_API_KEY missing)." });

  const b = await request.json().catch(() => null);
  const text = clip(b?.text, 1500);
  if (!b || !text) return Response.json({ error: "Empty answer" }, { status: 400 });

  try {
    // ---------- Schreiben Teil 2: email ----------
    if (b.kind === "email") {
      const task = schreiben.tests.find((t) => t.id === b.testId)?.email;
      if (!task) return Response.json({ error: "Unknown task" }, { status: 400 });
      const r = await aiJson<{
        points: { covered: Level; comment_en: string; comment_ur: string }[];
        greeting_ok: boolean;
        register_ok: boolean;
        corrected: string;
        mistakes: Mistake[];
        feedback_en: string;
        feedback_ur: string;
      }>(
        COMMON,
        `Task (Schreiben Teil 2, ${task.register === "formell" ? "formal: Sie, formal greeting and closing" : "informal: du, informal greeting and closing"}):
${task.situation}
Content points:
${task.points.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Learner's email:
"""${text}"""

Rate each content point: "full" (clearly covered and understandable), "partial" (attempted but unclear or very wrong), "missing".
"greeting_ok": has a fitting greeting AND closing. "register_ok": uses ${task.register === "formell" ? "Sie" : "du"} consistently.
Return JSON:
{"points": [{"covered": "full|partial|missing", "comment_en": "...", "comment_ur": "..."}] (exactly ${task.points.length}),
 "greeting_ok": true|false, "register_ok": true|false,
 "corrected": "the learner's email with mistakes fixed, keep their ideas and A1 level",
 ${MISTAKES_SPEC},
 "feedback_en": "2 short sentences", "feedback_ur": "دو مختصر جملے"}`,
      );
      const points = (r.points ?? []).slice(0, task.points.length);
      const content = points.reduce((s, p) => s + levelScore(p.covered, 3), 0);
      const form = (r.greeting_ok ? 0.5 : 0) + (r.register_ok ? 0.5 : 0);
      return Response.json({ configured: true, ...r, points, score: content + form, max: 10 });
    }

    // ---------- Sprechen ----------
    if (b.kind === "sprechen") {
      const test = sprechen.tests.find((t) => t.id === b.testId);
      const role = String(b.role);

      if (role === "intro") {
        const kw = sprechen.intro.keywords;
        const r = await aiJson<{ covered: string[]; corrected: string; mistakes: Mistake[]; feedback_en: string; feedback_ur: string }>(
          COMMON,
          `Task (Sprechen Teil 1): introduce yourself with these points: ${kw.join(", ")}.
The text comes from speech recognition, so ignore punctuation, capitals and small recognition errors.
Learner said:
"""${text}"""
Return JSON: {"covered": [which of ${JSON.stringify(kw)} the learner talked about understandably],
 "corrected": "their introduction in correct simple German", ${MISTAKES_SPEC},
 "feedback_en": "2 short sentences", "feedback_ur": "دو مختصر جملے"}`,
        );
        const covered = (r.covered ?? []).filter((k) => kw.includes(k));
        const score = Math.min(3, Math.floor((covered.length / 2) * 2) / 2);
        return Response.json({ configured: true, ...r, covered, score, max: 3 });
      }

      let task = "";
      if (role === "ask" || role === "answer") {
        const card = test?.cards2[Number(b.card)];
        if (!card) return Response.json({ error: "Unknown card" }, { status: 400 });
        task =
          role === "ask"
            ? `Sprechen Teil 2, theme "${test!.theme2}". The learner must ASK a question that uses the word "${card.word}".`
            : `Sprechen Teil 2. The partner asked: "${card.partner}". The learner must ANSWER this question in a full sentence.`;
      } else if (role === "bitte" || role === "react") {
        const card = test?.cards3[Number(b.card)];
        if (!card) return Response.json({ error: "Unknown card" }, { status: 400 });
        task =
          role === "bitte"
            ? `Sprechen Teil 3. The card shows "${card.word}" (${card.emoji}). The learner must make a polite REQUEST about it (e.g. "Können Sie bitte …?" / "Ich möchte …, bitte.").`
            : `Sprechen Teil 3. The partner asked: "${card.partner}". The learner must REACT to the request (e.g. "Ja, gern." / "Ja, natürlich, hier bitte." / "Nein, leider …").`;
      } else if (role === "translate") {
        task = `Translation practice. Say in German: "${clip(b.reference_en, 300)}" (Urdu: "${clip(b.reference_ur, 300)}").
A reference answer is "${clip(b.reference_de, 300)}". Other correct ways to say it are also fine.`;
      } else return Response.json({ error: "Unknown role" }, { status: 400 });

      const r = await aiJson<{ result: Level; corrected: string; mistakes: Mistake[]; feedback_en: string; feedback_ur: string }>(
        COMMON,
        `${task}
The text comes from speech recognition, so ignore punctuation, capitals and small recognition errors.
Learner said:
"""${text}"""
Return JSON: {"result": "full" (task done, understandable, at most small mistakes) | "partial" (task done but with clear mistakes) | "wrong" (task not done / not understandable),
 "corrected": "a correct simple German sentence for this task, close to what the learner said",
 ${MISTAKES_SPEC},
 "feedback_en": "1-2 short sentences", "feedback_ur": "ایک دو مختصر جملے"}`,
      );
      return Response.json({ configured: true, ...r, score: levelScore(r.result, 1), max: 1 });
    }

    return Response.json({ error: "Unknown kind" }, { status: 400 });
  } catch (e) {
    return Response.json({ configured: true, error: (e as Error).message }, { status: 502 });
  }
}
