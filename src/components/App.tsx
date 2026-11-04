"use client";

import { useRef, useState } from "react";
import type { AnswerRecord, Chapter, QuizResponse } from "@/lib/types";
import Setup, { type SetupValues } from "./Setup";
import Quiz from "./Quiz";
import Results from "./Results";

const DEFAULTS: SetupValues = {
  name: "",
  chapters: [1],
  mode: "questions",
  count: 10,
  targetMarks: 20,
  types: ["meaning", "article", "match"],
};

type Stage =
  | { kind: "setup" }
  | { kind: "quiz"; quiz: QuizResponse }
  | { kind: "results"; quiz: QuizResponse; answers: AnswerRecord[] };

export default function App({ chapters }: { chapters: Chapter[] }) {
  // rendered client-only (see AppLoader), so localStorage is available here
  const [settings, setSettings] = useState<SetupValues>(() => {
    try {
      const raw = localStorage.getItem("quiz-settings");
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULTS;
  });
  const [stage, setStage] = useState<Stage>({ kind: "setup" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "off" | "error">("saving");
  const startedAt = useRef(0);

  const start = async (v: SetupValues) => {
    setLoading(true);
    setError(null);
    setSettings(v);
    if (!v.reviewIds?.length) localStorage.setItem("quiz-settings", JSON.stringify(v));
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create quiz");
      startedAt.current = Date.now();
      setStage({ kind: "quiz", quiz: data });
      window.scrollTo(0, 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const finish = async (quiz: QuizResponse, answers: AnswerRecord[]) => {
    setStage({ kind: "results", quiz, answers });
    setSaveState("saving");
    window.scrollTo(0, 0);
    const score = answers.reduce((s, a) => s + a.earned, 0);
    const maxScore = answers.reduce((s, a) => s + a.marks, 0);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settings.name,
          chapters: settings.chapters,
          types: settings.types,
          mode: settings.mode,
          targetMarks: settings.mode === "marks" ? settings.targetMarks : null,
          score,
          maxScore,
          durationSeconds: Math.round((Date.now() - startedAt.current) / 1000),
          answers,
        }),
      });
      const data = await res.json();
      setSaveState(data.saved ? "saved" : data.reason === "Supabase not configured" ? "off" : "error");
    } catch {
      setSaveState("error");
    }
  };

  if (stage.kind === "quiz")
    return (
      <Quiz
        questions={stage.quiz.questions}
        totalMarks={stage.quiz.totalMarks}
        onFinish={(a) => finish(stage.quiz, a)}
        onQuit={() => setStage({ kind: "setup" })}
      />
    );

  if (stage.kind === "results")
    return (
      <Results
        name={settings.name}
        questions={stage.quiz.questions}
        answers={stage.answers}
        totalMarks={stage.quiz.totalMarks}
        saveState={saveState}
        onRestart={() => setStage({ kind: "setup" })}
        onPracticeMistakes={(ids) =>
          start({ ...settings, mode: "questions", count: Math.min(30, Math.max(5, ids.length)), reviewIds: ids })
        }
      />
    );

  return <Setup chapters={chapters} initial={settings} onStart={start} loading={loading} error={error} />;
}
