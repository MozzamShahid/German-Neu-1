import { generateQuiz, vocab } from "@/lib/quiz";
import { GRAMMAR_TOPICS, OPTIONAL_TOPICS, type GrammarTopic, type QuestionType, type QuizRequest } from "@/lib/types";

const TYPES: QuestionType[] = ["meaning", "reverse", "article", "match", "grammar"];
const TOPICS: string[] = [...GRAMMAR_TOPICS, ...OPTIONAL_TOPICS];

export async function GET() {
  return Response.json({ chapters: vocab.chapters });
}

export async function POST(request: Request) {
  let body: Partial<QuizRequest>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const chapters = Array.isArray(body.chapters) ? body.chapters.map(Number).filter(Number.isInteger) : [];
  const types = (Array.isArray(body.types) ? body.types : []).filter((t): t is QuestionType =>
    TYPES.includes(t as QuestionType),
  );
  try {
    const quiz = generateQuiz({
      chapters,
      types,
      mode: body.mode === "marks" ? "marks" : "questions",
      count: Number(body.count) || 10,
      targetMarks: Number(body.targetMarks) || 20,
      reviewIds: Array.isArray(body.reviewIds) ? body.reviewIds.map(Number).slice(0, 300) : [],
      grammarTopics: (Array.isArray(body.grammarTopics) ? body.grammarTopics : []).filter((t): t is GrammarTopic =>
        TOPICS.includes(t as string),
      ),
      reviewItemIds: Array.isArray(body.reviewItemIds) ? body.reviewItemIds.map(Number).slice(0, 300) : [],
    });
    return Response.json(quiz);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
