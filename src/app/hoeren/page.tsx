import type { Metadata } from "next";
import Link from "next/link";
import HoerenTest from "@/components/HoerenLoader";

export const metadata: Metadata = {
  title: "Hören – A1 mock test (Start Deutsch 1 format)",
};

export default function HoerenPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hören</h1>
          <p className="text-slate-500">A1 mock test · Teil 1–3 · 15 Aufgaben · German voices</p>
        </div>
        <Link href="/" className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
          Quiz →
        </Link>
      </div>
      <HoerenTest />
    </main>
  );
}
