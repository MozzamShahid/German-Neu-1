"use client";

import { useRef, useState } from "react";
import data from "@/data/hoeren.json";
import audioManifest from "@/data/hoeren-audio.json";
import { speak, Urdu } from "./Word";

type Line = { sp: string; de: string };
type Item = {
  id: string;
  teil: number;
  question: string;
  options: string[];
  answer: number;
  lines: Line[];
  en: string;
  ur: string;
  scene?: string;
};
type PartKey = keyof typeof data.parts;

const MANIFEST = audioManifest as Record<string, { file: string; hash: string }>;
const TESTS = data.tests as { id: string; title: string; items: Item[] }[];
const LETTERS = ["a", "b", "c"];
const seconds = () => Date.now() / 1000;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Plays one audio file to the end (or until stopped). */
function playFile(src: string, stop: { current: boolean }, volume = 1) {
  const audio = new Audio(src);
  audio.volume = volume;
  return new Promise<void>((resolve) => {
    const poll = setInterval(() => {
      if (stop.current) done();
    }, 200);
    function done() {
      clearInterval(poll);
      audio.pause();
      resolve();
    }
    audio.onended = done;
    audio.onerror = done;
    audio.play().catch(done);
  });
}

/**
 * Plays an item like in the exam: a quiet background (station, café, …) under the voices,
 * a gong before announcements and a beep before phone messages.
 * Falls back to the browser voice if a recording is missing.
 */
async function playLines(item: Item, stop: { current: boolean }) {
  const part = data.parts[String(item.teil) as PartKey] as { intro?: string };
  const intro = part.intro;
  let bg: HTMLAudioElement | null = null;
  if (item.scene) {
    bg = new Audio(`/audio/sfx/${item.scene}.mp3`);
    bg.loop = true;
    bg.volume = 0.22;
    bg.play().catch(() => {});
    await wait(1200);
  }
  try {
    if (intro && !stop.current) {
      await playFile(`/audio/sfx/${intro}.mp3`, stop, 0.6);
      await wait(400);
    }
    for (let i = 0; i < item.lines.length; i++) {
      if (stop.current) return;
      const rec = MANIFEST[`${item.id}-${i}`];
      if (rec) await playFile(`/audio/hoeren/${rec.file}?v=${rec.hash}`, stop);
      else {
        speak(item.lines[i].de);
        await wait(item.lines[i].de.length * 75);
      }
      await wait(500);
    }
    if (bg && !stop.current) await wait(800);
  } finally {
    bg?.pause();
  }
}

