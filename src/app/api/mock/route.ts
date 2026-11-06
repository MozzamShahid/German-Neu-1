import { getSupabase } from "@/lib/supabase";

const SECTIONS = new Set(["hoeren", "lesen", "schreiben", "sprechen"]);

/** Saves one mock-test section result (table public.mock_attempts, see supabase/schema.sql). */
export async function POST(request: Request) {
  const sb = getSupabase();
  if (!sb) return Response.json({ saved: false, reason: "Supabase not configured" });

  const b = await request.json().catch(() => null);
  const name = String(b?.name ?? "").trim().slice(0, 60);
  if (!b || !name || !SECTIONS.has(b.section)) return Response.json({ error: "Bad request" }, { status: 400 });

  const row = {
    name,
    section: b.section,
    test_id: String(b.testId ?? "").slice(0, 20),
    mode: b.mode === "practice" ? "practice" : "exam",
    score: Number(b.score) || 0,
    max_score: Number(b.maxScore) || 0,
    duration_seconds: Number(b.durationSeconds) || null,
    answers: Array.isArray(b.answers) ? b.answers.slice(0, 100) : [],
  };

  const { data, error } = await sb.from("mock_attempts").insert(row).select("id").single();
  if (error) return Response.json({ saved: false, reason: error.message }, { status: 500 });
  return Response.json({ saved: true, id: data.id });
}
