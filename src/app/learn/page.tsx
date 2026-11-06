import type { Metadata } from "next";
import Link from "next/link";
import { LESSONS } from "@/data/lessons";
import LessonView from "@/components/LessonView";

export const metadata: Metadata = {
  title: "Lernen – Deutsch A1 notes (English · اردو)",
};

export default function LearnPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lernen</h1>
          <p className="text-slate-500">Lecture notes (Week 2–13) · German · English · اردو · 🔊 listen</p>
        </div>
        <Link href="/" className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
          ← Vokabel-Quiz
        </Link>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2">
        {LESSONS.map((l) => (
          <a key={l.id} href={`#${l.id}`} className="rounded-full bg-white px-3 py-1 text-sm text-slate-600 shadow-sm hover:text-indigo-700">
            {l.title.split(" – ")[0]}
          </a>
        ))}
      </nav>

      <div className="space-y-4">
        {LESSONS.map((l, i) => (
          <LessonView key={l.id} lesson={l} defaultOpen={i === 0} />
        ))}
      </div>
    </main>
  );
}
