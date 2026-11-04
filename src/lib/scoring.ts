// Shared scoring rules (used by the quiz engine and the UI).
// The goal is learning, so mistakes cost a little, not a lot.

export const WRONG_PENALTY = 0.25; // per wrong attempt
export const HINT_COST = 0.25; // once per question, only if you then answer right
export const RETRY_FACTOR = 0.5; // a correct retry earns half the marks

export function roundQuarter(n: number): number {
  return Math.round(n * 4) / 4;
}

/** Marks earned for a choice question. */
export function choiceScore(
  marks: number,
  wrongAttempts: number,
  correct: boolean,
  usedHint: boolean,
): number {
  let earned = 0;
  if (correct) {
    earned = wrongAttempts === 0 ? marks : roundQuarter(marks * RETRY_FACTOR);
    if (usedHint) earned = Math.max(0, earned - HINT_COST);
  }
  return roundQuarter(earned - wrongAttempts * WRONG_PENALTY);
}

/** Marks earned for a matching question: full marks minus 0.25 per wrong pairing (never below 0). */
export function matchScore(marks: number, wrongAttempts: number): number {
  return Math.max(0, roundQuarter(marks - wrongAttempts * WRONG_PENALTY));
}
