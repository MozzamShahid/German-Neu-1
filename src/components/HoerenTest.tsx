"use client";

import { useRef, useState } from "react";
import data from "@/data/hoeren.json";
import audioManifest from "@/data/hoeren-audio.json";
import { RANDOM_ID, RANDOM_TITLE, saveMock, shuffle, TestPicker } from "./mock";
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

/** A new test mixed from all Modelltests, with the exam structure: 6 + 4 + 5 items. */
function makeRandom() {
  const all = TESTS.flatMap((t) => t.items);
  const pick = (teil: number, n: number) => shuffle(all.filter((it) => it.teil === teil)).slice(0, n);
  return { id: RANDOM_ID, title: RANDOM_TITLE, items: [...pick(1, 6), ...pick(2, 4), ...pick(3, 5)] };
}
const seconds = () => Date.now() / 1000;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- sound effects (Web Audio): telephone line for Teil 3, hall echo for Teil 2 ---------- */

type Effect = "phone" | "hall" | null;
let ctx: AudioContext | null = null;
let hallIR: AudioBuffer | null = null;

function audioCtx() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** A synthetic impulse response: decaying noise = the echo of a big station hall. */
function hallImpulse(c: AudioContext) {
  const len = Math.floor(c.sampleRate * 1.6);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5);
  }
  return buf;
}

function connectEffect(audio: HTMLAudioElement, effect: Effect) {
  if (!effect) return;
  try {
    const c = audioCtx();
    const src = c.createMediaElementSource(audio);
    if (effect === "phone") {
      // telephone band 400–3000 Hz, a bit louder
      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 400;
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3000;
      const peak = c.createBiquadFilter();
      peak.type = "peaking";
      peak.frequency.value = 1500;
      peak.gain.value = 6;
      const gain = c.createGain();
      gain.gain.value = 1.3;
      src.connect(hp).connect(lp).connect(peak).connect(gain).connect(c.destination);
    } else {
      const conv = c.createConvolver();
      conv.buffer = hallIR ??= hallImpulse(c);
      const dry = c.createGain();
      dry.gain.value = 0.85;
      const wet = c.createGain();
      wet.gain.value = 0.35;
      src.connect(dry).connect(c.destination);
      src.connect(conv).connect(wet).connect(c.destination);
    }
  } catch {
    // no Web Audio: play without the effect
  }
}

