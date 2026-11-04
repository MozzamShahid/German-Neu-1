"use client";

import type { AnswerRecord, Question, WordCard } from "@/lib/types";
import { roundQuarter } from "@/lib/scoring";
import { WordCardView } from "./Word";

export default function Results({
  name,
  questions,
  answers,
  totalMarks,
  saveState,
  onPracticeMistakes,
  onRestart,
}: {
  name: string;
  questions: Question[];
  answers: AnswerRecord[];
  totalMarks: number;
  saveState: "saving" | "saved" | "off" | "error";
  onPracticeMistakes: (ids: number[]) => void;
  onRestart: () => void;
}) {
  const score = roundQuarter(answers.reduce((s, a) => s + a.earned, 0));
  const max = roundQuarter(answers.reduce((s, a) => s + a.marks, 0)) || totalMarks;
  const pct = max > 0 ? Math.max(0, Math.round((score / max) * 100)) : 0;
  const firstTry = answers.filter((a) => a.firstTry).length;
  const retry = answers.filter((a) => a.correct && !a.firstTry).length;
  const missed = answers.filter((a) => !a.correct).length;

  const qById = new Map(questions.map((q) => [q.qid, q]));
  const reviewCards: WordCard[] = [];
  const seen = new Set<number>();
  for (const a of answers) {
    if (a.firstTry) continue;
    const q = qById.get(a.qid);
    if (!q) continue;
    const cards = q.type === "match" ? q.cards : [q.card];
    for (const c of cards) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      reviewCards.push(c);
    }
  }

  const msg = pct >= 90 ? "Ausgezeichnet! 🎉" : pct >= 70 ? "Sehr gut! 👏" : pct >= 50 ? "Gut gemacht – keep going!" : "Weiter üben – you'll get there 💪";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <div className="text-sm text-slate-500">{name}</div>
        <div className="mt-1 text-5xl font-bold">
          {score}
          <span className="text-2xl text-slate-400"> / {max}</span>
        </div>
        <div className="mt-1 text-lg font-medium">{pct}% · {msg}</div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-green-50 p-2">
            <div className="text-xl font-bold text-green-700">{firstTry}</div>first try
          </div>
          <div className="rounded-xl bg-amber-50 p-2">
            <div className="text-xl font-bold text-amber-700">{retry}</div>on retry
          </div>
          <div className="rounded-xl bg-red-50 p-2">
            <div className="text-xl font-bold text-red-700">{missed}</div>missed
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-400">
          {saveState === "saving" && "Saving your result…"}
          {saveState === "saved" && "✓ Result saved"}
          {saveState === "off" && "Results are not being saved (database not connected)"}
          {saveState === "error" && "Could not save the result"}
        </div>
      </div>

      {reviewCards.length > 0 && (
        <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-1 font-semibold">Words to review ({reviewCards.length})</h2>
          <p className="mb-3 text-sm text-slate-500">You had trouble with these. Read them once more, then practise them.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {reviewCards.map((c) => (
              <div key={c.id}>
                <WordCardView c={c} />
                {c.example_de && (
                  <div className="px-3 pt-1 text-xs text-slate-500">
                    „{c.example_de}“ – {c.example_en}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {reviewCards.length > 0 && (
          <button
            onClick={() => onPracticeMistakes(reviewCards.map((c) => c.id))}
            className="flex-1 rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Practise these words
          </button>
        )}
        <button onClick={onRestart} className="flex-1 rounded-xl border border-slate-300 bg-white py-3 font-semibold hover:bg-slate-50">
          New quiz
        </button>
      </div>
    </div>
  );
}
