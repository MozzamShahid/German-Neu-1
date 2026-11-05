import "server-only";
import grammarJson from "@/data/grammar.json";
import type { ChoiceQuestion, GrammarItem, GrammarTopic, OrderQuestion, Question, SentenceInfo } from "./types";

export const grammarItems = (grammarJson as unknown as { items: GrammarItem[] }).items;

const rand = () => Math.random();
const pick = <T,>(a: T[]): T => a[Math.floor(rand() * a.length)];
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const qid = () => Math.random().toString(36).slice(2, 10);

/** Rule explanations for items that only have order/pick questions. */
const RULES: Record<string, { en: string; ur: string }> = {
  "w-frage": {
    en: "W-Frage: W-word (wo, woher, was, wann …) + VERB + subject. The verb is always in position 2.",
    ur: "W-Frage: سوالیہ لفظ + فعل + فاعل۔ فعل ہمیشہ دوسری جگہ پر آتا ہے۔",
  },
  "ja-nein": {
    en: "Ja/Nein-Frage: the VERB comes first, then the subject: Wohnst du in Lahore?",
    ur: "ہاں/نہیں والے سوال میں فعل سب سے پہلے آتا ہے، پھر فاعل۔",
  },
  imperativ: {
    en: "Imperativ (request with Sie): verb first + Sie: Gehen Sie rechts!",
    ur: "حکم یا درخواست: فعل سب سے پہلے، پھر Sie۔",
  },
  "verb-2": {
    en: "The verb is ALWAYS in position 2. If a time word comes first, the subject moves behind the verb.",
    ur: "فعل ہمیشہ دوسری جگہ پر۔ اگر وقت کا لفظ پہلے آئے تو فاعل فعل کے بعد چلا جاتا ہے۔",
  },
  modal: {
    en: "Modal verb in position 2 (conjugated) + the second verb at the END in the infinitive.",
    ur: "Modal verb دوسری جگہ پر، اور دوسرا فعل آخر میں اپنی اصل شکل میں۔",
  },
  "modal-frage": {
    en: "Question with a modal verb: modal verb first, subject, …, infinitive at the end: Kannst du Deutsch sprechen?",
    ur: "Modal verb والا سوال: modal verb پہلے، پھر فاعل، اور اصل فعل آخر میں۔",
  },
  trennbar: {
    en: "Separable verb: the verb part is in position 2, the prefix goes to the END: Ich stehe um 7 Uhr auf.",
    ur: "trennbares Verb: فعل کا حصہ دوسری جگہ پر اور prefix جملے کے آخر میں۔",
  },
  "trennbar-modal": {
    en: "With a modal verb the separable verb stays together at the end: Ich muss früh aufstehen.",
    ur: "Modal verb کے ساتھ trennbares Verb نہیں ٹوٹتا۔",
  },
  "perfekt-aux": {
    en: "Perfekt: haben/sein in position 2 + Partizip II at the END. Movement → sein, most others → haben.",
    ur: "Perfekt: haben/sein دوسری جگہ پر + Partizip II آخر میں۔ حرکت ہو تو sein، باقی haben۔",
  },
  konjugation: {
    en: "Present tense endings: ich -e, du -st, er/sie/es -t, wir -en, ihr -t, sie/Sie -en.",
    ur: "حال کی endings: ich ‎-e، du ‎-st، er ‎-t، wir ‎-en، ihr ‎-t، sie/Sie ‎-en",
  },
};

export const TOPIC_LABEL: Record<GrammarTopic, string> = {
  konjugation: "Verben & Konjugation",
  wortstellung: "Satzbau (verb position)",
  pronomen: "Pronomen (er/sie/es, Sie/sie)",
  artikel: "ein/kein, Plural, mein/dein",
  modalverben: "Modalverben",
  trennbar: "Trennbare Verben",
  vergangenheit: "Perfekt, war, hatte",
  zahlen: "Zahlen & Datum",
  uhrzeit: "Uhrzeit, am/um/zum",
  wortbildung: "Wortbildung (-los, -er, -ung …)",
  redemittel: "Redemittel (Brief, Arzt, Restaurant …)",
  akkusativ: "Akkusativ",
  dativ: "Dativ",
  wechsel: "Wechselpräpositionen",
};

function marksFor(it: GrammarItem, format: string): number {
  const base = it.level >= 3 ? [1.5, 1.75] : it.level === 2 ? [1.25, 1.5] : [1, 1.25];
  return pick(base) + (format === "order" ? 0.25 : 0);
}

function lowerFirst(s: string) {
  return s.startsWith("Sie") ? s : s[0].toLowerCase() + s.slice(1);
}

function sentenceInfo(it: GrammarItem): SentenceInfo {
  return { de: it.de, en: it.en, ur: it.ur, topic: it.topic, itemId: it.id };
}

