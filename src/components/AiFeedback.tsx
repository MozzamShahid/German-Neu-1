"use client";

import { SpeakButton, Urdu } from "./Word";

export type Mistake = { wrong: string; right: string; why_en: string; why_ur: string };
export type AiResult = {
  configured?: boolean;
  error?: string;
  reason?: string;
  score?: number;
  max?: number;
  corrected?: string;
  mistakes?: Mistake[];
  feedback_en?: string;
  feedback_ur?: string;
  // email
  points?: { covered: string; comment_en: string; comment_ur: string }[];
  greeting_ok?: boolean;
  register_ok?: boolean;
  // sprechen
  result?: string;
  covered?: string[];
};

export async function aiCheck(body: Record<string, unknown>): Promise<AiResult> {
  try {
    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const BADGE: Record<string, string> = {
  full: "bg-emerald-100 text-emerald-800",
  partial: "bg-amber-100 text-amber-800",
  missing: "bg-rose-100 text-rose-800",
  wrong: "bg-rose-100 text-rose-800",
};
const LABEL: Record<string, string> = { full: "✓ gut", partial: "~ teilweise", missing: "✗ fehlt", wrong: "✗ nicht richtig" };

export default function AiFeedback({ r, pointLabels }: { r: AiResult; pointLabels?: string[] }) {
  if (r.configured === false)
    return (
      <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
        🤖 AI check is not set up yet. Add <code>DEEPSEEK_API_KEY</code> (or <code>OPENROUTER_API_KEY</code>) to enable it.
      </div>
    );
  if (r.error) return <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">AI check failed: {r.error}</div>;

  return (
    <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-indigo-800">🤖 AI-Prüfer</span>
        {r.max !== undefined && (
          <span className="rounded-full bg-white px-3 py-0.5 font-semibold text-indigo-700">
            {r.score} / {r.max}
          </span>
        )}
      </div>

      {r.result && <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE[r.result]}`}>{LABEL[r.result]}</span>}

      {r.points && (
        <ul className="space-y-1.5">
          {r.points.map((p, i) => (
            <li key={i} className="rounded-lg bg-white px-3 py-1.5">
              <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE[p.covered] ?? ""}`}>{LABEL[p.covered] ?? p.covered}</span>
              <span className="font-medium">{pointLabels?.[i]}</span>
              <div className="text-slate-600">{p.comment_en}</div>
              {p.comment_ur && <Urdu className="text-[14px] text-slate-600">{p.comment_ur}</Urdu>}
            </li>
          ))}
          <li className="text-xs text-slate-500">
            Anrede &amp; Gruß {r.greeting_ok ? "✓" : "✗"} · du/Sie {r.register_ok ? "✓" : "✗"}
          </li>
        </ul>
      )}

      {r.covered && <div className="text-slate-600">Covered: {r.covered.join(", ") || "–"}</div>}

      {r.corrected && (
        <div className="rounded-lg bg-white px-3 py-2">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase text-emerald-700">
            Korrigiert <SpeakButton text={r.corrected} />
          </div>
          <div className="whitespace-pre-line">{r.corrected}</div>
        </div>
      )}

      {!!r.mistakes?.length && (
        <ul className="space-y-1.5">
          {r.mistakes.map((m, i) => (
            <li key={i} className="rounded-lg bg-white px-3 py-1.5">
              <span className="text-rose-600 line-through">{m.wrong}</span> → <span className="font-semibold text-emerald-700">{m.right}</span>
              <div className="text-slate-600">{m.why_en}</div>
              {m.why_ur && <Urdu className="text-[14px] text-slate-600">{m.why_ur}</Urdu>}
            </li>
          ))}
        </ul>
      )}

      {r.feedback_en && <div className="text-slate-700">💡 {r.feedback_en}</div>}
      {r.feedback_ur && <Urdu className="text-[15px] text-slate-700">{r.feedback_ur}</Urdu>}
    </div>
  );
}
