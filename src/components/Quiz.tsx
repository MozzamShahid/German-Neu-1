"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AnswerRecord, ChoiceQuestion, MatchQuestion, OrderQuestion, Question, SentenceInfo } from "@/lib/types";
import { choiceScore, matchScore, roundQuarter, WRONG_PENALTY } from "@/lib/scoring";
import { ArticleWord, SpeakButton, speak, Urdu, WordCardView } from "./Word";

const TYPE_LABEL: Record<Question["type"], string> = {
  meaning: "Meaning",
  reverse: "Reverse",
  article: "der / die / das",
  match: "Matching",
  grammar: "Grammatik",
};

const TOPIC_NAME: Record<string, string> = {
  konjugation: "Konjugation",
  wortstellung: "Satzbau",
  pronomen: "Pronomen",
  artikel: "Artikel",
  modalverben: "Modalverben",
  trennbar: "Trennbare Verben",
  vergangenheit: "Vergangenheit",
  zahlen: "Zahlen",
  uhrzeit: "Uhrzeit",
  wortbildung: "Wortbildung",
  redemittel: "Redemittel",
  akkusativ: "Akkusativ",
  dativ: "Dativ",
  wechsel: "Wechselpräpositionen",
};

const ARTICLE_BTN: Record<string, string> = {
  der: "text-der",
  die: "text-die",
  das: "text-das",
};

