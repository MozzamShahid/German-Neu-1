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

/** Reads German text aloud with the browser's speech engine (de-DE). */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/___/g, "…"));
  u.lang = "de-DE";
  u.rate = 0.9;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("de"));
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
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
