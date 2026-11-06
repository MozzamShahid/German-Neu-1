"use client";

import type { WordCard } from "@/lib/types";

const ART_CLASS: Record<string, string> = {
  der: "text-der",
  die: "text-die",
  das: "text-das",
};

/** Renders "der Kindergarten" with the article coloured (der blue / die red / das green). */
export function ArticleWord({ text, className = "" }: { text: string; className?: string }) {
  const m = text.match(/^(der\/die|der|die|das)\s+(.+)$/);
  if (!m) return <span className={className}>{text}</span>;
  const cls = ART_CLASS[m[1]] ?? "text-purple-600";
  return (
    <span className={className}>
      <span className={`${cls} font-semibold`}>{m[1]}</span> {m[2]}
    </span>
  );
}

/** Urdu text in Nastaliq, right-to-left. */
export function Urdu({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p dir="rtl" lang="ur" className={`urdu ${className}`}>
      {children}
    </p>
  );
}

/** FNV-1a 32-bit key of the normalised text; must match key_of() in scripts/build_voices.py. */
export function audioKey(text: string) {
  const norm = text.normalize("NFC").replace(/___/g, "…").replace(/\s+/g, " ").trim();
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(norm)) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

let current: HTMLAudioElement | null = null;

/**
 * Reads German text aloud: the pre-made recording (Piper voices, public/audio/tts) if there is one,
 * otherwise the browser's speech engine (de-DE). Resolves when the speech has finished (or was interrupted).
 */
export function speak(text: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  current?.pause();
  window.speechSynthesis?.cancel();
  const audio = new Audio(`/audio/tts/${audioKey(text)}.mp3`);
  current = audio;
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    const fallback = () => {
      if (settled) return;
      if (current !== audio) return finish();
      settled = true;
      browserSpeak(text, resolve);
    };
    audio.onended = finish;
    audio.onpause = finish;
    audio.onerror = fallback;
    audio.play().catch(fallback);
  });
}

function browserSpeak(text: string, done: () => void) {
  if (!("speechSynthesis" in window)) return done();
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/___/g, "…"));
  u.lang = "de-DE";
  u.rate = 0.9;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("de"));
  if (voice) u.voice = voice;
  u.onend = () => done();
  u.onerror = () => done();
  window.speechSynthesis.speak(u);
}

/** Stops whatever speak() is playing. */
export function stopSpeaking() {
  current?.pause();
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

export function SpeakButton({ text, className = "" }: { text: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      title="Listen (German)"
      aria-label="Listen"
      className={`inline-grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-sm hover:bg-indigo-100 ${className}`}
    >
      🔊
    </button>
  );
}

export function WordCardView({ c, compact = false }: { c: WordCard; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <ArticleWord text={c.display} className="font-medium" />
          <SpeakButton text={c.display} className="h-6 w-6 text-xs" />
        </span>
        <span className="shrink-0 text-[11px] text-slate-400">
          K{c.chapter}
          {c.important && <span className="ml-1 text-amber-500" title="Important word (bold in the book)">★</span>}
        </span>
      </div>
      <div className="text-slate-600">{c.meaning}</div>
      {c.ur && <Urdu className="text-sm text-slate-600">{c.ur}</Urdu>}
      {!compact && (c.plural || c.forms) && (
        <div className="mt-0.5 text-xs text-slate-500">{c.plural ?? c.forms}</div>
      )}
    </div>
  );
}
