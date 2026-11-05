import { getSupabase } from "@/lib/supabase";
import type { AnswerRecord } from "@/lib/types";

const clampName = (n: unknown) => String(n ?? "").trim().slice(0, 60);

export async function POST(request: Request) {
  const sb = getSupabase();
  if (!sb) return Response.json({ saved: false, reason: "Supabase not configured" });

  const b = await request.json().catch(() => null);
  const name = clampName(b?.name);
  if (!b || !name) return Response.json({ error: "Name required" }, { status: 400 });

  const answers: AnswerRecord[] = Array.isArray(b.answers) ? b.answers.slice(0, 200) : [];
  const wrongIds = [
    ...new Set(answers.filter((a) => !a.firstTry).flatMap((a) => a.entryIds ?? [])),
  ].filter(Number.isInteger);

  const row = {
    name,
    chapters: (b.chapters ?? []).map(Number).filter(Number.isInteger),
    question_types: (b.types ?? []).map(String),
    mode: b.mode === "marks" ? "marks" : "questions",
    question_count: answers.length,
    target_marks: b.targetMarks ?? null,
    max_score: Number(b.maxScore) || 0,
    score: Number(b.score) || 0,
    correct_first: answers.filter((a) => a.firstTry).length,
    correct_retry: answers.filter((a) => a.correct && !a.firstTry).length,
    wrong: answers.filter((a) => !a.correct).length,
    hints_used: answers.filter((a) => a.usedHint).length,
    duration_seconds: Number(b.durationSeconds) || null,
    wrong_entry_ids: wrongIds,
    answers,
  };

  const { data, error } = await sb.from("quiz_attempts").insert(row).select("id").single();
  if (error) return Response.json({ saved: false, reason: error.message }, { status: 500 });
  return Response.json({ saved: true, id: data.id });
}

/** History for a name + the words they still get wrong (for "practice mistakes"). */
export async function GET(request: Request) {
  const sb = getSupabase();
  if (!sb) return Response.json({ configured: false, attempts: [], reviewIds: [], reviewItemIds: [] });

  const name = clampName(new URL(request.url).searchParams.get("name")).toLowerCase();
  if (!name) return Response.json({ configured: true, attempts: [], reviewIds: [] });

  const { data, error } = await sb
    .from("quiz_attempts")
    .select(
      "id, chapters, question_count, max_score, score, correct_first, wrong, created_at, wrong_entry_ids, answers",
    )
    .eq("name_key", name)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return Response.json({ configured: true, error: error.message, attempts: [], reviewIds: [] });

  // newest first: a word counts as "learned" once answered right on first try later
  const learned = new Set<number>();
  const review = new Set<number>();
  const learnedItems = new Set<number>();
  const reviewItems = new Set<number>();
  for (const a of data) {
    for (const ans of (a.answers ?? []) as AnswerRecord[]) {
      if (typeof ans.itemId === "number") {
        if (ans.firstTry) {
          if (!reviewItems.has(ans.itemId)) learnedItems.add(ans.itemId);
        } else if (!learnedItems.has(ans.itemId)) reviewItems.add(ans.itemId);
      }
      for (const id of ans.entryIds ?? []) {
        if (ans.firstTry) {
          if (!review.has(id)) learned.add(id);
        } else if (!learned.has(id)) review.add(id);
      }
    }
  }

  return Response.json({
    configured: true,
    attempts: data.map((a) => ({ id: a.id, chapters: a.chapters, question_count: a.question_count, max_score: a.max_score, score: a.score, correct_first: a.correct_first, wrong: a.wrong, created_at: a.created_at })),
    reviewIds: [...review],
    reviewItemIds: [...reviewItems],
  });
}
