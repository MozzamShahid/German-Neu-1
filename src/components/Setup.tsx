"use client";

import { useEffect, useState } from "react";
import { GRAMMAR_TOPICS, OPTIONAL_TOPICS, type Chapter, type GrammarTopic, type QuestionType } from "@/lib/types";
import { HINT_COST, WRONG_PENALTY } from "@/lib/scoring";

export interface SetupValues {
  name: string;
  chapters: number[];
  mode: "questions" | "marks";
  count: number;
  targetMarks: number;
  types: QuestionType[];
  grammarTopics: GrammarTopic[];
  reviewIds?: number[];
  reviewItemIds?: number[];
}

const TOPIC_INFO: Record<GrammarTopic, { label: string; ur: string }> = {
  konjugation: { label: "Verben & Konjugation", ur: "فعل کی گردان" },
  wortstellung: { label: "Satzbau (verb position)", ur: "جملے کی ترتیب" },
  pronomen: { label: "Pronomen (er/sie/es, Sie)", ur: "ضمیریں" },
  artikel: { label: "ein/kein, Plural, mein/dein", ur: "آرٹیکل" },
  modalverben: { label: "Modalverben", ur: "können, müssen" },
  trennbar: { label: "Trennbare Verben", ur: "ٹوٹنے والے فعل" },
  vergangenheit: { label: "Perfekt, war, hatte", ur: "ماضی" },
  zahlen: { label: "Zahlen & Datum", ur: "گنتی اور تاریخ" },
  uhrzeit: { label: "Uhrzeit, am/um/zum", ur: "وقت" },
  wortbildung: { label: "Wortbildung (-los, -er, -ung)", ur: "الفاظ بنانا" },
  redemittel: { label: "Redemittel (Brief, Arzt …)", ur: "روزمرہ جملے" },
  akkusativ: { label: "Akkusativ", ur: "der → den" },
  dativ: { label: "Dativ", ur: "der → dem" },
  wechsel: { label: "Wechselpräpositionen", ur: "Wo / Wohin" },
};

interface Attempt {
  id: string;
  chapters: number[];
  question_count: number;
  max_score: number;
  score: number;
  correct_first: number;
  created_at: string;
}

const TYPE_INFO: { id: QuestionType; label: string; desc: string }[] = [
  { id: "meaning", label: "Meaning", desc: "German → English" },
  { id: "article", label: "der / die / das", desc: "Pick the right article" },
  { id: "match", label: "Matching", desc: "Word families: das Kind ↔ der Kindergarten" },
  { id: "reverse", label: "Reverse", desc: "English → German" },
  { id: "grammar", label: "Grammatik + Sätze", desc: "From the lectures: sentences in German · English · Urdu" },
];

const PRESETS: { label: string; chapters: number[] }[] = [
  { label: "Kapitel 1", chapters: [1] },
  { label: "1 + 2", chapters: [1, 2] },
  { label: "1 – 5", chapters: [1, 2, 3, 4, 5] },
  { label: "Full book", chapters: [] }, // filled with all
];

