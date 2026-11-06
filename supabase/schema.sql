-- German Quiz (Netzwerk neu A1) – run this once in Supabase SQL editor
create extension if not exists pgcrypto;

create table if not exists public.quiz_attempts (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  name_key         text generated always as (lower(trim(name))) stored,
  chapters         int[] not null,
  question_types   text[] not null default '{}',
  mode             text not null default 'questions',   -- 'questions' | 'marks'
  question_count   int not null,
  target_marks     numeric,
  max_score        numeric not null,
  score            numeric not null,
  correct_first    int not null default 0,
  correct_retry    int not null default 0,
  wrong            int not null default 0,
  hints_used       int not null default 0,
  duration_seconds int,
  wrong_entry_ids  int[] not null default '{}',  -- words to review next time
  answers          jsonb not null default '[]',
  created_at       timestamptz not null default now()
);

create index if not exists quiz_attempts_name_idx on public.quiz_attempts (name_key, created_at desc);

-- Only the server (service-role key) reads/writes. No public access.
alter table public.quiz_attempts enable row level security;

-- A1 mock tests (Hören now; Lesen / Schreiben / Sprechen later)
create table if not exists public.mock_attempts (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  name_key         text generated always as (lower(trim(name))) stored,
  section          text not null,                 -- 'hoeren' | 'lesen' | 'schreiben' | 'sprechen'
  test_id          text not null,                 -- e.g. 't1'
  mode             text not null default 'exam',  -- 'exam' | 'practice'
  score            numeric not null,
  max_score        numeric not null,
  duration_seconds int,
  answers          jsonb not null default '[]',
  created_at       timestamptz not null default now()
);

create index if not exists mock_attempts_name_idx on public.mock_attempts (name_key, created_at desc);
alter table public.mock_attempts enable row level security;
