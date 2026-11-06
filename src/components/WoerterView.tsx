"use client";

import { useEffect, useRef, useState } from "react";
import type { Chapter, WordCard } from "@/lib/types";
import { ArticleWord, speak, SpeakButton, stopSpeaking, Urdu, WordCardView } from "./Word";

type Filter = "all" | "noun" | "verb" | "important";
const FILTERS: [Filter, string][] = [
  ["all", "Alle"],
  ["noun", "Nomen"],
  ["verb", "Verben"],
  ["important", "★ wichtig"],
];

export default function WoerterView({ chapters }: { chapters: Chapter[] }) {
  const [chapter, setChapter] = useState(chapters[0].id);
  const [words, setWords] = useState<WordCard[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"list" | "cards">("list");
  const [playingAll, setPlayingAll] = useState(false);
  const stopAll = useRef(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/words?chapter=${chapter}`)
      .then((r) => r.json())
      .then((d) => alive && setWords(d.words));
    return () => {
      alive = false;
    };
  }, [chapter]);

  const changeChapter = (id: number) => {
    stopAll.current = true;
    stopSpeaking();
    setPlayingAll(false);
    setWords(null);
    setChapter(id);
  };

  const q = query.trim().toLowerCase();
  const shown = (words ?? []).filter(
    (w) =>
      (filter === "all" || (filter === "important" ? w.important : w.pos === filter)) &&
      (!q || w.display.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q)),
  );

  const playAll = async () => {
    if (playingAll) {
      stopAll.current = true;
      stopSpeaking();
      setPlayingAll(false);
      return;
    }
    stopAll.current = false;
    setPlayingAll(true);
    for (const w of shown) {
      if (stopAll.current) break;
      document.getElementById(`w${w.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      document.getElementById(`w${w.id}`)?.classList.add("ring-2", "ring-indigo-400");
      await speak(w.display);
      document.getElementById(`w${w.id}`)?.classList.remove("ring-2", "ring-indigo-400");
      await new Promise((r) => setTimeout(r, 700));
    }
    setPlayingAll(false);
  };

  const ch = chapters.find((c) => c.id === chapter)!;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-slate-500">Kapitel</div>
        <div className="flex flex-wrap gap-1.5">
          {chapters.map((c) => (
            <button
              key={c.id}
              onClick={() => changeChapter(c.id)}
              title={c.title}
              className={`h-9 min-w-9 rounded-lg px-2 text-sm font-semibold ${c.id === chapter ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-indigo-100"}`}
            >
              {c.id}
            </button>
          ))}
        </div>
        <div className="mt-2 text-sm text-slate-600">
          <b>Kapitel {ch.id}:</b> {ch.title}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([f, l]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${filter === f ? "bg-slate-800 text-white" : "bg-white text-slate-600 shadow-sm"}`}
          >
            {l}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-36 rounded-full border border-slate-200 px-3 py-1 text-sm"
        />
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setMode(mode === "list" ? "cards" : "list")}
            className="rounded-full bg-amber-500 px-3 py-1 text-sm font-semibold text-white hover:bg-amber-600"
          >
            {mode === "list" ? "🃏 Flashcards" : "📋 List"}
          </button>
          {mode === "list" && (
            <button
              onClick={playAll}
              disabled={!shown.length}
              className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {playingAll ? "■ Stop" : "▶ Alle anhören"}
            </button>
          )}
        </div>
      </div>

      {!words ? (
        <div className="p-10 text-center text-slate-400">Loading…</div>
      ) : mode === "list" ? (
        <>
          <div className="text-sm text-slate-500">{shown.length} Wörter · tap 🔊 to listen</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {shown.map((w) => (
              <div key={w.id} id={`w${w.id}`} className="rounded-xl transition">
                <WordCardView c={w} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <Flashcards key={`${chapter}-${filter}-${q}`} words={shown} />
      )}
    </div>
  );
}

function Flashcards({ words }: { words: WordCard[] }) {
  const [deck, setDeck] = useState(() => [...words].sort(() => Math.random() - 0.5));
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);

  const w = deck[0];
  useEffect(() => {
    if (w) speak(w.display);
  }, [w]);

  if (!words.length) return <div className="p-10 text-center text-slate-400">No words.</div>;
  if (!w)
    return (
      <div className="rounded-2xl bg-emerald-50 p-8 text-center shadow-sm">
        <div className="text-3xl">🎉</div>
        <div className="mt-2 text-xl font-semibold text-emerald-800">Alle {words.length} Wörter gelernt!</div>
        <button
          onClick={() => {
            setDeck([...words].sort(() => Math.random() - 0.5));
            setKnown(0);
          }}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white"
        >
          ↻ Nochmal
        </button>
      </div>
    );

  const answer = (ok: boolean) => {
    setFlipped(false);
    if (ok) {
      setKnown((k) => k + 1);
      setDeck((d) => d.slice(1));
    } else {
      // put it back a few cards later
      setDeck((d) => {
        const rest = d.slice(1);
        const at = Math.min(rest.length, 3);
        return [...rest.slice(0, at), d[0], ...rest.slice(at)];
      });
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-2 flex justify-between text-sm text-slate-500">
        <span>✓ {known} gelernt</span>
        <span>{deck.length} übrig</span>
      </div>
      <button
        onClick={() => setFlipped(!flipped)}
        className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl bg-white p-6 text-center shadow-md"
      >
        <ArticleWord text={w.display} className="text-3xl font-bold" />
        {w.plural && <div className="mt-1 text-sm text-slate-400">{w.plural}</div>}
        {flipped ? (
          <div className="mt-4 space-y-1">
            <div className="text-xl text-slate-700">{w.meaning}</div>
            {w.ur && <Urdu className="text-2xl text-emerald-800">{w.ur}</Urdu>}
            {w.example_de && <div className="pt-2 text-sm italic text-slate-500">{w.example_de}</div>}
          </div>
        ) : (
          <div className="mt-6 text-sm text-slate-400">Tap to see the meaning</div>
        )}
      </button>
      <div className="mt-3 flex items-center justify-center gap-3">
        <button onClick={() => answer(false)} className="rounded-xl bg-rose-100 px-5 py-2.5 font-semibold text-rose-700 hover:bg-rose-200">
          ↻ Nochmal
        </button>
        <SpeakButton text={w.display} className="h-11 w-11 text-lg" />
        <button onClick={() => answer(true)} className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700">
          ✓ Weiß ich
        </button>
      </div>
    </div>
  );
}
