export type Pos = "noun" | "verb" | "other";

export interface Entry {
  id: number;
  chapter: number;
  section: string;
  topic: string;
  page: number;
  german: string;
  lemma: string;
  pos: Pos;
  important: boolean;
  meaning: string;
  example_de: string;
  example_en: string;
  article: string | null;
  plural_suffix: string | null;
  plural: string | null;
  number: string | null;
  forms: string | null;
  separable: boolean;
  note: string | null;
  article_rule: string | null;
  compound_head: number | null;
  family: number[];
}

export interface Chapter {
  id: number;
  title: string;
  count: number;
  nouns: number;
  verbs: number;
  important: number;
}

export interface Vocab {
  source: string;
  chapters: Chapter[];
  entries: Entry[];
}

export type QuestionType = "meaning" | "reverse" | "article" | "match";

/** Compact word card shown after answering ("learn more" panel). */
export interface WordCard {
  id: number;
  display: string; // "der Kindergarten" / "heißen"
  meaning: string;
  pos: Pos;
  important: boolean;
  chapter: number;
  plural?: string | null;
  forms?: string | null;
  example_de?: string;
  example_en?: string;
}

interface BaseQuestion {
  qid: string;
  type: QuestionType;
  marks: number;
  entryIds: number[];
}

export interface ChoiceQuestion extends BaseQuestion {
  type: "meaning" | "reverse" | "article";
  prompt: string;
  subPrompt?: string;
  options: string[];
  answer: number; // index into options
  maxRetries: number;
  hints: string[];
  explanation: string[];
  card: WordCard;
  related: WordCard[];
}

export interface MatchQuestion extends BaseQuestion {
  type: "match";
  prompt: string;
  left: { key: string; text: string }[]; // German
  right: { key: string; text: string }[]; // English (shuffled)
  explanation: string[];
  cards: WordCard[];
}

export type Question = ChoiceQuestion | MatchQuestion;

export interface QuizRequest {
  chapters: number[];
  mode: "questions" | "marks";
  count?: number;
  targetMarks?: number;
  types: QuestionType[];
  reviewIds?: number[];
}

export interface QuizResponse {
  questions: Question[];
  totalMarks: number;
  poolSize: number;
}

/** What the client records per question, saved to Supabase. */
export interface AnswerRecord {
  qid: string;
  type: QuestionType;
  entryIds: number[];
  marks: number;
  earned: number;
  wrongAttempts: number;
  usedHint: boolean;
  correct: boolean; // eventually answered correctly (first try or retry)
  firstTry: boolean;
}
