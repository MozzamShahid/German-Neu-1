"use client";

import { useState } from "react";
import type { Lesson } from "@/data/lessons";
import { SpeakButton, Urdu } from "./Word";

interface Sentence {
  id: number;
  de: string;
  en: string;
  ur: string;
}

const HAS_SENTENCES = new Set([
  "wortstellung", "konjugation", "pronomen", "artikel", "modalverben", "trennbar", "vergangenheit",
  "uhrzeit", "wortbildung", "redemittel", "akkusativ", "dativ", "wechsel",
]);

export default function LessonView({ lesson, defaultOpen = false }: { lesson: Lesson; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [sentences, setSentences] = useState<Sentence[] | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSentences = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/sentences?topic=${lesson.id}`);
      const d = await r.json();
      setSentences(d.sentences);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id={lesson.id} className="scroll-mt-4 rounded-2xl bg-white shadow-sm">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <div>
          <div className="text-xs font-medium text-indigo-600">
            {lesson.week}
            {lesson.optional && <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">optional</span>}
          </div>
          <h2 className="text-lg font-semibold">{lesson.title}</h2>
        </div>
        <span className="text-xl text-slate-400">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">
          <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-slate-700">
            {lesson.en.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
          <div className="rounded-xl bg-emerald-50 px-4 py-2">
            {lesson.ur.map((x, i) => (
              <Urdu key={i} className="text-[17px] text-emerald-900">
                {x}
              </Urdu>
            ))}
          </div>

          {lesson.tables?.map((t, ti) => (
            <div key={ti} className="overflow-x-auto">
              {t.caption && <div className="mb-1 text-sm font-semibold text-slate-500">{t.caption}</div>}
              <table className="w-full border-collapse text-sm">
                {t.head.some(Boolean) && (
                  <thead>
                    <tr>
                      {t.head.map((h, i) => (
                        <th key={i} className="border border-slate-200 bg-slate-50 px-2 py-1.5 text-left font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {t.rows.map((r, ri) => (
                    <tr key={ri}>
                      {r.map((c, ci) => (
                        <td
                          key={ci}
                          className={`border border-slate-200 px-2 py-1.5 ${/[؀-ۿ]/.test(c) ? "urdu text-right" : ""}`}
                          dir={/[؀-ۿ]/.test(c) ? "rtl" : undefined}
                        >
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {lesson.examples && (
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-500">Beispiele</div>
              <div className="space-y-2">
                {lesson.examples.map(([de, en, ur], i) => (
                  <ExampleRow key={i} de={de} en={en} ur={ur} />
                ))}
              </div>
            </div>
          )}

          {HAS_SENTENCES.has(lesson.id) && (
            <div>
              <button
                onClick={loadSentences}
                disabled={loading}
                className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                {loading ? "Loading…" : sentences ? "↻ More daily-life sentences" : "Show daily-life sentences"}
              </button>
              {sentences && (
                <div className="mt-3 space-y-2">
                  {sentences.map((s) => (
                    <ExampleRow key={s.id} de={s.de} en={s.en} ur={s.ur} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ExampleRow({ de, en, ur }: { de: string; en: string; ur: string }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{de}</span>
        <SpeakButton text={de} />
      </div>
      <div className="text-sm text-slate-500">{en}</div>
      {ur && ur !== en && <Urdu className="text-[15px] text-slate-700">{ur}</Urdu>}
    </div>
  );
}
