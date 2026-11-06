"use client";

import { useRef, useState } from "react";
import data from "@/data/lesen.json";
import { nowSeconds, PartHeader, RANDOM_ID, RANDOM_TITLE, saveMock, ScoreBox, shuffle, TestPicker, useSavedName, type SaveState } from "./mock";
import { SpeakButton, Urdu } from "./Word";

type Item = {
  id: string;
  teil: number;
  question: string;
  answer: number;
  en: string;
  ur: string;
  text?: string;
  choices?: string[];
  sign?: string;
};
type Test = { id: string; title: string; texts: Record<string, { title: string; de: string }>; items: Item[] };
type PartKey = keyof typeof data.parts;

const TESTS = data.tests as Test[];
const RF = ["Richtig", "Falsch"];

/** A new test mixed from all Modelltests: 2 texts (Teil 1), 5 ads (Teil 2), 5 signs (Teil 3). */
function makeRandom(): Test {
  const blocks = shuffle(
    TESTS.flatMap((t) =>
      Object.entries(t.texts).map(([k, v]) => ({
        key: `${t.id}-${k}`,
        text: v,
        items: t.items.filter((it) => it.teil === 1 && it.text === k).map((it) => ({ ...it, text: `${t.id}-${k}` })),
      })),
    ),
  ).slice(0, 2);
  const all = TESTS.flatMap((t) => t.items);
  return {
    id: RANDOM_ID,
    title: RANDOM_TITLE,
    texts: Object.fromEntries(blocks.map((b) => [b.key, b.text])),
    items: [
      ...blocks.flatMap((b) => b.items),
      ...shuffle(all.filter((it) => it.teil === 2)).slice(0, 5),
      ...shuffle(all.filter((it) => it.teil === 3)).slice(0, 5),
    ],
  };
}

export default function LesenTest() {
  const [testId, setTestId] = useState(TESTS[0].id);
  const [name, setName] = useSavedName();
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [randomTest, setRandomTest] = useState<Test | null>(null);
  const startedAt = useRef(0);

  const test = (testId === RANDOM_ID && randomTest) || TESTS.find((t) => t.id === testId)!;
  const score = test.items.filter((it) => chosen[it.id] === it.answer).length;

  const reset = (id: string) => {
    if (id === RANDOM_ID) setRandomTest(makeRandom());
    setTestId(id);
    setChosen({});
    setSubmitted(false);
    setSaveState("idle");
    startedAt.current = 0;
  };

  const pick = (id: string, i: number) => {
    if (!startedAt.current) startedAt.current = nowSeconds();
    setChosen((c) => ({ ...c, [id]: i }));
  };

  const submit = async () => {
    setSubmitted(true);
    window.scrollTo(0, 0);
    setSaveState("saving");
    setSaveState(
      await saveMock({
        name,
        section: "lesen",
        testId,
        score,
        maxScore: test.items.length,
        durationSeconds: startedAt.current ? Math.round(nowSeconds() - startedAt.current) : null,
        answers: test.items.map((it) => ({ itemId: it.id, chosen: chosen[it.id] ?? null, correct: chosen[it.id] === it.answer })),
      }),
    );
  };

  const optionButtons = (it: Item, labels: string[], twoCol = true) => (
    <div className={`mt-2 grid gap-2 ${twoCol ? "grid-cols-2" : ""}`}>
      {labels.map((o, i) => {
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
            onClick={() => pick(it.id, i)}
            className={`whitespace-pre-line rounded-xl border px-3 py-2 text-left text-sm ${cls}`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );

  const explanation = (it: Item) =>
    submitted && (
      <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
        <div className="text-slate-600">💡 {it.en}</div>
        <Urdu className="text-[15px] text-slate-700">{it.ur}</Urdu>
      </div>
    );

  return (
    <div className="space-y-5">
      <TestPicker tests={TESTS} random section="lesen" value={testId} onChange={reset} name={name} onName={setName} locked={submitted} />

      {submitted && <ScoreBox score={score} max={test.items.length} saveState={saveState} onRetry={() => reset(testId)} />}

      {[1, 2, 3].map((teil) => {
        const info = data.parts[String(teil) as PartKey];
        const items = test.items.filter((it) => it.teil === teil);
        return (
          <section key={teil} className="rounded-2xl bg-white p-5 shadow-sm">
            <PartHeader {...info} />

            {teil === 1 &&
              Object.entries(test.texts).map(([key, t]) => (
                <div key={key} className="mt-4">
                  <div className="whitespace-pre-line rounded-xl border-l-4 border-amber-400 bg-amber-50/60 px-4 py-3 text-[15px] leading-relaxed">
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase text-amber-700">
                      {t.title}
                      <SpeakButton text={t.de} />
                    </div>
                    {t.de}
                  </div>
                  <div className="mt-3 space-y-3">
                    {items
                      .filter((it) => it.text === key)
                      .map((it) => (
                        <div key={it.id}>
                          <div className="font-medium">
                            <span className="mr-2 text-slate-400">{test.items.indexOf(it) + 1}.</span>
                            {it.question}
                          </div>
                          {optionButtons(it, RF)}
                          {explanation(it)}
                        </div>
                      ))}
                  </div>
                </div>
              ))}

            {teil === 2 && (
              <div className="mt-4 space-y-5">
                {items.map((it) => (
                  <div key={it.id}>
                    <div className="font-medium">
                      <span className="mr-2 text-slate-400">{test.items.indexOf(it) + 1}.</span>
                      {it.question}
                    </div>
                    {optionButtons(
                      it,
                      (it.choices ?? []).map((c, i) => `${"ab"[i]})  ${c}`),
                    )}
                    {explanation(it)}
                  </div>
                ))}
              </div>
            )}

            {teil === 3 && (
              <div className="mt-4 space-y-5">
                {items.map((it) => (
                  <div key={it.id}>
                    <div className="mb-2 inline-block whitespace-pre-line rounded-lg border-2 border-slate-700 bg-yellow-50 px-4 py-2 font-medium shadow-sm">
                      {it.sign}
                    </div>
                    <div className="font-medium">
                      <span className="mr-2 text-slate-400">{test.items.indexOf(it) + 1}.</span>
                      {it.question}
                    </div>
                    {optionButtons(it, RF)}
                    {explanation(it)}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {!submitted && (
        <div className="text-center">
          <button onClick={submit} className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-white hover:bg-amber-600">
            Abgeben – check answers
          </button>
        </div>
      )}
    </div>
  );
}