/** Plays one audio file to the end (or until stopped). */
function playFile(src: string, stop: { current: boolean }, volume = 1, effect: Effect = null) {
  const audio = new Audio(src);
  audio.volume = volume;
  connectEffect(audio, effect);
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

function playSystem(key: string, stop: { current: boolean }) {
  const rec = MANIFEST[key];
  return rec ? playFile(`/audio/hoeren/${rec.file}?v=${rec.hash}`, stop) : Promise.resolve();
}

/** waits, but returns early when stopped */
async function pause(ms: number, stop: { current: boolean }) {
  for (let t = 0; t < ms && !stop.current; t += 100) await wait(100);
}

/**
 * Plays an item like in the exam: a quiet background (station, café, …) under the voices,
 * a gong + hall echo for announcements, a beep + telephone sound for phone messages.
 * Falls back to the browser voice if a recording is missing.
 */
async function playLines(item: Item, stop: { current: boolean }) {
  const part = data.parts[String(item.teil) as PartKey] as { intro?: string };
  const intro = part.intro;
  const effect: Effect = item.teil === 3 ? "phone" : item.teil === 2 ? "hall" : null;
  let bg: HTMLAudioElement | null = null;
  if (item.scene) {
    bg = new Audio(`/audio/sfx/${item.scene}.mp3`);
    bg.loop = true;
    bg.volume = 0.22;
    bg.play().catch(() => {});
    await pause(1200, stop);
  }
  try {
    if (intro && !stop.current) {
      await playFile(`/audio/sfx/${intro}.mp3`, stop, 0.6);
      await pause(400, stop);
    }
    for (let i = 0; i < item.lines.length; i++) {
      if (stop.current) return;
      const rec = MANIFEST[`${item.id}-${i}`];
      if (rec) await playFile(`/audio/hoeren/${rec.file}?v=${rec.hash}`, stop, 1, effect);
      else {
        speak(item.lines[i].de);
        await pause(item.lines[i].de.length * 75, stop);
      }
      await pause(500, stop);
    }
    if (bg) await pause(800, stop);
  } finally {
    bg?.pause();
  }
}

/** The Goethe exam sequence: "Aufgabe N" → reading time → text → "noch einmal" → text again. */
async function playExam(item: Item, n: number, times: number, stop: { current: boolean }, phase: (p: string) => void) {
  phase("📢 Aufgabe " + n);
  await playSystem(`sys-aufgabe-${n}`, stop);
  phase("📖 Lesezeit – read the question");
  await pause(4000, stop);
  for (let k = 1; k <= times && !stop.current; k++) {
    if (k > 1) {
      phase("🔁 noch einmal");
      await pause(1200, stop);
      await playSystem("sys-noch-einmal", stop);
      await pause(800, stop);
    }
    phase(times > 1 ? `🎧 ${k}. Hören` : "🎧 Hören");
    await playLines(item, stop);
  }
  phase("");
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
  const [phase, setPhase] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [shownText, setShownText] = useState<Record<string, boolean>>({});
  const [randomTest, setRandomTest] = useState<(typeof TESTS)[number] | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "off" | "error">("idle");
  const stop = useRef({ current: false }).current;
  const startedAt = useRef(0);


  const test = (testId === RANDOM_ID && randomTest) || TESTS.find((t) => t.id === testId)!;
  const score = test.items.filter((it) => chosen[it.id] === it.answer).length;

  const reset = (id: string) => {
    stop.current = true;
    if (id === RANDOM_ID) setRandomTest(makeRandom());
    setTestId(id);
    setChosen({});
    setPlays({});
    setPlaying(null);
    setSubmitted(false);
    setShownText({});
    setSaveState("idle");
    startedAt.current = 0;
  };

  const play = async (item: Item) => {
    const limit = data.parts[String(item.teil) as PartKey].plays;
    const used = plays[item.id] ?? 0;
    const examRun = exam && !submitted;
    if (playing || (examRun && used >= 1)) return;
    if (!startedAt.current) startedAt.current = seconds();
    stop.current = false;
    audioCtx();
    setPlaying(item.id);
    setPlays((p) => ({ ...p, [item.id]: used + 1 }));
    if (examRun) await playExam(item, test.items.indexOf(item) + 1, limit, stop, setPhase);
    else await playLines(item, stop);
    setPhase("");
    setPlaying(null);
  };

  const submit = async () => {
    stop.current = true;
    setSubmitted(true);
    window.scrollTo(0, 0);
    setSaveState("saving");
    setSaveState(
      await saveMock({
        name,
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
    );
  };

  const parts = [1, 2, 3].map((teil) => ({
    teil,
    info: data.parts[String(teil) as PartKey],
    items: test.items.filter((it) => it.teil === teil),
  }));
  const answeredAll = test.items.every((it) => chosen[it.id] !== undefined);

  return (
    <div className="space-y-5">
      <TestPicker tests={TESTS} random section="hoeren" value={testId} onChange={reset} name={name} onName={setName} locked={submitted}>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={exam} disabled={submitted} onChange={(e) => setExam(e.target.checked)} />
          Prüfungsmodus
        </label>
      </TestPicker>

      {!submitted && (
        <div className="rounded-2xl bg-sky-50 p-4 text-sm text-slate-700 shadow-sm">
          <div className="font-semibold text-sky-800">So geht&apos;s – how it works</div>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            <li>Read the question first, then press <b>▶ Hören</b>. You hear a short scene (with background sounds like in the Goethe exam).</li>
            <li>Choose the answer (a / b / c, or richtig / falsch).</li>
            <li>At the end press <b>Abgeben</b>: you get your score, the full text and an explanation in English and Urdu.</li>
            <li><b>Prüfungsmodus</b> on = like the real exam: one click says &quot;Aufgabe …&quot;, gives reading time and plays the text (twice in Teil 1 and 3). Off = practice: listen as often as you like and see the text.</li>
          </ol>
          <Urdu className="mt-2 text-[15px] text-slate-700">
            پہلے سوال پڑھیں، پھر ▶ Hören دبائیں اور سنیں۔ جواب چنیں۔ آخر میں Abgeben دبائیں: نمبر، پوری تحریر اور اردو وضاحت ملے گی۔ Prüfungsmodus بند کریں تو جتنی بار چاہیں سنیں اور متن بھی دیکھ سکتے ہیں۔
          </Urdu>
        </div>
      )}

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
              const locked = exam && !submitted && used >= 1;
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
                      {playing === it.id ? "■ Stop" : locked ? "✓ gehört" : "▶ Hören"}
                      {exam && !submitted && !locked && playing !== it.id && (
                        <span className="ml-1 font-normal opacity-80">({info.plays}×)</span>
                      )}
                    </button>
                  </div>
                  {playing === it.id && phase && (
                    <div className="mt-2 animate-pulse text-sm font-medium text-indigo-700">{phase}</div>
                  )}

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

                  {!exam && !submitted && (plays[it.id] ?? 0) > 0 && (
                    <button
                      onClick={() => setShownText((t) => ({ ...t, [it.id]: !t[it.id] }))}
                      className="mt-2 text-sm text-indigo-600 hover:underline"
                    >
                      {shownText[it.id] ? "Text verbergen" : "📝 Text zeigen"}
                    </button>
                  )}
                  {(submitted || shownText[it.id]) && (
                    <div className="mt-3 space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      {it.lines.map((l, i) => (
                        <div key={i}>
                          <span className="mr-1 text-slate-400">{l.sp === "a" ? "📢" : l.sp.startsWith("f") ? "👩" : "👨"}</span>
                          {l.de}
                        </div>
                      ))}
                      {submitted && <div className="pt-1 text-slate-600">💡 {it.en}</div>}
                      {submitted && <Urdu className="text-[15px] text-slate-700">{it.ur}</Urdu>}
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
