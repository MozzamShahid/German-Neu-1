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

export function WordCardView({ c, compact = false }: { c: WordCard; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <ArticleWord text={c.display} className="font-medium" />
        <span className="shrink-0 text-[11px] text-slate-400">
          K{c.chapter}
          {c.important && <span className="ml-1 text-amber-500" title="Important word (bold in the book)">★</span>}
        </span>
      </div>
      <div className="text-slate-600">{c.meaning}</div>
      {!compact && (c.plural || c.forms) && (
        <div className="mt-0.5 text-xs text-slate-500">{c.plural ?? c.forms}</div>
      )}
    </div>
  );
}