export default function HoerenTest() {
  const [testId, setTestId] = useState(TESTS[0].id);
  const [exam, setExam] = useState(true);
  const [name, setName] = useState(() => {
    try {
      return String(JSON.parse(localStorage.getItem("quiz-settings") ?? "{}").name ?? "");
    } catch {
      return "";
    }
  });
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [plays, setPlays] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "off" | "error">("idle");
  const stop = useRef({ current: false }).current;
  const startedAt = useRef(0);


  const test = TESTS.find((t) => t.id === testId)!;
  const score = test.items.filter((it) => chosen[it.id] === it.answer).length;

  const reset = (id: string) => {
    stop.current = true;
    setTestId(id);
    setChosen({});
    setPlays({});
    setPlaying(null);
    setSubmitted(false);
    setSaveState("idle");
    startedAt.current = 0;
  };

  const play = async (item: Item) => {
    const limit = data.parts[String(item.teil) as PartKey].plays;
    const used = plays[item.id] ?? 0;
    if (playing || (exam && !submitted && used >= limit)) return;
    if (!startedAt.current) startedAt.current = seconds();
    stop.current = false;
    setPlaying(item.id);
    setPlays((p) => ({ ...p, [item.id]: used + 1 }));
    await playLines(item, stop);
    setPlaying(null);
  };

  const submit = async () => {
    stop.current = true;
    setSubmitted(true);
    window.scrollTo(0, 0);
    if (!name.trim()) {
      setSaveState("off");
      return;
    }
    setSaveState("saving");
    try {
      const res = await fetch("/api/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          section: "hoeren",
          testId,
          mode: exam ? "exam" : "practice",
          score,
          maxScore: test.items.length,
          durationSeconds: startedAt.current ? Math.round(seconds() - startedAt.current) : null,
          answers: test.items.map((it) => ({
            itemId: it.id,
            chosen: chosen[it.id] ?? null,
            correct: chosen[it.id] === it.answer,
            plays: plays[it.id] ?? 0,
          })),
        }),
      });
      const d = await res.json();
      setSaveState(d.saved ? "saved" : d.reason === "Supabase not configured" ? "off" : "error");
    } catch {
      setSaveState("error");
    }
  };

  const parts = [1, 2, 3].map((teil) => ({
    teil,
    info: data.parts[String(teil) as PartKey],
    items: test.items.filter((it) => it.teil === teil),
  }));
  const answeredAll = test.items.every((it) => chosen[it.id] !== undefined);

  return (
    <div className="space-y-5">
      {/* settings */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
        {TESTS.map((t) => (
          <button
            key={t.id}
            onClick={() => reset(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${t.id === testId ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-amber-100"}`}
          >
            {t.title}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={exam} disabled={submitted} onChange={(e) => setExam(e.target.checked)} />
          Prüfungsmodus (limited plays)
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitted}
          placeholder="Your name (to save)"
          className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm sm:w-48"
        />
      </div>

      {submitted && (
        <div className="rounded-2xl bg-amber-50 p-5 text-center shadow-sm">
          <div className="text-4xl font-bold text-amber-700">
            {score} / {test.items.length}
          </div>
          <div className="mt-1 text-slate-600">
            Goethe scale: {Math.round((score / test.items.length) * 25 * 10) / 10} / 25 Punkte · pass ≈ 60 %
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {saveState === "saving" && "Saving…"}
            {saveState === "saved" && "✓ Saved to your history"}
            {saveState === "off" && "Not saved (enter your name to save next time)"}
            {saveState === "error" && "Could not save the result"}
          </div>
          <button onClick={() => reset(testId)} className="mt-3 rounded-xl bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600">
            ↻ Try again
          </button>
        </div>
      )}

      {parts.map(({ teil, info, items }) => (
        <section key={teil} className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{info.title}</h2>
          <p className="text-sm text-slate-500">{info.en}</p>
          <Urdu className="text-[15px] text-slate-600">{info.ur}</Urdu>

          <div className="mt-4 space-y-4">
            {items.map((it) => {
              const n = test.items.indexOf(it) + 1;
              const used = plays[it.id] ?? 0;
              const left = info.plays - used;
              const locked = exam && !submitted && left <= 0;
              return (
                <div key={it.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium">
                      <span className="mr-2 text-slate-400">{n}.</span>
                      {it.question}
                    </div>
                    <button
                      onClick={() => (playing === it.id ? (stop.current = true) : play(it))}
                      disabled={(!!playing && playing !== it.id) || locked}
                      className="shrink-0 rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
                    >
                      {playing === it.id ? "■ Stop" : "▶ Hören"}
                      {exam && !submitted && <span className="ml-1 font-normal opacity-80">({Math.max(0, left)}×)</span>}
                    </button>
                  </div>

                  <div className={`mt-3 grid gap-2 ${it.options.length === 2 ? "grid-cols-2" : "sm:grid-cols-3"}`}>
                    {it.options.map((o, i) => {
                      const picked = chosen[it.id] === i;
                      let cls = picked ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-300";
                      if (submitted) {
                        if (i === it.answer) cls = "border-emerald-500 bg-emerald-50";
                        else if (picked) cls = "border-rose-400 bg-rose-50";
                        else cls = "border-slate-200 opacity-60";
                      }
                      return (
                        <button
                          key={i}
                          disabled={submitted}
                          onClick={() => setChosen((c) => ({ ...c, [it.id]: i }))}
                          className={`rounded-xl border px-3 py-2 text-left text-sm ${cls}`}
                        >
                          {it.options.length > 2 && <span className="mr-1.5 font-semibold text-slate-400">{LETTERS[i]}</span>}
                          {o}
                        </button>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div className="mt-3 space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      {it.lines.map((l, i) => (
                        <div key={i}>
                          <span className="mr-1 text-slate-400">{l.sp === "a" ? "📢" : l.sp.startsWith("f") ? "👩" : "👨"}</span>
                          {l.de}
                        </div>
                      ))}
                      <div className="pt-1 text-slate-600">💡 {it.en}</div>
                      <Urdu className="text-[15px] text-slate-700">{it.ur}</Urdu>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {!submitted && (
        <div className="text-center">
          <button
            onClick={submit}
            className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Abgeben – check answers{!answeredAll && " (some unanswered)"}
          </button>
        </div>
      )}
    </div>
  );
}
