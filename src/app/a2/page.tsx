import type { Metadata } from "next";
import Link from "next/link";
import { A2 } from "@/components/MockLoaders";

export const metadata: Metadata = { title: "A2 Sprechen – talk about daily-life topics" };

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">A2 Sprechen</h1>
          <p className="text-slate-500">Reden üben · daily-life topics · 1, 2 or 5 minutes · AI feedback</p>
        </div>
        <Link href="/" className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
          ← Start
        </Link>
      </div>
      <A2 />
    </main>
  );
}