export default function Setup({
  chapters,
  initial,
  onStart,
  loading,
  error,
}: {
  chapters: Chapter[];
  initial: SetupValues;
  onStart: (v: SetupValues) => void;
  loading: boolean;
  error: string | null;
}) {
  const [v, setV] = useState<SetupValues>(initial);
  const [fetched, setFetched] = useState<{
    name: string;
    data: { configured: boolean; attempts: Attempt[]; reviewIds: number[]; reviewItemIds?: number[] };
  } | null>(null);
  const trimmedName = v.name.trim();
  const history = trimmedName.length >= 2 && fetched?.name === trimmedName ? fetched.data : null;

  const set = <K extends keyof SetupValues>(k: K, val: SetupValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const toggleChapter = (id: number) =>
    set("chapters", v.chapters.includes(id) ? v.chapters.filter((c) => c !== id) : [...v.chapters, id].sort((a, b) => a - b));
  const toggleType = (t: QuestionType) =>
    set("types", v.types.includes(t) ? v.types.filter((x) => x !== t) : [...v.types, t]);
  const toggleTopic = (t: GrammarTopic) =>
    set("grammarTopics", v.grammarTopics.includes(t) ? v.grammarTopics.filter((x) => x !== t) : [...v.grammarTopics, t]);

  // load history when the name settles
  useEffect(() => {
    if (trimmedName.length < 2) return;
    const t = setTimeout(() => {
      fetch(`/api/attempts?name=${encodeURIComponent(trimmedName)}`)
        .then((r) => r.json())
        .then((data) => setFetched({ name: trimmedName, data }))
        .catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [trimmedName]);

  const selected = chapters.filter((c) => v.chapters.includes(c.id));
  const wordCount = selected.reduce((s, c) => s + c.count, 0);
  const vocabOn = v.types.some((t) => t !== "grammar");
  const grammarOn = v.types.includes("grammar");
  const canStart =
    v.name.trim().length > 0 &&
    v.types.length > 0 &&
    (!vocabOn || v.chapters.length > 0 || grammarOn) &&
    (!grammarOn || v.grammarTopics.length > 0 || vocabOn) &&
    !loading;

  const allIds = chapters.map((c) => c.id);
  const isPreset = (p: number[]) => {
    const target = p.length ? p : allIds;
    return target.length === v.chapters.length && target.every((c) => v.chapters.includes(c));
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Deutsch Quiz</h1>
        <p className="mt-1 text-slate-500">Netzwerk neu A1 · book glossary + lecture notes · German · English · اردو</p>
        <a
          href="/learn"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          📖 Lernen – notes, tables &amp; sentences
        </a>
        <a
          href="/pruefung"
          className="ml-2 mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
        >
          🎓 A1 Prüfung – Hören · Lesen · Schreiben · Sprechen
        </a>
        <a
          href="/woerter"
          className="ml-2 mt-3 inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
        >
          📚 Wörter – all words with 🔊
        </a>
      </header>

      <div className="space-y-5">
        {/* name */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <label className="mb-1 block text-sm font-semibold">Your name</label>
          <input
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Mozzam"
            maxLength={60}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          {history?.configured && history.attempts.length > 0 && (
            <div className="mt-3 rounded-xl bg-indigo-50 p-3 text-sm">
              <div className="font-medium text-indigo-900">Welcome back! Your last tests:</div>
              <ul className="mt-1 space-y-0.5 text-indigo-800">
                {history.attempts.slice(0, 4).map((a) => (
                  <li key={a.id} className="flex justify-between gap-2">
                    <span>
                      {new Date(a.created_at).toLocaleDateString()} · Kapitel {a.chapters.join(", ")}
                    </span>
                    <span className="font-medium">
                      {a.score} / {a.max_score}
                    </span>
                  </li>
                ))}
              </ul>
              {history.reviewIds.length + (history.reviewItemIds?.length ?? 0) > 0 && (
                <button
                  disabled={loading}
                  onClick={() =>
                    onStart({
                      ...v,
                      chapters: allIds,
                      mode: "questions",
                      count: Math.min(30, Math.max(5, history.reviewIds.length + (history.reviewItemIds?.length ?? 0))),
                      reviewIds: history.reviewIds,
                      reviewItemIds: history.reviewItemIds ?? [],
                      types: history.reviewItemIds?.length && !v.types.includes("grammar") ? [...v.types, "grammar"] : v.types,
                    })
                  }
                  className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Practice my mistakes ({history.reviewIds.length} words
                  {history.reviewItemIds?.length ? `, ${history.reviewItemIds.length} sentences` : ""})
                </button>
              )}
            </div>
          )}
        </section>

        {/* chapters */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Chapters</h2>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => set("chapters", p.chapters.length ? p.chapters : allIds)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    isPreset(p.chapters) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button onClick={() => set("chapters", [])} className="rounded-full px-3 py-1 text-xs text-slate-500 hover:bg-slate-100">
                Clear
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {chapters.map((c) => {
              const on = v.chapters.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleChapter(c.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    on ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="text-sm font-semibold">Kapitel {c.id}</div>
                  <div className="truncate text-xs text-slate-500">{c.title}</div>
                  <div className="text-[11px] text-slate-400">{c.count} words</div>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {v.chapters.length
              ? `${wordCount} words selected`
              : vocabOn
                ? "Select at least one chapter"
                : "Chapters are only needed for vocabulary questions"}
          </p>
        </section>

        {/* length */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">How long?</h2>
          <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-1 text-sm">
            {(["questions", "marks"] as const).map((m) => (
              <button
                key={m}
                onClick={() => set("mode", m)}
                className={`rounded-lg px-3 py-1.5 ${v.mode === m ? "bg-white font-medium shadow-sm" : "text-slate-600"}`}
              >
                {m === "questions" ? "Number of questions" : "Total marks"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(v.mode === "questions" ? [10, 20, 30, 50] : [10, 25, 50, 100]).map((n) => {
              const cur = v.mode === "questions" ? v.count : v.targetMarks;
              return (
                <button
                  key={n}
                  onClick={() => set(v.mode === "questions" ? "count" : "targetMarks", n)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${cur === n ? "bg-indigo-600 text-white" : "bg-slate-100 hover:bg-slate-200"}`}
                >
                  {n}
                </button>
              );
            })}
            <input
              type="number"
              min={1}
              max={200}
              value={v.mode === "questions" ? v.count : v.targetMarks}
              onChange={(e) =>
                set(v.mode === "questions" ? "count" : "targetMarks", Math.max(1, Math.min(200, Number(e.target.value) || 1)))
              }
              className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
            <span className="text-sm text-slate-500">{v.mode === "questions" ? "questions" : "marks"}</span>
          </div>
        </section>

        {/* types */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Question types</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {TYPE_INFO.map((t) => {
              const on = v.types.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleType(t.id)}
                  className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-left ${
                    on ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${
                      on ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"
                    }`}
                  >
                    {on && "✓"}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block text-xs text-slate-500">{t.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {grammarOn && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Grammar topics (from the lectures)</h2>
              <div className="flex gap-1.5">
                <button
                  onClick={() =>
                    set("grammarTopics", [
                      ...GRAMMAR_TOPICS,
                      ...v.grammarTopics.filter((t) => (OPTIONAL_TOPICS as readonly string[]).includes(t)),
                    ])
                  }
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium hover:bg-slate-200"
                >
                  All
                </button>
                <button onClick={() => set("grammarTopics", [])} className="rounded-full px-3 py-1 text-xs text-slate-500 hover:bg-slate-100">
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {GRAMMAR_TOPICS.map((t) => {
                const on = v.grammarTopics.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTopic(t)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-left text-sm ${
                      on ? "border-indigo-500 bg-indigo-50 text-indigo-900" : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span>{TOPIC_INFO[t].label}</span>
                    <span dir="rtl" lang="ur" className="urdu text-xs leading-normal text-slate-500">
                      {TOPIC_INFO[t].ur}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3">
              <div className="mb-2 text-sm font-semibold text-violet-900">Optional: Akkusativ &amp; Dativ</div>
              <div className="flex flex-wrap gap-2">
                {OPTIONAL_TOPICS.map((t) => {
                  const on = v.grammarTopics.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTopic(t)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm ${
                        on ? "border-violet-600 bg-violet-600 text-white" : "border-violet-300 bg-white text-violet-800 hover:bg-violet-100"
                      }`}
                    >
                      <span>{on ? "✓" : "+"}</span>
                      {TOPIC_INFO[t].label}
                      <span className={`text-xs ${on ? "text-violet-100" : "text-violet-500"}`}>{TOPIC_INFO[t].ur}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="mb-1 font-semibold">How marks work (learning first!)</div>
          <ul className="list-disc space-y-0.5 pl-5">
            <li>Important words (★ bold in the book) and verbs are worth more; minor words less.</li>
            <li>A wrong answer costs only −{WRONG_PENALTY} and you can try again.</li>
            <li>Right on a retry = half marks. Using a hint costs {HINT_COST}.</li>
            <li>Article colours: <b className="text-der">der</b> · <b className="text-die">die</b> · <b className="text-das">das</b></li>
          </ul>
        </section>

        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <button
          disabled={!canStart}
          onClick={() => onStart({ ...v, reviewIds: undefined, reviewItemIds: undefined })}
          className="w-full rounded-2xl bg-indigo-600 py-3.5 text-lg font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Preparing…" : "Start quiz"}
        </button>
      </div>
    </div>
  );
}
