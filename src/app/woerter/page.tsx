import type { Metadata } from "next";
import Link from "next/link";
import { vocab } from "@/lib/quiz";
import WoerterView from "@/components/WoerterView";

export const metadata: Metadata = { title: "Wörter – all words by Kapitel with audio" };

export default function WoerterPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wörter</h1>
          <p className="text-slate-500">Every word by Kapitel · 🔊 listen · flashcards · English · اردو</p>
        </div>
        <Link href="/" className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
          ← Vokabel-Quiz
        </Link>
      </div>
      <WoerterView chapters={vocab.chapters} />
    </main>
  );
}