function badge(q: Question) {
  if (q.type === "grammar" && q.sentence) return `${TYPE_LABEL.grammar} · ${TOPIC_NAME[q.sentence.topic] ?? q.sentence.topic}`;
  return TYPE_LABEL[q.type];
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default function Quiz({
  questions,
  totalMarks,
  onFinish,
  onQuit,
}: {
  questions: Question[];
  totalMarks: number;
  onFinish: (answers: AnswerRecord[]) => void;
  onQuit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [current, setCurrent] = useState<AnswerRecord | null>(null);

  const q = questions[index];
  const score = roundQuarter(answers.reduce((s, a) => s + a.earned, 0));

  const next = useCallback(() => {
    if (!current) return;
    const all = [...answers, current];
    setAnswers(all);
    setCurrent(null);
    if (index + 1 >= questions.length) onFinish(all);
    else setIndex(index + 1);
  }, [answers, current, index, questions.length, onFinish]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between text-sm">
        <button onClick={onQuit} className="text-slate-500 hover:text-slate-800">
          ✕ Quit
        </button>
        <span className="font-medium">
          Question {index + 1} / {questions.length}
        </span>
        <span className="rounded-full bg-indigo-100 px-3 py-1 font-semibold text-indigo-800">
          {score} / {totalMarks}
        </span>
      </div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${((index + (current ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <div key={q.qid} className="pop">
        {q.type === "match" ? (
          <MatchView q={q} onDone={setCurrent} done={!!current} />
        ) : q.format === "order" ? (
          <OrderView q={q as OrderQuestion} onDone={setCurrent} />
        ) : (
          <ChoiceView q={q as ChoiceQuestion} onDone={setCurrent} done={!!current} />
        )}
      </div>

      {current && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className={`text-sm font-semibold ${current.earned > 0 ? "text-green-700" : "text-red-600"}`}>
            {current.earned > 0 ? "+" : ""}
            {current.earned} marks
          </span>
          <button
            autoFocus
            onClick={next}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-700"
          >
            {index + 1 >= questions.length ? "See results" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------- helpers
/** English + Urdu translation of the sentence (grammar questions). */
function Translation({ s }: { s: SentenceInfo }) {
  return (
    <div className="mt-3 rounded-xl bg-slate-50 px-4 py-2 text-center">
      <div className="text-sm text-slate-600">{s.en}</div>
      {s.ur && s.ur !== s.en && <Urdu className="text-base text-slate-700">{s.ur}</Urdu>}
    </div>
  );
}

/** Don't show the translation when the prompt already contains it (phrases) or it would give the answer away. */
function showTranslation(q: ChoiceQuestion) {
  if (!q.sentence) return false;
  if (q.sentence.topic === "zahlen" || q.sentence.topic === "wortbildung") return false;
  return !q.prompt.includes(q.sentence.en);
}

function Explanation({ lines, urdu, sentence }: { lines: string[]; urdu?: string[]; sentence?: SentenceInfo }) {
  return (
    <div className="space-y-1.5 text-sm text-slate-700">
      {lines.map((x, i) =>
        i === 0 && x.startsWith("✔") && sentence ? (
          <div key={i} className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <span>{x}</span>
            <SpeakButton text={sentence.de} />
          </div>
        ) : (
          <p key={i}>{x.includes(" = ") && i === 0 ? <b>{x}</b> : x}</p>
        ),
      )}
      {urdu?.map((x, i) => (
        <Urdu key={"u" + i} className="rounded-lg bg-emerald-50 px-3 py-1 text-[15px] text-emerald-900">
          {x}
        </Urdu>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ choice
function ChoiceView({
  q,
  onDone,
  done,
}: {
  q: ChoiceQuestion;
  onDone: (a: AnswerRecord) => void;
  done: boolean;
}) {
  const [wrong, setWrong] = useState<number[]>([]);
  const [hintsShown, setHintsShown] = useState(0);
  const [result, setResult] = useState<"correct" | "revealed" | null>(null);
  const [shake, setShake] = useState<number | null>(null);

  const retriesLeft = q.maxRetries - wrong.length + 1; // attempts remaining incl. current
  const finished = result !== null;

  const finish = useCallback(
    (correct: boolean, wrongCount: number) => {
      const earned = choiceScore(q.marks, wrongCount, correct, hintsShown > 0);
      setResult(correct ? "correct" : "revealed");
      onDone({
        qid: q.qid,
        type: q.type,
        entryIds: q.entryIds,
        marks: q.marks,
        earned,
        wrongAttempts: wrongCount,
        usedHint: hintsShown > 0,
        correct,
        firstTry: correct && wrongCount === 0,
        itemId: q.sentence?.itemId,
      });
      if (q.sentence && q.sentence.topic !== "zahlen") speak(q.sentence.de);
    },
    [q, hintsShown, onDone],
  );

  const choose = useCallback(
    (i: number) => {
      if (finished || done || wrong.includes(i)) return;
      if (i === q.answer) return finish(true, wrong.length);
      const w = [...wrong, i];
      setWrong(w);
      setShake(i);
      setTimeout(() => setShake(null), 400);
      if (w.length > q.maxRetries) finish(false, w.length);
    },
    [finished, done, wrong, q, finish],
  );

  // keyboard: 1-4 to answer, H for hint
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) choose(n - 1);
      if (e.key.toLowerCase() === "h" && !finished && hintsShown < q.hints.length) setHintsShown((h) => h + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, finished, hintsShown, q]);

  const isArticle = q.type === "article";
  const isGrammar = q.type === "grammar";

  return (
    <div>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{badge(q)}</span>
          <span className="text-slate-500">
            {q.card?.important && <span className="mr-1 text-amber-500">★ important</span>}
            {q.marks} marks
          </span>
        </div>
        <div className="py-4 text-center">
          {isGrammar ? (
            <div className="whitespace-pre-line text-xl font-semibold leading-snug sm:text-2xl">{q.prompt}</div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-3xl font-bold leading-tight sm:text-4xl">
              {finished && isArticle && q.card ? (
                <ArticleWord text={q.card.display} />
              ) : q.type === "meaning" ? (
                <ArticleWord text={q.prompt} />
              ) : (
                q.prompt
              )}
              {q.type === "meaning" && <SpeakButton text={q.prompt} />}
            </div>
          )}
          {isArticle && q.card && <div className="mt-2 text-slate-500">{q.card.meaning}</div>}
          {q.card?.ur && q.type === "reverse" && <Urdu className="mt-1 text-lg text-slate-600">{q.card.ur}</Urdu>}
          <div className="mt-2 text-sm text-slate-400">{q.subPrompt}</div>
          {isGrammar && q.sentence && showTranslation(q) && <Translation s={q.sentence} />}
        </div>

        <div
          className={`grid gap-2.5 ${
            isArticle ? "grid-cols-3" : q.format === "pick" || q.options.some((o) => o.length > 28) ? "grid-cols-1" : "sm:grid-cols-2"
          }`}
        >
          {q.options.map((opt, i) => {
            const isWrong = wrong.includes(i);
            const isAnswer = finished && i === q.answer;
            let cls = "border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50";
            if (isAnswer) cls = result === "correct" ? "border-green-500 bg-green-50" : "border-green-500 bg-green-50 ring-2 ring-green-200";
            else if (isWrong) cls = "border-red-300 bg-red-50 text-red-700 line-through opacity-70";
            else if (finished) cls = "border-slate-200 bg-white opacity-50";
            return (
              <button
                key={i}
                disabled={finished || isWrong}
                onClick={() => choose(i)}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left font-medium transition ${cls} ${
                  shake === i ? "shake" : ""
                } ${isArticle ? "justify-center text-xl" : ""}`}
              >
                {!isArticle && (
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs text-slate-500">
                    {i + 1}
                  </span>
                )}
                {isArticle ? (
                  <span className={`${ARTICLE_BTN[opt]} font-bold`}>{opt}</span>
                ) : q.type === "reverse" ? (
                  <ArticleWord text={opt} />
                ) : (
                  <span>{opt}</span>
                )}
              </button>
            );
          })}
        </div>

        {!finished && wrong.length > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
            <span>
              Not quite (−{WRONG_PENALTY}). {retriesLeft > 0 ? `Try again – ${retriesLeft} ${retriesLeft === 1 ? "try" : "tries"} left.` : ""}
            </span>
            <button onClick={() => finish(false, wrong.length)} className="font-medium underline">
              Show answer
            </button>
          </div>
        )}

        {!finished && (
          <div className="mt-4">
            {q.hints.slice(0, hintsShown).map((h, i) => (
              <div key={i} className="mb-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                💡 {h}
              </div>
            ))}
            {hintsShown < q.hints.length && (
              <button
                onClick={() => setHintsShown(hintsShown + 1)}
                className="text-sm font-medium text-amber-700 hover:text-amber-900"
              >
                💡 {hintsShown === 0 ? "Need a hint? (−0.25)" : "Another hint"}
              </button>
            )}
          </div>
        )}
      </div>

      {finished && <LearnPanel q={q} correct={result === "correct"} firstTry={result === "correct" && wrong.length === 0} />}
    </div>
  );
}

function LearnPanel({ q, correct, firstTry }: { q: ChoiceQuestion; correct: boolean; firstTry: boolean }) {
  return (
    <div className="pop mt-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className={`mb-2 font-semibold ${correct ? "text-green-700" : "text-red-600"}`}>
        {firstTry ? "✓ Richtig!" : correct ? "✓ Got it on retry" : "✗ The answer was:"}{" "}
        {!correct && (q.card ? <ArticleWord text={q.card.display} /> : <span>{q.options[q.answer]}</span>)}
      </div>
      <Explanation lines={q.explanation} urdu={q.explanationUr} sentence={q.sentence} />
      {q.card?.ur && q.type !== "reverse" && <Urdu className="mt-1 text-base text-slate-600">{q.card.ur}</Urdu>}
      {q.related.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Related words – learn them together
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {q.related.map((c) => (
              <WordCardView key={c.id} c={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- order
function OrderView({ q, onDone }: { q: OrderQuestion; onDone: (a: AnswerRecord) => void }) {
  const [placed, setPlaced] = useState<number[]>([]); // indexes into q.chunks
  const [wrong, setWrong] = useState(0);
  const [status, setStatus] = useState<"idle" | "wrong" | "correct" | "revealed">("idle");
  const finished = status === "correct" || status === "revealed";

  const finish = (correct: boolean, wrongCount: number) => {
    setStatus(correct ? "correct" : "revealed");
    onDone({
      qid: q.qid,
      type: "grammar",
      entryIds: [],
      marks: q.marks,
      earned: choiceScore(q.marks, wrongCount, correct, false),
      wrongAttempts: wrongCount,
      usedHint: false,
      correct,
      firstTry: correct && wrongCount === 0,
      itemId: q.sentence?.itemId,
    });
    if (q.sentence) speak(q.sentence.de);
  };

  const check = () => {
    const built = placed.map((i) => q.chunks[i]);
    if (built.join(" ") === q.answer.join(" ")) return finish(true, wrong);
    const w = wrong + 1;
    setWrong(w);
    setStatus("wrong");
    if (w > q.maxRetries) finish(false, w);
  };

  const free = q.chunks.map((c, i) => ({ c, i })).filter(({ i }) => !placed.includes(i));
  const triesLeft = q.maxRetries - wrong + 1;

  return (
    <div>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{badge(q)}</span>
          <span className="text-slate-500">{q.marks} marks</span>
        </div>
        <p className="text-center text-lg font-semibold">{q.prompt}</p>
        {q.sentence && <Translation s={q.sentence} />}

        <div
          className={`mt-4 flex min-h-14 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed px-3 py-2 ${
            status === "correct"
              ? "border-green-400 bg-green-50"
              : status === "wrong"
                ? "shake border-red-300 bg-red-50"
                : "border-slate-300"
          }`}
        >
          {finished ? (
            <span className="text-lg font-medium">{q.sentence?.de}</span>
          ) : (
            <>
              {q.fixed.map((c, i) => (
                <span key={"f" + i} className="rounded-lg bg-slate-200 px-3 py-1.5 font-medium text-slate-700">
                  {i === 0 ? cap(c) : c}
                </span>
              ))}
              {placed.map((ci, k) => (
                <button
                  key={"p" + ci}
                  onClick={() => {
                    setPlaced(placed.filter((x) => x !== ci));
                    setStatus("idle");
                  }}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500"
                >
                  {k === 0 && q.fixed.length === 0 ? cap(q.chunks[ci]) : q.chunks[ci]}
                </button>
              ))}
              {placed.length === q.chunks.length && <span className="text-lg font-medium">{q.punct}</span>}
              {placed.length === 0 && q.fixed.length === 0 && <span className="text-sm text-slate-400">Tap the words below…</span>}
            </>
          )}
        </div>

        {!finished && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {free.map(({ c, i }) => (
                <button
                  key={i}
                  onClick={() => {
                    setPlaced([...placed, i]);
                    setStatus("idle");
                  }}
                  className="rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 font-medium hover:border-indigo-400 hover:bg-indigo-50"
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-sm text-red-600">
                {status === "wrong" && `Not quite (−${WRONG_PENALTY}). ${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left.`}
              </span>
              <div className="flex items-center gap-3">
                {wrong > 0 && (
                  <button onClick={() => finish(false, wrong)} className="text-sm font-medium text-slate-500 underline">
                    Show answer
                  </button>
                )}
                <button
                  disabled={placed.length !== q.chunks.length}
                  onClick={check}
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  Check
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {finished && (
        <div className="pop mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className={`mb-2 font-semibold ${status === "correct" ? "text-green-700" : "text-red-600"}`}>
            {status === "correct" ? (wrong === 0 ? "✓ Richtig!" : "✓ Got it on retry") : "✗ The correct order:"}
          </div>
          <Explanation lines={q.explanation} urdu={q.explanationUr} sentence={q.sentence} />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- match
function MatchView({ q, onDone, done }: { q: MatchQuestion; onDone: (a: AnswerRecord) => void; done: boolean }) {
  const [selLeft, setSelLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrongCount, setWrongCount] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  const allDone = matched.length === q.left.length;
  const cardsByDisplay = useMemo(() => new Map(q.cards.map((c) => [c.display, c])), [q.cards]);

  const clickRight = (key: string) => {
    if (!selLeft || matched.includes(key) || allDone) return;
    if (key === selLeft) {
      const m = [...matched, key];
      setMatched(m);
      setSelLeft(null);
      if (m.length === q.left.length) {
        const earned = matchScore(q.marks, wrongCount);
        onDone({
          qid: q.qid,
          type: "match",
          entryIds: q.entryIds,
          marks: q.marks,
          earned,
          wrongAttempts: wrongCount,
          usedHint: false,
          correct: true,
          firstTry: wrongCount === 0,
        });
      }
    } else {
      setWrongCount((w) => w + 1);
      setFlash(key);
      setTimeout(() => setFlash(null), 400);
    }
  };

  const colors = ["bg-sky-100 border-sky-400", "bg-violet-100 border-violet-400", "bg-amber-100 border-amber-400", "bg-emerald-100 border-emerald-400"];
  const colorOf = (key: string) => colors[Number(key.slice(1)) % colors.length];

  return (
    <div>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">Matching</span>
          <span className="text-slate-500">{q.marks} marks</span>
        </div>
        <p className="mb-1 text-center text-lg font-semibold">{q.prompt}</p>
        <p className="mb-4 text-center text-xs text-slate-400">Tap a German word, then its meaning. Wrong pair = −{WRONG_PENALTY}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            {q.left.map((l) => {
              const isM = matched.includes(l.key);
              return (
                <button
                  key={l.key}
                  disabled={isM || allDone}
                  onClick={() => {
                    setSelLeft(l.key);
                    speak(l.text);
                  }}
                  className={`w-full rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium transition ${
                    isM ? `${colorOf(l.key)}` : selLeft === l.key ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  <ArticleWord text={l.text} />
                </button>
              );
            })}
          </div>
          <div className="space-y-2">
            {q.right.map((r) => {
              const isM = matched.includes(r.key);
              return (
                <button
                  key={r.key}
                  disabled={isM || allDone || !selLeft}
                  onClick={() => clickRight(r.key)}
                  className={`w-full rounded-xl border-2 px-3 py-2.5 text-left text-sm transition ${
                    isM
                      ? colorOf(r.key)
                      : flash === r.key
                        ? "shake border-red-400 bg-red-50"
                        : selLeft
                          ? "border-slate-200 hover:border-indigo-300"
                          : "border-slate-200 opacity-70"
                  }`}
                >
                  {r.text}
                </button>
              );
            })}
          </div>
        </div>
        {wrongCount > 0 && !allDone && <p className="mt-3 text-center text-sm text-red-600">{wrongCount} wrong pair(s) so far</p>}
      </div>

      {(allDone || done) && (
        <div className="pop mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-2 font-semibold text-green-700">{wrongCount === 0 ? "✓ Perfekt!" : "✓ All matched"}</div>
          {q.explanation.map((x, i) => (
            <p key={i} className="mb-2 text-sm text-slate-700">
              {x}
            </p>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            {q.left.map((l) => {
              const c = cardsByDisplay.get(l.text);
              return c ? <WordCardView key={l.key} c={c} /> : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