function explain(it: GrammarItem): { en: string[]; ur: string[] } {
  const r = RULES[it.rule];
  const en = [it.fill?.why_en ?? r?.en ?? ""].filter(Boolean);
  const ur = [it.fill?.why_ur ?? r?.ur ?? ""].filter(Boolean);
  if (it.fill && r && it.fill.why_en !== r.en && ["w-frage", "ja-nein", "modal", "trennbar", "perfekt-aux"].includes(it.rule)) {
    en.push(r.en);
    ur.push(r.ur);
  }
  return { en, ur };
}

function fillQuestion(it: GrammarItem): ChoiceQuestion {
  const f = it.fill!;
  const options = shuffle(f.options);
  const ex = explain(it);
  const r = RULES[it.rule];
  const hints = [r?.en ?? f.why_en.split(". ")[0]];
  return {
    qid: qid(),
    type: "grammar",
    format: "fill",
    marks: marksFor(it, "fill"),
    entryIds: [],
    prompt: f.text + (f.cue ? `  ${f.cue}` : ""),
    subPrompt: "Fill the gap",
    options,
    answer: options.indexOf(f.answer),
    maxRetries: Math.max(0, options.length - 2),
    hints,
    explanation: [`✔ ${it.de}`, ...ex.en],
    explanationUr: ex.ur,
    related: [],
    sentence: sentenceInfo(it),
  };
}

function pickQuestion(it: GrammarItem): ChoiceQuestion {
  const options = shuffle(it.pick!);
  const ex = explain(it);
  return {
    qid: qid(),
    type: "grammar",
    format: "pick",
    marks: marksFor(it, "pick"),
    entryIds: [],
    prompt: "Which sentence is correct?",
    subPrompt: "Choose the correct German sentence",
    options,
    answer: options.indexOf(it.de),
    maxRetries: Math.max(0, options.length - 2),
    hints: [RULES[it.rule]?.en ?? ex.en[0] ?? ""].filter(Boolean),
    explanation: [`✔ ${it.de}`, ...ex.en],
    explanationUr: ex.ur,
    related: [],
    sentence: sentenceInfo(it),
  };
}

function orderQuestion(it: GrammarItem): OrderQuestion {
  const o = it.order!;
  const chunks = [...o.chunks];
  if (o.fixed === 0) chunks[0] = lowerFirst(chunks[0]); // don't give the first word away by its capital letter
  const fixed = chunks.slice(0, o.fixed);
  const answer = chunks.slice(o.fixed);
  let shuffled = shuffle(answer);
  for (let i = 0; i < 5 && shuffled.join("|") === answer.join("|"); i++) shuffled = shuffle(answer);
  const ex = explain(it);
  return {
    qid: qid(),
    type: "grammar",
    format: "order",
    marks: marksFor(it, "order"),
    entryIds: [],
    prompt: "Put the words in the right order",
    chunks: shuffled,
    fixed,
    answer,
    punct: o.punct,
    maxRetries: 2,
    explanation: [`✔ ${it.de}`, ...ex.en],
    explanationUr: ex.ur,
    sentence: sentenceInfo(it),
  };
}

/** Pick `n` grammar questions from the chosen topics (review items first). */
export function grammarQuestions(topics: GrammarTopic[], n: number, reviewItemIds: number[] = []) {
  const set = new Set(topics);
  const pool = grammarItems.filter((it) => set.has(it.topic));
  if (pool.length === 0) return [];
  const boost = new Set(reviewItemIds);
  // balance topics: round-robin over topics, random item inside each topic
  const byTopic = new Map<string, GrammarItem[]>();
  for (const it of shuffle(pool)) {
    const list = byTopic.get(it.topic) ?? [];
    if (boost.has(it.id)) list.unshift(it);
    else list.push(it);
    byTopic.set(it.topic, list);
  }
  const usedDe = new Set<string>();
  const out: Question[] = [];
  let topicCycle: string[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 20) {
    if (topicCycle.length === 0) topicCycle = shuffle([...byTopic.keys()]);
    const t = topicCycle.pop()!;
    const list = byTopic.get(t)!;
    const idx = list.findIndex((it) => !usedDe.has(it.de));
    const it = idx >= 0 ? list.splice(idx, 1)[0] : pick(byTopic.get(t)!);
    if (!it) continue;
    usedDe.add(it.de);
    const formats: ("fill" | "pick" | "order")[] = [];
    if (it.order) formats.push("order", "order");
    if (it.pick) formats.push("pick");
    if (it.fill) formats.push("fill", "fill", "fill");
    const f = pick(formats);
    out.push(f === "order" ? orderQuestion(it) : f === "pick" ? pickQuestion(it) : fillQuestion(it));
  }
  return out;
}
