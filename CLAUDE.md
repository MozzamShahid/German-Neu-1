@AGENTS.md

# German-Neu-1: Deutsch Quiz (Netzwerk neu A1)

A learning-first German vocabulary + grammar quiz for Pakistani learners
(German / English / Urdu). Owner: Mozzam Shahid (talks in Roman Urdu + English mix).

- Live: https://german-neu-1-production.up.railway.app
- Repo: https://github.com/MozzamShahid/German-Neu-1 (branch `main`). A GitHub push did NOT trigger an auto-deploy on 2026-11-05, so deploy with `railway.cmd up --detach -s German-Neu-1` after pushing (or reconnect the GitHub source in the Railway dashboard).
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

## Status (2026-11-06)
Done and deployed:
- vocab quiz (Kapitel 1–12 + Kapitel 13 lecture words with Urdu), Supabase saving, Railway deploy
- grammar quiz type "grammar" (`src/lib/grammar.ts`): fill / pick / order (word-order game) from
  grammar.json, balanced over the chosen topics; Akk/Dat/Wechsel are optional toggles in Setup
- Urdu shown in Nastaliq (`.urdu` class, Noto Nastaliq Urdu via next/font) through the `Urdu` component in Word.tsx
- 🔊 German speech: `speak()` in Word.tsx plays `public/audio/tts/<fnv1a-key>.mp3` (free offline Piper voices, 5 German
  speakers rotating) and falls back to the browser voice (Web Speech API, de-DE). Generate with
  `.venv/Scripts/python scripts/build_voices.py` (setup lines at the top of the file; voices live in
  `%LOCALAPPDATA%/piper-voices`; only new texts are generated, ~4000 files / 42 MB). Re-run it after changing
  vocab / grammar / lessons, or new sentences will use the browser voice. `audioKey()` must match `key_of()`.
- `/learn` page: lecture notes (`src/data/lessons.ts`) with tables, examples, and daily-life sentences from
  `/api/sentences?topic=`
- "Practice my mistakes" covers both words (`reviewIds`) and grammar sentences (`reviewItemIds`, saved as `itemId` in answers)

- `/woerter`: all words of a Kapitel (`/api/words?chapter=`), 🔊, "▶ Alle anhören", flashcards.
- `/pruefung` hub + four A1 mock sections (Goethe Start Deutsch 1 format, 5 Modelltests each + "🎲 Zufallstest"
  that mixes items from all tests with the exam structure), results saved to
  Supabase `public.mock_attempts` via `/api/mock` (section = hoeren | lesen | schreiben | sprechen).
  Shared UI in `src/components/mock.tsx`; client-only loaders in `MockLoaders.tsx`.
  - `/hoeren` (`src/data/hoeren.json`): Modelltest 1–2 voiced with ElevenLabs; 3–5 (and Sprechen t3–t5 partners) with
    Piper via `.venv/Scripts/python scripts/build_hoeren_piper.py` (fills every line without a recording,
    manifest entries get `engine: piper`; the ElevenLabs script keeps them unless `--replace-piper`). ElevenLabs: (`eleven_v4`, German-verified premade
    voices) by `node --env-file=.env.local scripts/build_hoeren_audio.mjs` (`--dry-run` counts characters; only
    new/changed lines cost credits; also makes the Sprechen partner lines `sp-*`). Background ambience, gong (Teil 2)
    and phone beep (Teil 3) from `scripts/build_sfx.mjs` → `public/audio/sfx/`; an item's `scene` picks the ambience.
  - `/lesen` (`src/data/lesen.json`): texts, ads (a/b), signs. No AI.
  - `/schreiben` (`src/data/schreiben.json`): form (auto-checked, 5 pts) + email (AI, 10 pts).
  - `/sprechen` (`src/data/sprechen.json`): browser SpeechRecognition (de-DE, Chrome/Edge) or typing; AI scores
    Teil 1 (3) + Teil 2 (6) + Teil 3 (6). Also Urdu → Deutsch speaking drill from `/api/sentences`.
  - AI checker `src/lib/ai.ts` + `/api/check`: OpenAI-compatible; `DEEPSEEK_API_KEY` (deepseek-chat) or
    `OPENROUTER_API_KEY` (+ optional `AI_MODEL`). OPENROUTER_API_KEY is set in `.env.local` and Railway (2026-11-06). OpenRouter requests use
    `provider.sort = latency` (default routing once took 128 s → timeout); 50 s timeout + one retry. Without a key the UI says "AI check not set up". 60 checks / 10 min per IP.
  - `ELEVENLABS_API_KEY` is in `.env.local` only (free plan 10k credits/month); Railway does not need it.

Ideas for next time: more Modelltests; flashcard mode for Kapitel 13; Urdu meanings for the book words (only the lecture words have
them now); a dürfen modal verb; more Wechselpräposition places (an/über).

## Gotchas
- On Windows PowerShell, `npm` may be blocked by the execution policy; use `npm.cmd` (or
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`).
- The glossary PDF puts fake spaces after stressed vowels; the parser drops spaces whose bbox overlaps the previous glyph.
  The stressed "i" is a tiny (~7–8 pt) glyph, so don't filter spans by font size above 6.
- A false compound (die Antwort ≠ Ant + das Wort) is rejected when the articles differ.
