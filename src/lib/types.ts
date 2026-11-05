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
  ur?: string;
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

export type QuestionType = "meaning" | "reverse" | "article" | "match" | "grammar";

export const GRAMMAR_TOPICS = [
  "konjugation",
  "wortstellung",
  "pronomen",
  "artikel",
  "modalverben",
  "trennbar",
  "vergangenheit",
  "zahlen",
  "uhrzeit",
  "wortbildung",
  "redemittel",
] as const;
export const OPTIONAL_TOPICS = ["akkusativ", "dativ", "wechsel"] as const;
export type GrammarTopic = (typeof GRAMMAR_TOPICS)[number] | (typeof OPTIONAL_TOPICS)[number];

export interface GrammarItem {
  id: number;
  topic: GrammarTopic;
  de: string;
  en: string;
  ur: string;
  rule: string;
  level: number;
  fill?: { text: string; answer: string; options: string[]; why_en: string; why_ur: string; cue: string };
  order?: { chunks: string[]; fixed: number; punct: string };
  pick?: string[];
}

/** A full sentence with its translations, shown with grammar questions. */
export interface SentenceInfo {
  de: string;
  en: string;
  ur: string;
  topic: GrammarTopic;
  itemId: number;
}

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
  ur?: string;
  example_de?: string;
  example_en?: string;
}

interface BaseQuestion {
  qid: string;
  type: QuestionType;
  marks: number;
  entryIds: number[];
  /** grammar questions: the sentence + translations */
  sentence?: SentenceInfo;
  format?: "fill" | "pick" | "order";
}

export interface ChoiceQuestion extends BaseQuestion {
  type: "meaning" | "reverse" | "article" | "grammar";
  prompt: string;
  subPrompt?: string;
  options: string[];
  answer: number; // index into options
  maxRetries: number;
  hints: string[];
  explanation: string[];
  /** Urdu explanation lines (grammar questions) */
  explanationUr?: string[];
  card?: WordCard;
  related: WordCard[];
}

export interface OrderQuestion extends BaseQuestion {
  type: "grammar";
  format: "order";
  prompt: string;
  chunks: string[]; // shuffled, excluding the fixed ones
  fixed: string[]; // already placed at the start
  answer: string[]; // correct order of the movable chunks
  punct: string;
  maxRetries: number;
  explanation: string[];
  explanationUr?: string[];
}

export interface MatchQuestion extends BaseQuestion {
  type: "match";
  prompt: string;
  left: { key: string; text: string }[]; // German
  right: { key: string; text: string }[]; // English (shuffled)
  explanation: string[];
  cards: WordCard[];
}

export type Question = ChoiceQuestion | MatchQuestion | OrderQuestion;

export interface QuizRequest {
  chapters: number[];
  mode: "questions" | "marks";
  count?: number;
  targetMarks?: number;
  types: QuestionType[];
  reviewIds?: number[];
  grammarTopics?: GrammarTopic[];
  reviewItemIds?: number[];
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
  itemId?: number; // grammar item id
}
