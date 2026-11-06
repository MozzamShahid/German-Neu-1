import "server-only";
import vocabJson from "@/data/vocab.json";
import { roundQuarter } from "./scoring";
import { grammarQuestions } from "./grammar";
import type {
  ChoiceQuestion,
  Entry,
  MatchQuestion,
  Question,
  QuestionType,
  QuizRequest,
  QuizResponse,
  Vocab,
  WordCard,
} from "./types";

export const vocab = vocabJson as unknown as Vocab;
const byId = new Map<number, Entry>(vocab.entries.map((e) => [e.id, e]));

// ---------------------------------------------------------------- helpers
const rand = () => Math.random();
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const qid = () => Math.random().toString(36).slice(2, 10);

export function display(e: Entry): string {
  if (e.pos === "noun" && e.article) return `${e.article} ${e.lemma}`;
  return e.lemma;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\((m|f|pl\.?|sg\.?)\)/g, "")
    .replace(/^here:\s*/, "")
    .replace(/[!?.]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function card(e: Entry): WordCard {
  return {
    id: e.id,
    display: display(e),
    meaning: e.meaning,
    pos: e.pos,
    important: e.important,
    chapter: e.chapter,
    plural: e.plural && e.pos === "noun" ? `die ${e.plural}` : null,
    forms: e.forms,
    example_de: e.example_de || undefined,
    example_en: e.example_en || undefined,
    ur: e.ur || undefined,
  };
}

function relatedCards(e: Entry): WordCard[] {
  return e.family
    .map((id) => byId.get(id))
    .filter((x): x is Entry => !!x)
    .slice(0, 6)
    .map(card);
}

/**
 * Marks are not flat 1-per-question: they depend on how important the word
 * is (bold in the book) and on its type. Verbs > nouns > other words.
 */
function marksFor(e: Entry, type: QuestionType): number {
  const tables: Record<string, number[]> = {
    "verb:1": [1.5, 1.75, 2],
    "noun:1": [1.25, 1.5, 1.75],
    "other:1": [1, 1.25, 1.5],
    "verb:0": [0.75, 1, 1.25],
    "noun:0": [0.75, 1],
    "other:0": [0.5, 0.75],
    "article:1": [1, 1.25, 1.5],
    "article:0": [0.5, 0.75],
  };
  const key =
    type === "article"
      ? `article:${e.important ? 1 : 0}`
      : `${e.pos}:${e.important ? 1 : 0}`;
  return pick(tables[key]);
}

// --------------------------------------------------------------- the pool
interface Word {
  key: string; // normalized display -> one "word" even if listed twice
  entries: Entry[];
  main: Entry;
  meanings: Set<string>;
}

function buildWords(entries: Entry[]): Word[] {
  const map = new Map<string, Word>();
  for (const e of entries) {
    if (e.lemma.length < 2 || !e.meaning) continue;
    if (e.pos === "other" && ["der", "die", "das", "den"].includes(e.lemma)) continue;
    const key = display(e).toLowerCase();
    let w = map.get(key);
    if (!w) {
      w = { key, entries: [], main: e, meanings: new Set() };
      map.set(key, w);
    }
    w.entries.push(e);
    w.meanings.add(norm(e.meaning));
    // prefer an important entry that has an example as the "main" one
    const score = (x: Entry) => (x.important ? 2 : 0) + (x.example_de ? 1 : 0);
    if (score(e) > score(w.main)) w.main = e;
  }
  return [...map.values()];
}

const allWords = buildWords(vocab.entries);
const meaningsOfDisplay = new Map<string, Set<string>>(
  allWords.map((w) => [w.key, w.meanings]),
);

function articleEligible(e: Entry) {
  return (
    e.pos === "noun" &&
    (e.article === "der" || e.article === "die" || e.article === "das") &&
    e.number !== "Pl"
  );
}

/** Weighted sample without replacement. */
function weightedOrder(words: Word[], boost: Set<number>): Word[] {
  return words
    .map((w) => {
      let weight = w.main.important ? 2.5 : 1;
      if (w.entries.some((e) => boost.has(e.id))) weight *= 20;
      // Efraimidis–Spirakis: key = u^(1/w)
      return { w, k: Math.pow(rand(), 1 / weight) };
    })
    .sort((a, b) => b.k - a.k)
    .map((x) => x.w);
}

// ------------------------------------------------------------ distractors
function meaningDistractors(target: Word, pool: Word[], n: number): string[] {
  const banned = new Set(target.meanings);
  const correct = norm(target.main.meaning);
  const chosen: string[] = [];
  const seen = new Set<string>([correct]);
  const tryFrom = (cands: Word[]) => {
    for (const w of shuffle(cands)) {
      if (chosen.length >= n) return;
      if (w.key === target.key) continue;
      const m = w.main.meaning;
      const nm = norm(m);
      if (banned.has(nm) || seen.has(nm) || nm.length < 2) continue;
      seen.add(nm);
      chosen.push(m);
    }
  };
  const samePos = (ws: Word[]) => ws.filter((w) => w.main.pos === target.main.pos);
  // up to 2 distractors from the same lesson (weekdays with weekdays, numbers
  // with numbers) – harder, and they make you notice the difference
  const sameTopic = samePos(pool).filter(
    (w) => w.main.chapter === target.main.chapter && w.main.topic === target.main.topic,
  );
  const want = n;
  n = Math.min(2, n);
  tryFrom(sameTopic);
  n = want;
  tryFrom(samePos(pool));
  tryFrom(samePos(allWords));
  tryFrom(allWords);
  return chosen;
}

function germanDistractors(target: Word, pool: Word[], n: number): string[] {
  const correctMeaning = norm(target.main.meaning);
  const chosen: string[] = [];
  const seen = new Set<string>([target.key]);
  const tryFrom = (cands: Word[]) => {
    for (const w of shuffle(cands)) {
      if (chosen.length >= n) return;
      if (seen.has(w.key)) continue;
      // skip synonyms (Würstchen / Würstel both = sausage)
      if (meaningsOfDisplay.get(w.key)?.has(correctMeaning)) continue;
      seen.add(w.key);
      chosen.push(display(w.main));
    }
  };
  const samePos = (ws: Word[]) => ws.filter((w) => w.main.pos === target.main.pos);
  // up to 2 distractors from the same lesson (weekdays with weekdays, numbers
  // with numbers) – harder, and they make you notice the difference
  const sameTopic = samePos(pool).filter(
    (w) => w.main.chapter === target.main.chapter && w.main.topic === target.main.topic,
  );
  const want = n;
  n = Math.min(2, n);
  tryFrom(sameTopic);
  n = want;
  tryFrom(samePos(pool));
  tryFrom(samePos(allWords));
  return chosen;
}

function withAnswer(correct: string, distractors: string[]) {
  const options = shuffle([correct, ...distractors]);
  return { options, answer: options.indexOf(correct) };
}

function blank(sentence: string, lemma: string): string {
  const word = lemma.replace(/^sich /, "").split(/[ ,]/)[0];
  if (word.length < 3) return sentence;
  const stem = word.length > 5 ? word.slice(0, word.length - 2) : word;
  const re = new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w*`, "gi");
  return sentence.replace(re, "_____");
}

// ---------------------------------------------------------- question makers
function meaningQuestion(w: Word, pool: Word[]): ChoiceQuestion {
  const e = w.main;
  const { options, answer } = withAnswer(e.meaning, meaningDistractors(w, pool, 3));
  const hints: string[] = [];
  if (e.example_de) hints.push(`Example: „${e.example_de}“`);
  hints.push(`Lesson: Kapitel ${e.chapter} – “${e.topic}”`);
  hints.push(`The meaning starts with “${e.meaning.replace(/^to /, "to ").slice(0, e.meaning.startsWith("to ") ? 4 : 1)}…”`);
  const explanation: string[] = [`${display(e)} = ${e.meaning}`];
  if (e.forms) explanation.push(`Forms: ${e.lemma}, ${e.forms}`);
  if (e.plural && e.pos === "noun") explanation.push(`Plural: die ${e.plural}`);
  if (e.example_de) explanation.push(`„${e.example_de}“ — ${e.example_en}`);
  if (w.meanings.size > 1)
    explanation.push(`Also means: ${[...new Set(w.entries.map((x) => x.meaning))].filter((m) => m !== e.meaning).join("; ")}`);
  return {
    qid: qid(),
    type: "meaning",
    marks: marksFor(e, "meaning"),
    entryIds: [e.id],
    prompt: display(e),
    subPrompt: "What does this mean in English?",
    options,
    answer,
    maxRetries: Math.max(0, options.length - 2),
    hints,
    explanation,
    card: card(e),
    related: relatedCards(e),
  };
}

function reverseQuestion(w: Word, pool: Word[]): ChoiceQuestion {
  const e = w.main;
  const { options, answer } = withAnswer(display(e), germanDistractors(w, pool, 3));
  const hints: string[] = [];
  if (e.example_de) hints.push(`Example: „${blank(e.example_de, e.lemma)}“`);
  const bare = e.lemma;
  hints.push(`Starts with “${bare.slice(0, 1)}…” and has ${bare.replace(/\s/g, "").length} letters`);
  if (e.pos === "noun" && e.article_rule) hints.push(e.article_rule);
  const explanation: string[] = [`${e.meaning} = ${display(e)}`];
  if (e.forms) explanation.push(`Forms: ${e.lemma}, ${e.forms}`);
  if (e.plural && e.pos === "noun") explanation.push(`Plural: die ${e.plural}`);
  if (e.example_de) explanation.push(`„${e.example_de}“ — ${e.example_en}`);
  return {
    qid: qid(),
    type: "reverse",
    marks: marksFor(e, "reverse"),
    entryIds: [e.id],
    prompt: e.meaning,
    subPrompt: "Which German word is it?",
    options,
    answer,
    maxRetries: Math.max(0, options.length - 2),
    hints,
    explanation,
    card: card(e),
    related: relatedCards(e),
  };
}

function articleQuestion(w: Word): ChoiceQuestion {
  const e = w.main;
  const options = ["der", "die", "das"];
  const answer = options.indexOf(e.article!);
  const head = e.compound_head != null ? byId.get(e.compound_head) : undefined;

  const hints: string[] = [`Meaning: ${e.meaning}`];
  if (head) hints.push(`It is a compound word – look at the last part: “${head.lemma}”`);
  if (e.article_rule) hints.push(`Rule: ${e.article_rule.replace(/\s(are|is)( always| usually)? (der|die|das).*$/, " → which article?")}`);

  const explanation: string[] = [`${e.article} ${e.lemma} = ${e.meaning}`];
  if (head)
    explanation.push(
      `Compound noun → the LAST word decides the article: ${head.article} ${head.lemma} → ${e.article} ${e.lemma}`,
    );
  if (e.article_rule) explanation.push(e.article_rule);
  if (e.plural) explanation.push(`Plural: die ${e.plural} (every plural uses “die”)`);
  if (!head && !e.article_rule)
    explanation.push("No rule here – learn it together with its article as one unit.");

  return {
    qid: qid(),
    type: "article",
    marks: marksFor(e, "article"),
    entryIds: [e.id],
    prompt: `___ ${e.lemma}`,
    subPrompt: "der, die or das?",
    options,
    answer,
    maxRetries: 1,
    hints,
    explanation,
    card: card(e),
    related: relatedCards(e),
  };
}

/**
 * Matching question built around a word family when possible, so related
 * words are learned together (das Kind – der Kindergarten – das Kinderzimmer).
 */
function matchQuestion(seed: Word, pool: Word[], poolByEntry: Map<number, Word>): MatchQuestion {
  const picked: Word[] = [seed];
  const usedMeaning = new Set([norm(seed.main.meaning)]);
  const add = (w: Word | undefined) => {
    if (!w || picked.length >= 4) return;
    if (picked.some((p) => p.key === w.key)) return;
    const m = norm(w.main.meaning);
    if (usedMeaning.has(m)) return;
    usedMeaning.add(m);
    picked.push(w);
  };
  for (const id of shuffle(seed.main.family)) add(poolByEntry.get(id));
  const familyCount = picked.length;
  for (const w of shuffle(pool)) {
    if (picked.length >= 4) break;
    add(w);
  }
  const items = picked.map((w, i) => ({ key: `k${i}`, w }));
  const marks = roundQuarter(
    Math.max(1, items.reduce((s, it) => s + marksFor(it.w.main, "meaning"), 0) * 0.5),
  );
  const explanation: string[] = [];
  if (familyCount > 1)
    explanation.push(
      `Word family: ${picked
        .slice(0, familyCount)
        .map((w) => display(w.main))
        .join(" · ")} – remember them together!`,
    );
  return {
    qid: qid(),
    type: "match",
    marks,
    entryIds: picked.map((w) => w.main.id),
    prompt: "Match each German word with its meaning",
    left: shuffle(items.map((it) => ({ key: it.key, text: display(it.w.main) }))),
    right: shuffle(items.map((it) => ({ key: it.key, text: it.w.main.meaning }))),
    explanation,
    cards: picked.map((w) => card(w.main)),
  };
}

// --------------------------------------------------------------- generator
export function generateQuiz(req: QuizRequest): QuizResponse {
  const chapters = new Set(req.chapters.filter((c) => c >= 1 && c <= vocab.chapters.length));
  let types = (req.types?.length ? req.types : ["meaning", "article", "match"]) as QuestionType[];
  const topics = req.grammarTopics ?? [];
  if (!topics.length) types = types.filter((t) => t !== "grammar");
  const vocabTypes = types.filter((t) => t !== "grammar");
  if (vocabTypes.length && chapters.size === 0) {
    if (types.includes("grammar")) types = ["grammar"];
    else throw new Error("Select at least one chapter");
  }
  if (types.length === 0) throw new Error("Select at least one question type");

  const pool = buildWords(vocab.entries.filter((e) => chapters.has(e.chapter)));
  const poolByEntry = new Map<number, Word>();
  for (const w of pool) for (const e of w.entries) poolByEntry.set(e.id, w);

  const boost = new Set(req.reviewIds ?? []);
  const nounPool = pool.filter((w) => articleEligible(w.main));
  if (nounPool.length === 0) types = types.filter((t) => t !== "article");
  if (pool.length === 0) types = types.filter((t) => t === "grammar");
  if (types.length === 0) throw new Error("No words in the selected chapters");

  // grammar questions are prepared up front (balanced over the chosen topics)
  const grammarQueue: Question[] = types.includes("grammar")
    ? grammarQuestions(topics, req.mode === "marks" ? 200 : Math.min(200, req.count ?? 10), req.reviewItemIds)
    : [];
  if (types.includes("grammar") && grammarQueue.length === 0) types = types.filter((t) => t !== "grammar");

  const ordered = weightedOrder(pool, boost);
  const orderedNouns = weightedOrder(nounPool, boost);
  const familySeeds = weightedOrder(
    pool.filter((w) => w.main.family.some((id) => poolByEntry.has(id))),
    boost,
  );

  const used = new Set<string>();
  const next = (list: Word[]): Word => {
    const w = list.find((x) => !used.has(x.key)) ?? pick(list);
    used.add(w.key);
    return w;
  };

  const maxQ = Math.min(200, Math.max(1, req.count ?? 10));
  const target = req.mode === "marks" ? Math.max(1, req.targetMarks ?? 20) : Infinity;
  const questions: Question[] = [];
  let total = 0;

  // type rotation: shuffled cycle so the mix is even but not predictable
  let cycle: QuestionType[] = [];
  const nextType = () => {
    if (cycle.length === 0) cycle = shuffle(types);
    return cycle.pop()!;
  };

  while (req.mode === "marks" ? total < target && questions.length < 200 : questions.length < maxQ) {
    const t = nextType();
    let q: Question;
    if (t === "grammar") {
      const g = grammarQueue.shift();
      if (!g) {
        types = types.filter((x) => x !== "grammar");
        cycle = [];
        if (types.length === 0) break;
        continue;
      }
      q = g;
    } else if (t === "article") q = articleQuestion(next(orderedNouns));
    else if (t === "match") {
      const seed = familySeeds.find((x) => !used.has(x.key)) ?? next(ordered);
      used.add(seed.key);
      q = matchQuestion(seed, pool.filter((w) => !used.has(w.key)).length >= 3 ? pool.filter((w) => !used.has(w.key)) : pool, poolByEntry);
      q.entryIds.forEach((id) => {
        const w = poolByEntry.get(id);
        if (w) used.add(w.key);
      });
    } else if (t === "reverse") q = reverseQuestion(next(ordered), pool);
    else q = meaningQuestion(next(ordered), pool);
    questions.push(q);
    total += q.marks;
  }

  return { questions, totalMarks: roundQuarter(total), poolSize: pool.length };
}
