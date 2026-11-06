"use client";

import { useEffect, useRef, useState } from "react";
import data from "@/data/sprechen.json";
import audioManifest from "@/data/hoeren-audio.json";
import AiFeedback, { aiCheck, type AiResult } from "./AiFeedback";
import { PartHeader, RANDOM_ID, RANDOM_TITLE, saveMock, shuffle, TestPicker, useSavedName, type SaveState } from "./mock";
import { speak, SpeakButton, Urdu } from "./Word";

const MANIFEST = audioManifest as Record<string, { file: string; hash: string }>;

/* ---------------- speech recognition (browser, de-DE) ---------------- */

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getRecognition(): Rec | null {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C ? new C() : null;
}

/** Plays the partner's sentence with the ElevenLabs recording, or the browser voice as a fallback. */
function playPartner(key: string, text: string) {
  const rec = MANIFEST[key];
  if (rec) new Audio(`/audio/hoeren/${rec.file}?v=${rec.hash}`).play().catch(() => speak(text));
  else speak(text);
}

/* ---------------- one spoken answer ---------------- */

function AnswerBox({
  label,
  placeholder,
  onCheck,
  result,
  rows = 2,
}: {
  label: string;
  placeholder?: string;
  onCheck: (text: string) => Promise<void>;
  result?: AiResult;
  rows?: number;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [checking, setChecking] = useState(false);
  const [micError, setMicError] = useState("");
  const recRef = useRef<Rec | null>(null);
  const base = useRef("");

  useEffect(() => () => recRef.current?.stop(), []);

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = getRecognition();
    if (!rec) {
      setMicError("Speech recognition is not available in this browser. Use Chrome, or type your answer.");
      return;
    }
    setMicError("");
    rec.lang = "de-DE";
    rec.continuous = true;
    rec.interimResults = true;
    base.current = text ? text.trim() + " " : "";
    rec.onresult = (e) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setText((base.current + finalText + interim).replace(/\s+/g, " "));
    };
    rec.onerror = (e) => setMicError(e.error === "not-allowed" ? "Microphone permission was denied." : `Mic error: ${e.error}`);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const check = async () => {
    recRef.current?.stop();
    if (!text.trim()) return;
    setChecking(true);
    await onCheck(text.trim());
    setChecking(false);
  };

  return (
    <div className="mt-2">
      <div className="mb-1 text-sm font-medium text-slate-600">{label}</div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={toggleMic}
          title="Speak (German)"
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ${listening ? "animate-pulse bg-rose-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
        >
          {listening ? "■" : "🎤"}
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={rows}
          spellCheck={false}
          placeholder={placeholder ?? "Press 🎤 and speak German, or type here"}
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-[15px]"
        />
        <button
          onClick={check}
          disabled={checking || !text.trim()}
          className="shrink-0 self-start rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {checking ? "…" : result ? "Again" : "Check"}
        </button>
      </div>
      {micError && <div className="mt-1 text-xs text-rose-600">{micError}</div>}
      {result && (
        <div className="mt-2">
          <AiFeedback r={result} />
        </div>
      )}
    </div>
  );
}

/* ---------------- exam mode ---------------- */

type Test = (typeof data.tests)[number] & { src2?: string; src3?: string };

/** Teil 2 cards from one Modelltest (one theme), Teil 3 cards from another. */
function makeRandom(): Test {
  const [a, b] = shuffle(data.tests);
  return { id: RANDOM_ID, title: RANDOM_TITLE, theme2: a.theme2, cards2: a.cards2, cards3: b.cards3, src2: a.id, src3: b.id };
}

function ExamMode({ test, name }: { test: Test; name: string }) {
  const [results, setResults] = useState<Record<string, AiResult>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showExample, setShowExample] = useState(false);

  const src2 = test.src2 ?? test.id;
  const src3 = test.src3 ?? test.id;
  const run = (key: string, body: Record<string, unknown>) => async (text: string) => {
    const src = body.role === "bitte" || body.role === "react" ? src3 : src2;
    const r = await aiCheck({ kind: "sprechen", testId: src, text, ...body });
    setResults((s) => ({ ...s, [key]: r }));
    setSaveState("idle");
  };

  const points = (k: string) => (typeof results[k]?.score === "number" ? results[k].score! : 0);
  const keys = [
    "intro",
    ...test.cards2.flatMap((_, i) => [`ask${i}`, `answer${i}`]),
    ...test.cards3.flatMap((_, i) => [`bitte${i}`, `react${i}`]),
  ];
  const total = keys.reduce((s, k) => s + points(k), 0);
  const done = keys.filter((k) => results[k]).length;

  const save = async () => {
    setSaveState("saving");
    setSaveState(
      await saveMock({
        name,
        section: "sprechen",
        testId: test.id,
        score: total,
        maxScore: 15,
        durationSeconds: null,
        answers: keys.map((k) => ({ itemId: `${test.id}-${k}`, score: results[k]?.score ?? null, corrected: results[k]?.corrected ?? null })),
      }),
    );
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <PartHeader {...data.intro} />
        <div className="mt-3 flex flex-wrap gap-2">
          {data.intro.keywords.map((k) => (
            <span
              key={k}
              className={`rounded-lg border-2 px-3 py-1 font-medium ${results.intro?.covered?.includes(k) ? "border-emerald-500 bg-emerald-50" : "border-slate-300"}`}
            >
              {k}?
            </span>
          ))}
        </div>
        <AnswerBox label="Ihre Vorstellung" rows={4} onCheck={run("intro", { role: "intro" })} result={results.intro} />
        <button onClick={() => setShowExample(!showExample)} className="mt-2 text-sm text-indigo-600 hover:underline">
          {showExample ? "Hide example" : "Show an example"}
        </button>
        {showExample && (
          <div className="mt-1 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <span className="flex-1">{data.intro.example}</span>
            <SpeakButton text={data.intro.example} />
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <PartHeader {...data.teil2} />
        <div className="mt-4 space-y-6">
          {test.cards2.map((c, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-4">
              <div className="mx-auto w-48 rounded-xl border-2 border-slate-700 bg-yellow-50 p-3 text-center shadow">
                <div className="text-xs text-slate-500">Thema: {test.theme2}</div>
                <div className="mt-1 text-xl font-bold">{c.word}</div>
              </div>
              <AnswerBox label={`① Stellen Sie eine Frage mit „${c.word}“`} onCheck={run(`ask${i}`, { role: "ask", card: i })} result={results[`ask${i}`]} />
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600">
                ② Ihr Partner fragt:
                <button
                  onClick={() => playPartner(`sp-${src2}-c2-${i}-0`, c.partner)}
                  className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 hover:bg-indigo-200"
                >
                  ▶ Hören
                </button>
                {results[`answer${i}`] && <span className="text-slate-500">„{c.partner}“</span>}
              </div>
              <AnswerBox label="Ihre Antwort" onCheck={run(`answer${i}`, { role: "answer", card: i })} result={results[`answer${i}`]} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <PartHeader {...data.teil3} />
        <div className="mt-4 space-y-6">
          {test.cards3.map((c, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-4">
              <div className="mx-auto w-40 rounded-xl border-2 border-slate-700 bg-white p-3 text-center shadow">
                <div className="text-5xl">{c.emoji}</div>
                <div className="mt-1 text-xs text-slate-400">{c.word}</div>
              </div>
              <AnswerBox label="① Ihre Bitte" placeholder="Können Sie bitte …?" onCheck={run(`bitte${i}`, { role: "bitte", card: i })} result={results[`bitte${i}`]} />
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600">
                ② Ihr Partner bittet:
                <button
                  onClick={() => playPartner(`sp-${src3}-c3-${i}-0`, c.partner)}
                  className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 hover:bg-indigo-200"
                >
                  ▶ Hören
                </button>
                {results[`react${i}`] && <span className="text-slate-500">„{c.partner}“</span>}
              </div>
              <AnswerBox label="Ihre Reaktion" placeholder="Ja, gern. / Nein, leider …" onCheck={run(`react${i}`, { role: "react", card: i })} result={results[`react${i}`]} />
            </div>
          ))}
        </div>
      </section>

      <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-900 px-5 py-3 text-white shadow-lg">
        <div>
          <span className="text-xl font-bold">{Math.round(total * 10) / 10} / 15</span>
          <span className="ml-2 text-sm text-slate-300">
            Goethe {Math.round((total / 15) * 25 * 10) / 10}/25 · {done}/{keys.length} answered
          </span>
        </div>
        <button
          onClick={save}
          disabled={!done || saveState === "saving" || saveState === "saved"}
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold hover:bg-amber-600 disabled:opacity-50"
        >
          {saveState === "saved" ? "✓ Saved" : saveState === "off" ? "Enter name ↑" : saveState === "error" ? "Retry save" : "Save result"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Urdu -> German speaking practice ---------------- */

const TOPICS = ["wortstellung", "konjugation", "modalverben", "trennbar", "vergangenheit", "uhrzeit", "redemittel"];
type Sentence = { id: number; de: string; en: string; ur: string };

const tokens = (s: string) =>
  s.toLowerCase().replace(/ß/g, "ss").replace(/[^a-zäöü0-9\s]/g, " ").split(/\s+/).filter(Boolean);

/** Share of reference words the learner said (in any order) – a quick check without AI. */
function overlap(said: string, ref: string) {
  const a = tokens(said);
  const b = tokens(ref);
  const pool = [...a];
  let hit = 0;
  for (const w of b) {
    const i = pool.indexOf(w);
    if (i >= 0) {
      hit++;
      pool.splice(i, 1);
    }
  }
  return b.length ? hit / Math.max(b.length, a.length) : 0;
}

function TranslateMode() {
  const [list, setList] = useState<Sentence[]>([]);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<AiResult | undefined>();
  const [reveal, setReveal] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    fetch(`/api/sentences?topic=${topic}`)
      .then((r) => r.json())
      .then((d) => setList((d.sentences as Sentence[]).filter((s) => /[؀-ۿ]/.test(s.ur))));
  }, [round]);

  const s = list[idx];
  const next = () => {
    setResult(undefined);
    setReveal(false);
    if (idx + 1 < list.length) setIdx(idx + 1);
    else {
      setIdx(0);
      setRound((r) => r + 1);
    }
  };

  if (!s) return <div className="p-10 text-center text-slate-400">Loading sentences…</div>;

  const check = async (text: string) => {
    const local = overlap(text, s.de);
    const r = await aiCheck({ kind: "sprechen", role: "translate", text, reference_de: s.de, reference_en: s.en, reference_ur: s.ur });
    if (r.configured === false) {
      setResult({
        configured: true,
        result: local >= 0.85 ? "full" : local >= 0.5 ? "partial" : "wrong",
        corrected: s.de,
        feedback_en: `You matched ${Math.round(local * 100)} % of the words. (AI feedback is not set up yet.)`,
      });
    } else setResult(r);
    setReveal(true);
  };

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Urdu → Deutsch sprechen</h2>
      <p className="text-sm text-slate-500">Read the Urdu sentence and say it in German. Sentences come from your lecture topics.</p>
      <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-4">
        <Urdu className="text-2xl text-emerald-900">{s.ur}</Urdu>
        <div className="mt-1 text-sm text-slate-500">{s.en}</div>
      </div>
      <AnswerBox key={s.id} label="Auf Deutsch:" onCheck={check} result={result} />
      <div className="mt-3 flex items-center justify-between">
        <button onClick={() => setReveal(true)} className="text-sm text-indigo-600 hover:underline">
          Show answer
        </button>
        <button onClick={next} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          Next →
        </button>
      </div>
      {reveal && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <span className="flex-1 font-medium">{s.de}</span>
          <SpeakButton text={s.de} />
        </div>
      )}
    </section>
  );
}

/* ---------------- page ---------------- */

export default function SprechenTest() {
  const [mode, setMode] = useState<"exam" | "translate">("exam");
  const [testId, setTestId] = useState(data.tests[0].id);
  const [name, setName] = useSavedName();
  const [randomTest, setRandomTest] = useState<Test | null>(null);
  const [round, setRound] = useState(0);
  const test: Test = (testId === RANDOM_ID && randomTest) || data.tests.find((t) => t.id === testId)!;
  const pickTest = (id: string) => {
    if (id === RANDOM_ID) {
      setRandomTest(makeRandom());
      setRound((r) => r + 1);
    }
    setTestId(id);
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(
          [
            ["exam", "🎓 Prüfung Teil 1–3"],
            ["translate", "🔁 Urdu → Deutsch"],
          ] as const
        ).map(([m, l]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${mode === m ? "bg-indigo-600 text-white" : "bg-white text-slate-600 shadow-sm"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        🎤 works best in Chrome / Edge. Allow the microphone, speak clearly, then press ■. You can also correct the text by typing.
      </p>
      {mode === "exam" ? (
        <>
          <TestPicker tests={data.tests} random section="sprechen" value={testId} onChange={pickTest} name={name} onName={setName} locked={false} />
          <ExamMode key={`${testId}-${round}`} test={test} name={name} />
        </>
      ) : (
        <TranslateMode />
      )}
    </div>
  );
}
