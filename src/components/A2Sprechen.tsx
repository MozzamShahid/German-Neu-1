"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import data from "@/data/a2-sprechen.json";
import AiFeedback, { aiCheck, type AiResult } from "./AiFeedback";
import { AnswerBox, checkStt, disableServerStt, getRecognition, toWav, type Rec } from "./speech";
import { ArticleWord, speak, SpeakButton, stopSpeaking, Urdu } from "./Word";

type Thema = (typeof data.themen)[number];
type Line = { de: string; en: string; ur: string };

/* ---------------- long recording (1–5 minutes) ----------------
   The server engines take short clips, so the talk is recorded in 40-second parts on one microphone stream.
   Each part is written down as soon as it is finished, so the text is ready a few seconds after the talk ends.
   Without server speech-to-text the browser's own recognition is used (short sessions, restarted). */

const SEGMENT_MS = 40_000;

/** The browser's own recognition in short sessions that restart themselves
    (continuous mode on Android repeats the text again and again). */
class BrowserListener {
  private want = false;
  private rec: Rec | null = null;
  private committed = "";
  constructor(
    private onText: (final: string, interim: string) => void,
    private onError: (msg: string) => void,
  ) {}
  start() {
    if (!getRecognition()) return false;
    this.want = true;
    this.committed = "";
    this.session();
    return true;
  }
  stop() {
    this.want = false;
    this.rec?.stop();
  }
  private session() {
    const r = getRecognition();
    if (!r) return;
    r.lang = "de-DE";
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const t = res[0].transcript.trim();
        if (!t) continue;
        if (res.isFinal) {
          if (!this.committed.trimEnd().endsWith(t)) this.committed += t + " ";
          interim = "";
        } else interim = t;
      }
      this.onText(this.committed.trim(), interim);
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      this.want = false;
      this.onError(e.error === "not-allowed" ? "Microphone permission was denied." : `Mic error: ${e.error}`);
    };
    r.onend = () => {
      if (!this.want) return this.onText(this.committed.trim(), "");
      try {
        this.session();
      } catch {
        this.want = false;
      }
    };
    this.rec = r;
    r.start();
  }
}

function useLongRecorder(keyterms: string[]) {
  const [parts, setParts] = useState<string[]>([]);
  const [live, setLive] = useState("");
  const [pending, setPending] = useState(0);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const segIndex = useRef(0);
  const listener = useRef<BrowserListener | null>(null);

  const setPart = (i: number, t: string) =>
    setParts((p) => {
      const n = [...p];
      n[i] = t;
      return n;
    });

  function startBrowser() {
    if (!getRecognition()) {
      setError("Speech recognition is not available in this browser. Use Chrome / Edge, or type what you said afterwards.");
      return false;
    }
    const slot = segIndex.current++;
    listener.current = new BrowserListener(
      (final, interim) => {
        setPart(slot, final);
        setLive(interim);
      },
      setError,
    );
    return listener.current.start();
  }

  /* --- server speech-to-text, one 40 s part at a time --- */
  const transcribe = async (i: number, blob: Blob) => {
    if (blob.size < 1500) return;
    setPending((n) => n + 1);
    try {
      let upload: Blob = blob;
      try {
        upload = await toWav(blob);
      } catch {
        // keep the original recording
      }
      const fd = new FormData();
      fd.append("audio", upload, upload.type === "audio/wav" ? "speech.wav" : "speech.webm");
      fd.append("keyterms", keyterms.slice(0, 20).join("|"));
      const r = await fetch("/api/stt", { method: "POST", body: fd });
      const d = await r.json();
      if (d.text) setPart(i, d.text);
      else if (r.status === 502 || r.status === 503) {
        disableServerStt();
        setError("Server speech recognition stopped working – the rest is written down by the browser.");
        switchToBrowser();
      } else if (d.error) setError(d.error);
    } catch {
      setError("Could not reach the server for one part of your talk.");
    } finally {
      setPending((n) => n - 1);
    }
  };

  const newSegment = () => {
    if (!stream.current) return;
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported?.(m));
    const mr = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    const i = segIndex.current++;
    mr.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    mr.onstop = () => transcribe(i, new Blob(chunks, { type: mr.mimeType || "audio/webm" }));
    recorder.current = mr;
    mr.start();
  };

  const stopServer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
    recorder.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };

  // used when the server fails in the middle of a talk
  function switchToBrowser() {
    if (!stream.current) return;
    stopServer();
    startBrowser();
  }

  const start = async () => {
    setParts([]);
    setLive("");
    setError("");
    segIndex.current = 0;
    if (typeof MediaRecorder !== "undefined" && navigator.mediaDevices && (await checkStt())) {
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setError("Microphone permission was denied.");
        return false;
      }
      newSegment();
      timer.current = setInterval(() => {
        if (recorder.current?.state === "recording") recorder.current.stop();
        newSegment();
      }, SEGMENT_MS);
      setRecording(true);
      return true;
    }
    const ok = startBrowser();
    setRecording(ok);
    return ok;
  };

  const stop = () => {
    stopServer();
    listener.current?.stop();
    setRecording(false);
  };

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      listener.current?.stop();
    },
    [],
  );

  const text = [...parts.filter(Boolean), live].join(" ").replace(/\s+/g, " ").trim();
  return { start, stop, text, pending, recording, error };
}

