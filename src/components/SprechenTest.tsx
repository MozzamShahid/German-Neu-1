"use client";

import { useEffect, useState } from "react";
import data from "@/data/sprechen.json";
import audioManifest from "@/data/hoeren-audio.json";
import { aiCheck, type AiResult } from "./AiFeedback";
import { AnswerBox } from "./speech";
import { PartHeader, RANDOM_ID, RANDOM_TITLE, saveMock, shuffle, TestPicker, useSavedName, type SaveState } from "./mock";
import { speak, SpeakButton, Urdu } from "./Word";

const MANIFEST = audioManifest as Record<string, { file: string; hash: string }>;

/** Plays the partner's sentence with the ElevenLabs recording, or the browser voice as a fallback. */
function playPartner(key: string, text: string) {
  const rec = MANIFEST[key];
  if (rec) new Audio(`/audio/hoeren/${rec.file}?v=${rec.hash}`).play().catch(() => speak(text));
  else speak(text);
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
        <AnswerBox label="Ihre Vorstellung" rows={4} hints={data.hints.intro} keyterms={data.intro.keywords} onCheck={run("intro", { role: "intro" })} result={results.intro} />
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
              <AnswerBox label={`① Stellen Sie eine Frage mit „${c.word}“`} hints={data.hints.ask} keyterms={[c.word]} onCheck={run(`ask${i}`, { role: "ask", card: i })} result={results[`ask${i}`]} />
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
              <AnswerBox label="Ihre Antwort" hints={data.hints.answer} onCheck={run(`answer${i}`, { role: "answer", card: i })} result={results[`answer${i}`]} />
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
              <AnswerBox label="① Ihre Bitte" placeholder="Können Sie bitte …?" hints={data.hints.bitte} keyterms={[c.word]} onCheck={run(`bitte${i}`, { role: "bitte", card: i })} result={results[`bitte${i}`]} />
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
              <AnswerBox label="Ihre Reaktion" placeholder="Ja, gern. / Nein, leider …" hints={data.hints.react} onCheck={run(`react${i}`, { role: "react", card: i })} result={results[`react${i}`]} />
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
      <AnswerBox key={s.id} label="Auf Deutsch:" hints={data.hints.translate} onCheck={check} result={result} />
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
