import { aiConfigured, aiJson } from "@/lib/ai";
import schreiben from "@/data/schreiben.json";
import sprechen from "@/data/sprechen.json";
import a2 from "@/data/a2-sprechen.json";

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
  const text = clip(b?.text, b?.kind === "a2talk" ? 6000 : 1500);
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

    // ---------- A2: free talk about a topic (1, 2 or 5 minutes) ----------
    if (b.kind === "a2talk" || b.kind === "a2question") {
      const A2_SYSTEM = `You are a friendly, honest German teacher preparing a learner for the A2 speaking exam (Goethe A2 / telc A2).
The learner is from Pakistan and speaks Urdu and English. Judge by A2 standards: simple but connected sentences, Perfekt for the past,
linking words (weil, dass, wenn, deshalb, trotzdem, aber, denn), everyday vocabulary. Be encouraging but point out real mistakes.
The text comes from speech recognition, so ignore punctuation, capital letters and small recognition errors.
"why_ur" and "feedback_ur" must be in Urdu script (not Roman Urdu). Return ONLY a JSON object, no markdown.`;
      const UPGRADES = `"upgrades": [{"yours": "a simple / A1-style sentence the learner said", "better": "the same idea said in a more natural A2 way", "why_en": "short", "why_ur": "مختصر"}] (max 4)`;

      if (b.kind === "a2question") {
        const question = clip(b.question, 300);
        const r = await aiJson<{ result: Level; corrected: string; mistakes: Mistake[]; upgrades: unknown[]; feedback_en: string; feedback_ur: string }>(
          A2_SYSTEM,
          `Question: "${question}"
Learner answered (spoken):
"""${text}"""
A good A2 answer has 2–4 connected sentences and a reason or example. Return JSON:
{"result": "full" (answers the question, understandable, 2+ sentences, small mistakes ok) | "partial" (answers but very short or clear mistakes) | "wrong" (does not answer / not understandable),
 "corrected": "the learner's answer in correct natural German, keep their ideas, one or two sentences longer if it was very short",
 ${MISTAKES_SPEC}, ${UPGRADES},
 "feedback_en": "1-2 short sentences", "feedback_ur": "ایک دو مختصر جملے"}`,
        );
        return Response.json({ configured: true, ...r, score: levelScore(r.result, 1), max: 1 });
      }

      const thema = a2.themen.find((t) => t.id === b.themaId);
      if (!thema) return Response.json({ error: "Unknown topic" }, { status: 400 });
      const seconds = Math.max(10, Math.min(900, Number(b.seconds) || 60));
      const words = text.split(/\s+/).filter(Boolean).length;
      const r = await aiJson<{
        answered: number[];
        content: number;
        range: number;
        accuracy: number;
        corrected: string;
        mistakes: Mistake[];
        upgrades: { yours: string; better: string; why_en: string; why_ur: string }[];
        good: string[];
        next_time: string[];
        feedback_en: string;
        feedback_ur: string;
      }>(
        A2_SYSTEM,
        `Topic: "${thema.title}" (${thema.title_en}). The learner talked for about ${Math.round(seconds / 60 * 10) / 10} minutes (${words} words).
Guiding questions (index: question):
${thema.questions.map((q, i) => `${i}: ${q.de}`).join("\n")}

Learner's talk:
"""${text}"""

Rate:
- "answered": indices of the guiding questions the learner really talked about
- "content" 0-4: how much they said about the topic (details, examples, reasons, past/future). A 1-minute talk with 8+ good sentences can get 4.
- "range" 0-3: variety of words and linking words, sentences longer than subject-verb-object, Perfekt / Modalverben / Nebensätze
- "accuracy" 0-3: verb position (verb 2nd, verb at the end after weil/dass/wenn), verb forms, articles/cases. Many small errors but understandable = 1.5–2.
Return JSON:
{"answered": [0, 2], "content": 0-4, "range": 0-3, "accuracy": 0-3,
 "corrected": "the learner's talk with the mistakes fixed, keep their ideas and words; if it is longer than about 150 words, give only the 8 most important sentences, corrected, one per line",
 ${MISTAKES_SPEC},
 ${UPGRADES},
 "good": ["up to 4 phrases the learner used well, copied from the talk"],
 "next_time": ["2-3 concrete German sentences the learner could add next time about questions they skipped"],
 "feedback_en": "2-3 short sentences", "feedback_ur": "دو تین مختصر جملے"}`,
        { maxTokens: 2600, timeoutMs: 90_000 },
      );
      const n = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) * 2) / 2 || 0));
      const content = n(r.content, 4);
      const range = n(r.range, 3);
      const accuracy = n(r.accuracy, 3);
      const answered = (r.answered ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < thema.questions.length);
      return Response.json({ configured: true, ...r, answered, content, range, accuracy, score: content + range + accuracy, max: 10, words });
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
