import { card, vocab } from "@/lib/quiz";

/** All words of one Kapitel for the Wörter page (duplicates in the glossary are merged). */
export async function GET(request: Request) {
  const chapter = Number(new URL(request.url).searchParams.get("chapter"));
  const seen = new Set<string>();
  const words = vocab.entries
    .filter((e) => e.chapter === chapter)
    .map(card)
    .filter((c) => {
      const k = c.display.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  return Response.json({ words });
}
