import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "A1 Prüfung – mock tests (Hören · Lesen · Schreiben · Sprechen)" };

const SECTIONS = [
  { href: "/hoeren", icon: "🎧", title: "Hören", text: "Conversations, announcements and phone messages with real German voices and background sounds.", ur: "سننا", time: "≈ 20 min · 15 Aufgaben" },
  { href: "/lesen", icon: "📄", title: "Lesen", text: "Emails, notes, ads and signs. Richtig / falsch and a / b.", ur: "پڑھنا", time: "≈ 25 min · 15 Aufgaben" },
  { href: "/schreiben", icon: "✍️", title: "Schreiben", text: "Fill in a form and write a short email. The AI checks your email and explains the mistakes.", ur: "لکھنا", time: "≈ 20 min · Formular + E-Mail" },
  { href: "/sprechen", icon: "🎤", title: "Sprechen", text: "Introduce yourself, ask and answer, make requests, by microphone. Plus Urdu → German practice.", ur: "بولنا", time: "≈ 15 min · Teil 1–3" },
];

export default function PruefungPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">A1 Prüfung</h1>
          <p className="text-slate-500">Mock tests in the Goethe Start Deutsch 1 format · pass ≈ 60 % per part</p>
        </div>
        <Link href="/" className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
          Quiz →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-3xl">{s.icon}</span>
              <span dir="rtl" lang="ur" className="urdu text-lg text-slate-500">{s.ur}</span>
            </div>
            <div className="mt-2 text-xl font-semibold">{s.title}</div>
            <p className="mt-1 text-sm text-slate-600">{s.text}</p>
            <div className="mt-2 text-xs text-slate-400">{s.time}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
