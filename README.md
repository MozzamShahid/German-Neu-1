# German-Neu-1 – Deutsch Quiz (Netzwerk neu A1)

A vocabulary quiz built **only** from the *Netzwerk neu A1* glossary (German → English),
chapters 1–12. The goal is learning rather than strict testing.

## Features
- **Meaning** (German → English) with step-by-step hints (example sentence, lesson, first letter)
- **der / die / das**, with real rules as hints: suffix rules (-ung → die, -chen → das …) and the
  compound rule (*der Kinder**garten*** takes the article of ***der Garten***)
- **Matching** built around word families (das Kind · der Kindergarten · das Kinderzimmer;
  fragen · die Frage; das Wort · das Wörterbuch …)
- **Reverse** (English → German)
- Pick any chapter set: Kapitel 1, 1+2, 1–5, full book or any mix
- Choose the **number of questions** or a **total marks** target
- **Weighted marks**: important words (bold in the book) and verbs are worth more, minor words less
- **Learning-friendly scoring**: a wrong answer costs −0.25 and you can retry (a correct retry earns half marks); a hint costs 0.25
- After each answer: forms, plural, example sentence and **related words** to learn together
- Results are saved in Supabase by name. "Practice my mistakes" brings back the words you got wrong
- Article colours as a memory aid: **der** blue · **die** red · **das** green

## How it works
```
NWn_A1_Glossar_Deutsch-Englisch.pdf
        │  scripts/parse_glossary.py   (Python, PyMuPDF)
        ▼
src/data/vocab.json   ~1,970 entries: article, plural, verb forms, examples,
        │             importance (bold), word families, article rules
        ▼
src/lib/quiz.ts       quiz engine: chapter filter, weighted selection,
        │             distractors from the same lesson, marks, hints
        ▼
Next.js UI  ──►  /api/attempts  ──►  Supabase (quiz_attempts)
```

Python handles the hard part (parsing the PDF and working out the word families and article rules) once,
offline. The Next.js server builds each quiz at request time, so you deploy **one** service on Railway.

## Local setup
```bash
npm install
cp .env.example .env.local      # fill in SUPABASE_SECRET_KEY
npm run dev                     # http://localhost:3000
```
To rebuild the vocabulary from the PDF (put the PDF in the project root):
```bash
pip install -r scripts/requirements.txt
npm run parse
```

## Supabase
1. Open the SQL editor and run `supabase/schema.sql`.
2. Copy **Project URL** and the **secret** key (Project Settings → API Keys, `sb_secret_...`) into the env vars.
   The key is used on the server only. RLS is on with no public policies.

The app still runs without Supabase. Results just aren't saved.

## Deploy on Railway
1. Railway → New Project → Deploy from GitHub repo → `MozzamShahid/German-Neu-1`
2. Variables: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
3. Settings → Networking → Generate Domain

`railway.json` already sets the build and start commands.
