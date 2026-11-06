"use client";

import { useRef, useState } from "react";
import data from "@/data/schreiben.json";
import AiFeedback, { aiCheck, type AiResult } from "./AiFeedback";
import { nowSeconds, RANDOM_ID, RANDOM_TITLE, saveMock, ScoreBox, shuffle, TestPicker, useSavedName, type SaveState } from "./mock";
import { Urdu } from "./Word";

type Field = { label: string; accept?: string[]; kind?: string; options?: string[]; answer?: number };

const MONTHS = ["januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];
const norm = (s: string) =>
  s.toLowerCase().replace(/ß/g, "ss").replace(/str\.?(?=\s|\d|$)/, "strasse").replace(/[^a-z0-9äöü@]/g, "");

/** "14.08.1998", "14.8.98" or "14. August 1998" -> "14-8-1998" */
function dateKey(s: string) {
  const t = s.toLowerCase();
  const mi = MONTHS.findIndex((m) => t.includes(m));
  const nums = t.match(/\d+/g)?.map(Number) ?? [];
  const [d, m, y] = mi >= 0 ? [nums[0], mi + 1, nums[1]] : nums;
  if (!d || !m || !y) return "";
  return `${d}-${m}-${y < 100 ? 1900 + y : y}`;
}

function fieldCorrect(f: Field, v: string | number | undefined) {
  if (f.options) return v === f.answer;
  const s = String(v ?? "");
  if (!s.trim()) return false;
  if (f.kind === "date") return f.accept!.some((a) => dateKey(a) === dateKey(s));
  if (f.kind === "daymonth") return f.accept!.some((a) => dateKey(`${a} 2000`) === dateKey(`${s.replace(/\d{4}/, "")} 2000`));
  return f.accept!.some((a) => norm(a) === norm(s));
}

type STest = (typeof data.tests)[number] & { emailFrom?: string };

/** Form from one Modelltest, email task from another. */
function makeRandom(): STest {
  const [a, b] = shuffle(data.tests);
  return { id: RANDOM_ID, title: RANDOM_TITLE, form: a.form, email: b.email, emailFrom: b.id };
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export default function SchreibenTest() {
  const [testId, setTestId] = useState(data.tests[0].id);
  const [name, setName] = useSavedName();
  const [form, setForm] = useState<Record<number, string | number>>({});
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const startedAt = useRef(0);
  const [randomTest, setRandomTest] = useState<STest | null>(null);

  const test: STest = (testId === RANDOM_ID && randomTest) || data.tests.find((t) => t.id === testId)!;
  const fields = test.form.fields as Field[];
  const submitted = result !== null;
  const formScore = fields.filter((f, i) => fieldCorrect(f, form[i])).length;
  const aiOk = result && result.configured !== false && !result.error && typeof result.score === "number";
  const emailScore = aiOk ? result.score! : 0;
  const max = aiOk ? 15 : 5;

  const reset = (id: string) => {
    if (id === RANDOM_ID) setRandomTest(makeRandom());
    setTestId(id);
    setForm({});
    setEmail("");
    setResult(null);
    setSaveState("idle");
    startedAt.current = 0;
  };
  const touch = () => {
    if (!startedAt.current) startedAt.current = nowSeconds();
  };

  const submit = async () => {
    setChecking(true);
    const r = email.trim() ? await aiCheck({ kind: "email", testId: test.emailFrom ?? testId, text: email }) : { configured: true, score: 0, max: 10, feedback_en: "No email written." };
    setChecking(false);
    setResult(r);
    window.scrollTo(0, 0);
    const ok = r.configured !== false && !r.error && typeof r.score === "number";
    setSaveState("saving");
    setSaveState(
      await saveMock({
        name,
        section: "schreiben",
        testId,
        score: formScore + (ok ? r.score! : 0),
        maxScore: ok ? 15 : 5,
        durationSeconds: startedAt.current ? Math.round(nowSeconds() - startedAt.current) : null,
        answers: [
          ...fields.map((f, i) => ({ itemId: `${testId}-form-${i}`, value: form[i] ?? null, correct: fieldCorrect(f, form[i]) })),
          { itemId: `${testId}-email`, text: email, score: ok ? r.score : null, mistakes: r.mistakes ?? [] },
        ],
      }),
    );
  };

  return (
    <div className="space-y-5">
      <TestPicker tests={data.tests} random section="schreiben" value={testId} onChange={reset} name={name} onName={setName} locked={submitted} />

      {submitted && (
        <ScoreBox
          score={formScore + emailScore}
          max={max}
          saveState={saveState}
          onRetry={() => reset(testId)}
          note={`Formular ${formScore}/5 · E-Mail ${aiOk ? `${emailScore}/10` : "not checked"}`}
        />
      )}

      {/* Teil 1 */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Teil 1 – Formular</h2>
        <p className="text-sm text-slate-500">{test.form.en}</p>
        <Urdu className="text-[15px] text-slate-600">{test.form.ur}</Urdu>
        <div className="mt-3 rounded-xl border-l-4 border-amber-400 bg-amber-50/60 px-4 py-3 text-[15px] leading-relaxed">{test.form.text}</div>

        <div className="mt-4 rounded-xl border-2 border-slate-300 p-4">
          <div className="mb-3 font-semibold">{test.form.title}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {test.form.given.map(([l, v]) => (
              <label key={l} className="text-sm">
                <span className="text-slate-500">{l}</span>
                <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-600">{v}</div>
              </label>
            ))}
            {fields.map((f, i) => {
              const ok = submitted && fieldCorrect(f, form[i]);
              const ring = !submitted ? "border-slate-300" : ok ? "border-emerald-500 bg-emerald-50" : "border-rose-400 bg-rose-50";
              return (
                <label key={i} className="text-sm">
                  <span className="font-medium">
                    ({i + 1}) {f.label}
                  </span>
                  {f.options ? (
                    <div className="flex flex-wrap gap-3 py-1.5">
                      {f.options.map((o, oi) => (
                        <label key={oi} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`f${i}`}
                            disabled={submitted}
                            checked={form[i] === oi}
                            onChange={() => {
                              touch();
                              setForm((s) => ({ ...s, [i]: oi }));
                            }}
                          />
                          <span className={submitted && oi === f.answer ? "font-semibold text-emerald-700" : ""}>{o}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      value={String(form[i] ?? "")}
                      disabled={submitted}
                      onChange={(e) => {
                        touch();
                        setForm((s) => ({ ...s, [i]: e.target.value }));
                      }}
                      className={`w-full rounded-lg border px-3 py-1.5 ${ring}`}
                    />
                  )}
                  {submitted && !ok && !f.options && <span className="text-xs text-emerald-700">✓ {f.accept![0]}</span>}
                </label>
              );
            })}
          </div>
        </div>
      </section>

      {/* Teil 2 */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Teil 2 – E-Mail ({test.email.register})</h2>
        <div className="mt-2 rounded-xl border-l-4 border-amber-400 bg-amber-50/60 px-4 py-3">
          <div className="font-medium">{test.email.situation}</div>
          <ul className="mt-1 list-disc pl-5">
            {test.email.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <p className="mt-2 text-sm text-slate-500">{test.email.en}</p>
        <Urdu className="text-[15px] text-slate-600">{test.email.ur}</Urdu>
        <textarea
          value={email}
          disabled={submitted}
          onChange={(e) => {
            touch();
            setEmail(e.target.value);
          }}
          rows={8}
          spellCheck={false}
          placeholder={test.email.register === "formell" ? "Sehr geehrte Damen und Herren, …" : "Lieber Jonas, …"}
          className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-[15px]"
        />
        <div className={`text-right text-xs ${words(email) >= 25 ? "text-emerald-600" : "text-slate-400"}`}>{words(email)} Wörter (≈ 30)</div>
        {result && <AiFeedback r={result} pointLabels={test.email.points} />}
      </section>

      {!submitted && (
        <div className="text-center">
          <button
            onClick={submit}
            disabled={checking}
            className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {checking ? "🤖 Checking your email… (up to 30 s)" : "Abgeben – check"}
          </button>
        </div>
      )}
    </div>
  );
}