/* ---------------- small pieces ---------------- */

function LineRow({ l }: { l: Line }) {
  return (
    <li className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2">
      <SpeakButton text={l.de.replace(/…/g, "")} className="mt-0.5 h-6 w-6 text-xs" />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{l.de}</div>
        <div className="text-xs text-slate-500">{l.en}</div>
        <Urdu className="text-[14px] text-slate-600">{l.ur}</Urdu>
      </div>
    </li>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

/** Short helper phrases shown while speaking. */
const HELPERS = ["Hm, wie soll ich sagen …", "Zum Beispiel …", "…, weil …", "Deshalb …", "Außerdem …", "Früher …, heute …", "Ehrlich gesagt …", "Am Anfang …, aber jetzt …", "Bei uns in Pakistan …", "Insgesamt …"];

function readScores(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem("a2-talk-best") ?? "{}");
  } catch {
    return {};
  }
}
function saveScore(id: string, score: number) {
  try {
    const s = readScores();
    if (score > (s[id] ?? -1)) {
      s[id] = score;
      localStorage.setItem("a2-talk-best", JSON.stringify(s));
    }
  } catch {
    // storage blocked: not important
  }
}

/* ---------------- speaking about a topic ---------------- */

type TalkResult = AiResult & {
  answered?: number[];
  content?: number;
  range?: number;
  accuracy?: number;
  good?: string[];
  next_time?: string[];
  words?: number;
};

