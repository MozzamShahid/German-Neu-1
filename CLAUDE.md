@AGENTS.md

# German-Neu-1: Deutsch Quiz (Netzwerk neu A1)

A learning-first German vocabulary + grammar quiz for Pakistani learners
(German / English / Urdu). Owner: Mozzam Shahid (talks in Roman Urdu + English mix).

- Live: https://german-neu-1-production.up.railway.app
- Repo: https://github.com/MozzamShahid/German-Neu-1 (branch `main`; a push auto-deploys on Railway)
- Railway: project `delightful-manifestation`, service `German-Neu-1` (free plan allows only 1 project).
  The CLI is installed and logged in: `railway.cmd status`, `railway.cmd logs`, `railway.cmd variables`.
- Supabase project `ykekhehwqwrwscfhhaoa`, table `public.quiz_attempts` (see `supabase/schema.sql`).
  Env vars: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (in `.env.local` locally and in Railway variables; never commit them).

## Content sources (everything comes from these, nothing from outside)
1. `NWn_A1_Glossar_Deutsch-Englisch.pdf`: book glossary, Kapitel 1–12. Gitignored because it is copyrighted.
2. `C:\Users\HF\Desktop\German Lectures\*.pdf`: the teacher's handwritten notes (Week 2–13, CamScanner
   images plus one typed revision sheet). Topics: W-Fragen/verb position 2, Ja/Nein, Imperativ, Konjugation,
   sein/haben, Sie vs sie, Zahlen/Datum, Uhrzeit (official + informal), am/um/zum, ein/kein, plural "die",
   Possessiv, Modalverben, trennbare Verben, Präteritum war/hatte, Perfekt (haben/sein + Partizip II),
   Akkusativ, Dativ, Wechselpräpositionen (Wo→Dat / Wohin→Akk, stellen/stehen, legen/liegen),
   -los / -er / -in / -ung / -chen word building, Körper + Schmerzen, Brief formal/informal, restaurant,
   presentation phrases, exam tips.

## Pipeline
```
scripts/parse_glossary.py   PDF -> src/data/vocab.json (Kapitel 1–12). Needs PyMuPDF; the import is lazy because
                            Windows Application Control sometimes blocks its DLL. pdfplumber works as a fallback.
scripts/lecture_vocab.py    adds lecture words as Kapitel 13 "Unterricht" (with Urdu `ur` field) to vocab.json
scripts/grammar_data.py     lexicon for the sentence generator (nouns/verbs/subjects with Urdu-script data)
scripts/build_sentences.py  grammar engine -> src/data/grammar.json (~2400 items: fill / order / pick)
```
Run order: `python scripts/parse_glossary.py && python scripts/lecture_vocab.py && python scripts/build_sentences.py`
(run from `scripts/` or with PYTHONIOENCODING=utf-8 on Windows).

## App (Next.js 16, App Router, Tailwind 4, TypeScript)
- `src/lib/quiz.ts`: server-side quiz engine (chapter filter, weighted selection, distractors from the same lesson,
  marks, hints, word-family matching). `src/lib/scoring.ts`: shared scoring.
- `src/app/api/quiz` (POST builds a quiz), `src/app/api/attempts` (POST saves, GET history + "practice mistakes").
- `src/components/`: Setup, Quiz (ChoiceView, MatchView), Results, Word (article colours), App, AppLoader (client-only).

## Product rules the owner asked for
- Learning first: a wrong answer costs only −0.25 and a retry is allowed (a correct retry earns half marks; a hint costs 0.25).
- Marks are not flat: important words (bold in the book) and verbs are worth more, minor words less.
- Question types: meaning DE→EN with hints, der/die/das, matching by word family
  (das Kind ↔ der Kindergarten), reverse EN→DE.
- Any chapter combination (1, 1+2, 1–5, full book). The user picks either the number of questions or a total-marks target.
- Akkusativ / Dativ / Wechselpräpositionen are OPTIONAL toggles (off unless the user selects them).
  All other lecture topics are always available.
- Urdu is shown in **Urdu script** (Nastaliq font, rtl), not Roman Urdu. The owner preferred real Urdu. If it ever
  looks broken in a terminal, that is only terminal rendering; browsers shape it correctly.
- Article colours: der = blue, die = red, das = green.

## Status (2026-11-05)
Done and deployed: vocab quiz (Kapitel 1–12), Supabase saving, Railway deploy.
In progress (not yet in the UI or deployed):
- grammar.json generated and QA'd (konjugation, wortstellung, pronomen, artikel, modalverben, trennbar,
  vergangenheit, zahlen, uhrzeit, wortbildung, redemittel + optional akkusativ, dativ, wechsel)
- Kapitel 13 lecture vocab merged into vocab.json
- TODO: grammar question types in the quiz engine/UI (fill, order = arrange chunks with a fixed first chunk,
  pick), topic chips plus the Akk/Dat/Wechsel toggles in Setup, Urdu font + rtl, show `ur` on word cards,
  a "Lernen" page (lecture notes in English + Urdu, tables, examples, 🔊 de-DE speech), then build, push and verify.

## Gotchas
- On Windows PowerShell, `npm` may be blocked by the execution policy; use `npm.cmd` (or
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`).
- The glossary PDF puts fake spaces after stressed vowels; the parser drops spaces whose bbox overlaps the previous glyph.
  The stressed "i" is a tiny (~7–8 pt) glyph, so don't filter spans by font size above 6.
- A false compound (die Antwort ≠ Ant + das Wort) is rejected when the articles differ.
