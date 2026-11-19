"use client";

import { useEffect, useRef, useState } from "react";
import AiFeedback, { type AiResult } from "./AiFeedback";
import { SpeakButton, Urdu } from "./Word";

/** Microphone input shared by the A1 Sprechen test and the A2 speaking trainer. */

/* ---------------- speech recognition (browser, de-DE) ---------------- */

export type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

export function getRecognition(): Rec | null {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C ? new C() : null;
}

/* ---------------- one spoken answer ---------------- */

export type Hint = { de: string; ur: string; en?: string };

/** Recorded audio (webm/mp4/ogg) -> 16 kHz mono WAV, which every speech-to-text engine accepts. */
export async function toWav(blob: Blob): Promise<Blob> {
  const ac = new AudioContext();
  try {
    const audio = await ac.decodeAudioData(await blob.arrayBuffer());
    const rate = 16000;
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(audio.duration * rate)), rate);
    const src = off.createBufferSource();
    src.buffer = audio;
    src.connect(off.destination);
    src.start();
    const pcm = (await off.startRendering()).getChannelData(0);
    const buf = new ArrayBuffer(44 + pcm.length * 2);
    const v = new DataView(buf);
    const str = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, "RIFF");
    v.setUint32(4, 36 + pcm.length * 2, true);
    str(8, "WAVE");
    str(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, rate, true);
    v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    str(36, "data");
    v.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
    return new Blob([buf], { type: "audio/wav" });
  } finally {
    ac.close().catch(() => {});
  }
}

/** Asked once per page: is server speech-to-text (ElevenLabs Scribe or OpenRouter) available? */
let sttAvailable: Promise<boolean> | null = null;
/** After the server engines failed: use the browser microphone from now on. */
export function disableServerStt() {
  sttAvailable = Promise.resolve(false);
}
export function checkStt() {
  sttAvailable ??= fetch("/api/stt")
    .then((r) => r.json())
    .then((d) => !!d.configured)
    .catch(() => false);
  return sttAvailable;
}

export function AnswerBox({
  label,
  placeholder,
  onCheck,
  result,
  rows = 2,
  keyterms = [],
  hints,
  hintLabel = "💡 Hint – useful phrases from your notes",
}: {
  label: string;
  placeholder?: string;
  onCheck: (text: string) => Promise<void>;
  result?: AiResult;
  rows?: number;
  /** words that should be recognised well (e.g. the word on the card) */
  keyterms?: string[];
  hints?: Hint[];
  hintLabel?: string;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [micError, setMicError] = useState("");
  const [showHints, setShowHints] = useState(false);
  const recRef = useRef<Rec | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const wantRef = useRef(false);
  const committed = useRef("");

  useEffect(
    () => () => {
      wantRef.current = false;
      recRef.current?.stop();
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    },
    [],
  );

  const append = (t: string) => setText((prev) => (prev.trim() ? prev.trim() + " " : "") + t);

  /* --- 1) record, then ElevenLabs Scribe writes it down (best quality) --- */
  const startRecorder = async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError("Microphone permission was denied.");
      return;
    }
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported?.(m));
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setListening(false);
      const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
      if (blob.size < 1500) return;
      setTranscribing(true);
      let upload: Blob = blob;
      try {
        upload = await toWav(blob);
      } catch {
        // keep the original recording
      }
      const fd = new FormData();
      fd.append("audio", upload, upload.type === "audio/wav" ? "speech.wav" : "speech.webm");
      fd.append("keyterms", keyterms.join("|"));
      try {
        const r = await fetch("/api/stt", { method: "POST", body: fd });
        const d = await r.json();
        if (d.text) append(d.text);
        else if (r.status === 502 || r.status === 503) {
          // all server engines failed (e.g. credits used up): use the browser microphone from now on
          sttAvailable = Promise.resolve(false);
          setMicError("Server speech recognition is not available right now – switched to the browser microphone. Press 🎤 and speak again.");
        } else setMicError(d.error ?? "Nothing recognised – please try again, a bit louder.");
      } catch {
        setMicError("Could not reach the server.");
      }
      setTranscribing(false);
    };
    mediaRef.current = mr;
    mr.start();
    setListening(true);
    setTimeout(() => {
      if (mr.state === "recording") mr.stop();
    }, 60_000);
  };

  /* --- 2) fallback: the browser's live recognition, one short session at a time ---
     (continuous mode on Android repeats the text again and again, so we restart short sessions instead) */
  const browserSession = () => {
    const rec = getRecognition();
    if (!rec) return;
    rec.lang = "de-DE";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript.trim();
        if (!t) continue;
        if (r.isFinal) {
          if (!committed.current.trimEnd().endsWith(t)) committed.current += t + " ";
          interim = "";
        } else interim = t;
      }
      setText((committed.current + interim).replace(/\s+/g, " "));
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      wantRef.current = false;
      setMicError(e.error === "not-allowed" ? "Microphone permission was denied." : `Mic error: ${e.error}`);
    };
    rec.onend = () => {
      if (wantRef.current) {
        try {
          browserSession();
        } catch {
          wantRef.current = false;
          setListening(false);
        }
      } else setListening(false);
    };
    recRef.current = rec;
    rec.start();
  };

  const startBrowser = () => {
    if (!getRecognition()) {
      setMicError("Speech recognition is not available in this browser. Use Chrome, or type your answer.");
      return;
    }
    committed.current = text.trim() ? text.trim() + " " : "";
    wantRef.current = true;
    setListening(true);
    browserSession();
  };

  const toggleMic = async () => {
    if (transcribing) return;
    if (listening) {
      wantRef.current = false;
      recRef.current?.stop();
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
      else setListening(false);
      return;
    }
    setMicError("");
    if (typeof MediaRecorder !== "undefined" && navigator.mediaDevices && (await checkStt())) await startRecorder();
    else startBrowser();
  };

  const check = async () => {
    wantRef.current = false;
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
          disabled={transcribing}
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
      {listening && <div className="mt-1 text-xs font-medium text-rose-600">● Listening… speak, then press ■</div>}
      {transcribing && <div className="mt-1 animate-pulse text-xs font-medium text-indigo-600">✍️ Writing down what you said…</div>}
      {micError && <div className="mt-1 text-xs text-rose-600">{micError}</div>}
      {hints && hints.length > 0 && (
        <div className="mt-1">
          <button onClick={() => setShowHints(!showHints)} className="text-sm font-medium text-amber-700 hover:underline">
            {showHints ? "Hide hints" : hintLabel}
          </button>
          {showHints && (
            <ul className="mt-1 space-y-1 rounded-xl bg-amber-50 px-3 py-2 text-sm">
              {hints.map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <SpeakButton text={h.de.replace(/…/g, "")} className="h-6 w-6 text-xs" />
                  <div className="flex-1">
                    <div className="font-medium">{h.de}</div>
                    {h.en && <div className="text-xs text-slate-500">{h.en}</div>}
                    <Urdu className="text-[14px] text-slate-600">{h.ur}</Urdu>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {result && (
        <div className="mt-2">
          <AiFeedback r={result} />
        </div>
      )}
    </div>
  );
}
