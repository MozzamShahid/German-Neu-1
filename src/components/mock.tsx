"use client";

import { useState } from "react";

/** Shared bits of the A1 mock-test sections (Hören, Lesen, Schreiben, Sprechen). */

export type SaveState = "idle" | "saving" | "saved" | "off" | "error";

/** The name typed on the quiz start page (localStorage), so the learner does not type it again. */
export function useSavedName() {
  return useState(() => {
    try {
      return String(JSON.parse(localStorage.getItem("quiz-settings") ?? "{}").name ?? "");
    } catch {
      return "";
    }
  });
}

export const nowSeconds = () => Date.now() / 1000;

export async function saveMock(body: {
  name: string;
  section: "hoeren" | "lesen" | "schreiben" | "sprechen";
  testId: string;
  mode?: "exam" | "practice";
  score: number;
  maxScore: number;
  durationSeconds: number | null;
  answers: unknown[];
}): Promise<SaveState> {
  if (!body.name.trim()) return "off";
  try {
    const res = await fetch("/api/mock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, name: body.name.trim() }),
    });
    const d = await res.json();
    return d.saved ? "saved" : d.reason === "Supabase not configured" ? "off" : "error";
  } catch {
    return "error";
  }
}

export function TestPicker({
  tests,
  value,
  onChange,
  name,
  onName,
  locked,
  children,
}: {
  tests: { id: string; title: string }[];
  value: string;
  onChange: (id: string) => void;
  name: string;
  onName: (n: string) => void;
  locked: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
      {tests.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${t.id === value ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-amber-100"}`}
        >
          {t.title}
        </button>
      ))}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {children}
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          disabled={locked}
          placeholder="Your name (to save)"
          className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm sm:w-48"
        />
      </div>
    </div>
  );
}

export function ScoreBox({
  score,
  max,
  saveState,
  onRetry,
  note,
}: {
  score: number;
  max: number;
  saveState: SaveState;
  onRetry: () => void;
  note?: string;
}) {
  const pct = max ? score / max : 0;
  return (
    <div className={`rounded-2xl p-5 text-center shadow-sm ${pct >= 0.6 ? "bg-emerald-50" : "bg-amber-50"}`}>
      <div className={`text-4xl font-bold ${pct >= 0.6 ? "text-emerald-700" : "text-amber-700"}`}>
        {Math.round(score * 10) / 10} / {max}
      </div>
      <div className="mt-1 text-slate-600">
        Goethe scale: {Math.round(pct * 25 * 10) / 10} / 25 Punkte · {pct >= 0.6 ? "bestanden ✓" : "pass ≈ 60 %"}
      </div>
      {note && <div className="mt-1 text-sm text-slate-500">{note}</div>}
      <div className="mt-1 text-xs text-slate-500">
        {saveState === "saving" && "Saving…"}
        {saveState === "saved" && "✓ Saved to your history"}
        {saveState === "off" && "Not saved (enter your name to save next time)"}
        {saveState === "error" && "Could not save the result"}
      </div>
      <button onClick={onRetry} className="mt-3 rounded-xl bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600">
        ↻ Try again
      </button>
    </div>
  );
}

export function PartHeader({ title, en, ur }: { title: string; en: string; ur: string }) {
  return (
    <>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-slate-500">{en}</p>
      <p dir="rtl" lang="ur" className="urdu text-[15px] text-slate-600">
        {ur}
      </p>
    </>
  );
}

/** Small page frame shared by the four sections. */
export function MockPage({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-slate-500">{subtitle}</p>
        </div>
        <a href="/pruefung" className="rounded-xl bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600">
          ← Prüfung
        </a>
      </div>
      {children}
    </main>
  );
}