function Talk({ thema, minutes, onDone }: { thema: Thema; minutes: number; onDone: () => void }) {
  const total = minutes * 60;
  const [phase, setPhase] = useState<"countdown" | "speaking" | "review">("countdown");
  const [count, setCount] = useState(3);
  const [left, setLeft] = useState(total);
  const [q, setQ] = useState(0);
  const [showHelp, setShowHelp] = useState(true);
  const [text, setText] = useState("");
  const [filled, setFilled] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<TalkResult | null>(null);
  const startedAt = useRef(0);
  const [spoke, setSpoke] = useState(0);
  const keyterms = thema.words.map((w) => w.de.replace(/^(der|die|das) /, ""));
  const recorder = useLongRecorder(keyterms);
  const perQuestion = Math.max(20, Math.floor(total / thema.questions.length));

  // 3-2-1, then start the microphone
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) {
      stopSpeaking();
      recorder.start().then((ok) => {
        startedAt.current = Date.now();
        setPhase("speaking");
        if (!ok) setShowHelp(true);
      });
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count]);

  const finish = useCallback(() => {
    recorder.stop();
    setSpoke(Math.round((Date.now() - startedAt.current) / 1000));
    setPhase("review");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the clock and the guiding questions
  useEffect(() => {
    if (phase !== "speaking") return;
    const t = setInterval(() => {
      const passed = Math.floor((Date.now() - startedAt.current) / 1000);
      setLeft(total - passed);
      setQ((cur) => Math.max(cur, Math.min(thema.questions.length - 1, Math.floor(passed / perQuestion))));
      if (passed >= total) finish();
    }, 250);
    return () => clearInterval(t);
  }, [phase, total, perQuestion, thema.questions.length, finish]);

  // when every part is written down, put the text into the box once
  useEffect(() => {
    if (phase === "review" && recorder.pending === 0 && !filled) {
      const t = setTimeout(() => {
        setText(recorder.text);
        setFilled(true);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [phase, recorder.pending, recorder.text, filled]);

  const words = text.split(/\s+/).filter(Boolean).length;
  const wpm = spoke ? Math.round(words / (spoke / 60)) : 0;

  const check = async () => {
    setChecking(true);
    const r: TalkResult = await aiCheck({ kind: "a2talk", themaId: thema.id, text, seconds: spoke || total });
    setResult(r);
    if (typeof r.score === "number") saveScore(thema.id, r.score);
    setChecking(false);
  };

  if (phase === "countdown")
    return (
      <div className="grid place-items-center rounded-2xl bg-slate-900 py-16 text-white">
        <div className="text-sm text-slate-300">Get ready – speak for {minutes} min about</div>
        <div className="mt-1 text-2xl font-bold">
          {thema.emoji} {thema.title}
        </div>
        <div className="mt-6 text-7xl font-bold tabular-nums">{count || "🎤"}</div>
      </div>
    );

  if (phase === "speaking") {
    const pct = Math.min(100, ((total - left) / total) * 100);
    const question = thema.questions[q];
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-slate-900 p-5 text-white">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-rose-300">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" /> Recording
            </span>
            <span className="text-4xl font-bold tabular-nums">{fmt(left)}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-700">
            <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-5 text-xs uppercase tracking-wide text-slate-400">
            Frage {q + 1} / {thema.questions.length}
          </div>
          <div className="mt-1 text-2xl font-semibold">{question.de}</div>
          <Urdu className="mt-1 text-lg text-slate-300">{question.ur}</Urdu>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setQ((x) => Math.min(thema.questions.length - 1, x + 1))}
              disabled={q >= thema.questions.length - 1}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-40"
            >
              Nächste Frage →
            </button>
            <button onClick={finish} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold hover:bg-amber-600">
              ■ Fertig
            </button>
          </div>
        </div>

        {recorder.error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{recorder.error}</div>}
        {!recorder.recording && !recorder.error && (
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">The microphone is not running – speak anyway and type the main points afterwards.</div>
        )}

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <button onClick={() => setShowHelp(!showHelp)} className="text-sm font-semibold text-indigo-700">
            {showHelp ? "▾" : "▸"} Hilfe: Wörter & Satzanfänge
          </button>
          {showHelp && (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {HELPERS.map((h) => (
                  <span key={h} className="rounded-full bg-indigo-50 px-2.5 py-1 text-sm text-indigo-800">
                    {h}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {thema.words.map((w) => (
                  <span key={w.de} className="rounded-full bg-slate-100 px-2.5 py-1 text-sm">
                    <ArticleWord text={w.de} />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // review
  const answered = new Set(result?.answered ?? []);
  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Das hast du gesagt</h3>
          <span className="text-sm text-slate-500">
            {fmt(spoke)} min · {words} Wörter{wpm ? ` · ${wpm} Wörter/min` : ""}
          </span>
        </div>
        {recorder.pending > 0 || !filled ? (
          <div className="mt-3 animate-pulse rounded-xl bg-indigo-50 px-3 py-6 text-center text-indigo-700">
            ✍️ Writing down what you said{recorder.pending > 1 ? ` (${recorder.pending} parts left)` : ""}…
          </div>
        ) : (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              spellCheck={false}
              placeholder="Nothing was recognised. Type what you said here (or the main points), then press Check."
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-[15px]"
            />
            <p className="mt-1 text-xs text-slate-500">You can fix words the microphone got wrong before checking. Don&apos;t fix your grammar – that is what the check is for.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={check}
                disabled={checking || words < 3}
                className="rounded-xl bg-amber-500 px-5 py-2 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {checking ? "🤖 Checking… (up to a minute)" : result ? "Check again" : "🤖 Check my talk"}
              </button>
              <button onClick={onDone} className="rounded-xl bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200">
                ↺ Speak again
              </button>
            </div>
          </>
        )}
      </section>

      {result && (result.error || result.configured === false) && <AiFeedback r={result} />}
      {result && !result.error && result.configured !== false && (
        <section className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            {(
              [
                ["Inhalt", "content", 4],
                ["Wortschatz", "range", 3],
                ["Grammatik", "accuracy", 3],
              ] as const
            ).map(([label, k, max]) => (
              <div key={k} className="rounded-xl bg-white p-3 shadow-sm">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="text-xl font-bold text-indigo-700">
                  {result[k] ?? 0}
                  <span className="text-sm text-slate-400">/{max}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-semibold">Which questions did you talk about?</div>
            <ul className="space-y-1 text-sm">
              {thema.questions.map((qq, i) => (
                <li key={i} className={answered.has(i) ? "text-emerald-700" : "text-slate-400"}>
                  {answered.has(i) ? "✓" : "○"} {qq.de}
                </li>
              ))}
            </ul>
          </div>
          {!!result.good?.length && (
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm">
              <div className="mb-1 font-semibold text-emerald-800">👍 Gut gesagt</div>
              <ul className="list-inside list-disc text-emerald-900">
                {result.good.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          <AiFeedback r={result} />
          {!!result.next_time?.length && (
            <div className="rounded-2xl bg-white p-4 text-sm shadow-sm">
              <div className="mb-1 font-semibold">➕ Next time you could also say</div>
              <ul className="space-y-1">
                {result.next_time.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <SpeakButton text={s} className="h-6 w-6 text-xs" />
                    <span className="flex-1">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ThemaView({ thema, onBack }: { thema: Thema; onBack: () => void }) {
  const [minutes, setMinutes] = useState(2);
  const [talking, setTalking] = useState(false);
  const [round, setRound] = useState(0);
  const [showModel, setShowModel] = useState(false);
  const [showUrdu, setShowUrdu] = useState(false);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm font-medium text-indigo-600 hover:underline">
        ← Alle Themen
      </button>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{thema.emoji}</span>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{thema.title}</h2>
            <div className="text-sm text-slate-500">{thema.title_en}</div>
          </div>
          <Urdu className="text-xl text-slate-500">{thema.title_ur}</Urdu>
        </div>

        {!talking && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-indigo-50 p-3">
            <span className="text-sm font-semibold text-indigo-900">Sprechen für</span>
            {[1, 2, 5].map((m) => (
              <button
                key={m}
                onClick={() => setMinutes(m)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${minutes === m ? "bg-indigo-600 text-white" : "bg-white text-slate-700"}`}
              >
                {m} min
              </button>
            ))}
            <button
              onClick={() => {
                setTalking(true);
                setRound((r) => r + 1);
              }}
              className="ml-auto rounded-xl bg-rose-500 px-5 py-2 font-semibold text-white hover:bg-rose-600"
            >
              🎤 Start
            </button>
          </div>
        )}
        {!talking && (
          <p className="mt-2 text-xs text-slate-500">
            Read the questions and phrases below first (1–2 minutes is normal preparation). While you speak, a new question appears every{" "}
            {Math.max(20, Math.floor((minutes * 60) / thema.questions.length))} s. Keep talking – a mistake is better than silence.
          </p>
        )}
      </div>

      {talking ? (
        <Talk key={round} thema={thema} minutes={minutes} onDone={() => setTalking(false)} />
      ) : (
        <>
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">❓ Leitfragen – talk about these</h3>
              <button onClick={() => setShowUrdu(!showUrdu)} className="text-xs text-indigo-600 hover:underline">
                {showUrdu ? "hide اردو" : "show اردو"}
              </button>
            </div>
            <ol className="mt-2 space-y-1.5">
              {thema.questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 w-5 text-sm text-slate-400">{i + 1}.</span>
                  <div className="flex-1">
                    <div className="font-medium">{q.de}</div>
                    <div className="text-xs text-slate-500">{q.en}</div>
                    {showUrdu && <Urdu className="text-[14px] text-slate-600">{q.ur}</Urdu>}
                  </div>
                  <SpeakButton text={q.de} className="h-6 w-6 text-xs" />
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="font-semibold">🧩 Wörter</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {thema.words.map((w) => (
                <div key={w.de} className="flex items-start gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm">
                  <SpeakButton text={w.de} className="h-6 w-6 text-xs" />
                  <div className="flex-1">
                    <ArticleWord text={w.de} className="font-medium" />
                    <div className="text-slate-500">{w.en}</div>
                  </div>
                  <Urdu className="text-[14px] text-slate-600">{w.ur}</Urdu>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="font-semibold">💬 Sätze, die du sofort benutzen kannst</h3>
            <p className="text-xs text-slate-500">Change one word and they fit your own life.</p>
            <ul className="mt-2 space-y-1.5">
              {thema.sentences.map((s) => (
                <LineRow key={s.de} l={s} />
              ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">📝 Mustertext (≈ 1 Minute)</h3>
              <div className="flex gap-2">
                <button onClick={() => speak(thema.model.de)} className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-200">
                  ▶ Anhören
                </button>
                <button onClick={() => setShowModel(!showModel)} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200">
                  {showModel ? "Verstecken" : "Zeigen"}
                </button>
              </div>
            </div>
            {showModel && (
              <div className="mt-3 space-y-2 text-[15px] leading-relaxed">
                <p>{thema.model.de}</p>
                <p className="text-sm text-slate-500">{thema.model.en}</p>
              </div>
            )}
            {!showModel && <p className="mt-1 text-xs text-slate-500">Try speaking first, then compare with the model. For 2 or 5 minutes add more details, examples and your own story.</p>}
          </section>
        </>
      )}
    </div>
  );
}

function ThemenMode() {
  const [id, setId] = useState<string | null>(null);
  const [best] = useState(readScores);
  const thema = data.themen.find((t) => t.id === id);
  if (thema) return <ThemaView thema={thema} onBack={() => setId(null)} />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Pick a topic. Prepare with the questions, words and sentences, then speak for 1, 2 or 5 minutes. The AI checks content, vocabulary and grammar and shows you
        how to say it better.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {data.themen.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setId(t.id);
              window.scrollTo({ top: 0 });
            }}
            className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl">{t.emoji}</span>
              {best[t.id] !== undefined && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{best[t.id]}/10</span>}
            </div>
            <div className="mt-2 font-semibold leading-tight">{t.title}</div>
            <Urdu className="text-[14px] text-slate-500">{t.title_ur}</Urdu>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Redemittel: sentences for every conversation ---------------- */

function Drill({ phrases, onClose }: { phrases: Line[]; onClose: () => void }) {
  const [order] = useState(() => [...phrases].sort(() => Math.random() - 0.5));
  const [i, setI] = useState(0);
  const [result, setResult] = useState<AiResult | undefined>();
  const [reveal, setReveal] = useState(false);
  const p = order[i % order.length];

  const check = async (text: string) => {
    const r = await aiCheck({ kind: "sprechen", role: "translate", text, reference_de: p.de, reference_en: p.en, reference_ur: p.ur });
    setResult(r.configured === false ? { configured: true, corrected: p.de, feedback_en: "Compare with the answer. (AI feedback is not set up yet.)" } : r);
    setReveal(true);
  };

  return (
    <div className="mt-3 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {(i % order.length) + 1} / {order.length} · say it in German
        </span>
        <button onClick={onClose} className="font-medium text-slate-600 hover:underline">
          ✕ close
        </button>
      </div>
      <Urdu className="mt-2 text-2xl text-emerald-900">{p.ur}</Urdu>
      <div className="text-sm text-slate-500">{p.en}</div>
      <AnswerBox key={i} label="Auf Deutsch:" onCheck={check} result={result} />
      <div className="mt-3 flex items-center justify-between">
        <button onClick={() => setReveal(true)} className="text-sm text-indigo-600 hover:underline">
          Show answer
        </button>
        <button
          onClick={() => {
            setI(i + 1);
            setResult(undefined);
            setReveal(false);
          }}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Next →
        </button>
      </div>
      {reveal && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2">
          <span className="flex-1 font-medium">{p.de}</span>
          <SpeakButton text={p.de.replace(/…/g, "")} />
        </div>
      )}
    </div>
  );
}

function RedemittelMode() {
  const [drill, setDrill] = useState<string | null>(null);
  const all = data.redemittel.flatMap((g) => g.phrases);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
        <b>Redemittel</b> are the sentences Germans use in <i>every</i> conversation. Learn these and you can talk about any topic: they give you time to think,
        connect your ideas and keep the conversation going. Listen 🔊, repeat out loud, then press 🎯 to practise from Urdu.
        <div className="mt-2">
          <button
            onClick={() => setDrill(drill === "all" ? null : "all")}
            className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
          >
            🎯 Practise all {all.length} (mixed)
          </button>
        </div>
        {drill === "all" && <Drill phrases={all} onClose={() => setDrill(null)} />}
      </div>
      {data.redemittel.map((g) => (
        <section key={g.id} className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">{g.title}</h3>
              <div className="text-sm text-slate-500">{g.title_en}</div>
            </div>
            <Urdu className="text-lg text-slate-500">{g.title_ur}</Urdu>
          </div>
          <p className="mt-1 text-sm text-indigo-800">💡 {g.tip_en}</p>
          <ul className="mt-3 space-y-1.5">
            {g.phrases.map((p) => (
              <LineRow key={p.de} l={p} />
            ))}
          </ul>
          <button
            onClick={() => setDrill(drill === g.id ? null : g.id)}
            className="mt-3 rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700 hover:bg-indigo-200"
          >
            🎯 Üben
          </button>
          {drill === g.id && <Drill phrases={g.phrases} onClose={() => setDrill(null)} />}
        </section>
      ))}
    </div>
  );
}

/* ---------------- quick questions (like A2 Teil 1) ---------------- */

function randomQuestion(not?: string) {
  const pool = data.themen.flatMap((t) => t.questions.map((q) => ({ q, t })));
  let pick = pool[Math.floor(Math.random() * pool.length)];
  while (pool.length > 1 && pick.q.de === not) pick = pool[Math.floor(Math.random() * pool.length)];
  return pick;
}

function FragenMode() {
  const [cur, setCur] = useState<ReturnType<typeof randomQuestion> | null>(null);
  const [result, setResult] = useState<AiResult | undefined>();
  const [n, setN] = useState(0);
  const [showUrdu, setShowUrdu] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCur(randomQuestion()), 0);
    return () => clearTimeout(t);
  }, []);

  if (!cur) return <div className="p-10 text-center text-slate-400">Loading…</div>;

  const next = () => {
    setCur(randomQuestion(cur.q.de));
    setResult(undefined);
    setShowUrdu(false);
    setN(n + 1);
  };

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">⚡ Schnelle Fragen</h2>
      <p className="text-sm text-slate-500">
        Someone asks you a question – answer with 2–4 sentences and a reason (weil …) or an example. No preparation, like in real life.
      </p>
      <div className="mt-4 rounded-xl bg-slate-900 px-4 py-5 text-white">
        <div className="text-xs text-slate-400">
          {cur.t.emoji} {cur.t.title}
        </div>
        <div className="mt-1 flex items-start gap-3">
          <div className="flex-1 text-2xl font-semibold">{cur.q.de}</div>
          <SpeakButton text={cur.q.de} className="bg-white/10 text-white hover:bg-white/20" />
        </div>
        <button onClick={() => setShowUrdu(!showUrdu)} className="mt-2 text-xs text-slate-400 hover:text-white">
          {showUrdu ? "hide" : "don't understand? show English / اردو"}
        </button>
        {showUrdu && (
          <div className="mt-1">
            <div className="text-sm text-slate-300">{cur.q.en}</div>
            <Urdu className="text-lg text-slate-200">{cur.q.ur}</Urdu>
          </div>
        )}
      </div>
      <AnswerBox
        key={n}
        label="Deine Antwort"
        rows={3}
        hints={cur.t.sentences}
        hintLabel="💡 Hint – sentences for this topic"
        onCheck={async (text) => setResult(await aiCheck({ kind: "a2question", question: cur.q.de, text }))}
        result={result}
      />
      <div className="mt-3 flex justify-end">
        <button onClick={next} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          Nächste Frage →
        </button>
      </div>
    </section>
  );
}

/* ---------------- page ---------------- */

const MODES = [
  ["themen", "🗣️ Thema sprechen"],
  ["redemittel", "🧰 Redemittel"],
  ["fragen", "⚡ Schnelle Fragen"],
] as const;

export default function A2Sprechen() {
  const [mode, setMode] = useState<(typeof MODES)[number][0]>("themen");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {MODES.map(([m, l]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${mode === m ? "bg-indigo-600 text-white" : "bg-white text-slate-600 shadow-sm"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">🎤 works best in Chrome / Edge. Allow the microphone and speak normally – you can fix wrongly recognised words before the check.</p>
      {mode === "themen" && <ThemenMode />}
      {mode === "redemittel" && <RedemittelMode />}
      {mode === "fragen" && <FragenMode />}
    </div>
  );
}
