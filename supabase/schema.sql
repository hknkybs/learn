-- Kelime Defteri — Supabase schema
-- Paste this whole file into the Supabase SQL Editor and run it once.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────
-- Reference content: the word catalog. Shared, read-only from the client —
-- only imported/edited via the service-role import script (scripts/import-words.mjs).
-- ─────────────────────────────────────────────────────────────────────────

create table words (
  id uuid primary key default gen_random_uuid(),
  lemma text not null unique,
  part_of_speech text not null check (part_of_speech in ('verb', 'noun', 'adjective', 'adverb', 'phrase', 'preposition', 'conjunction', 'pronoun', 'number', 'other')),
  cefr text,
  ipa text,
  translation_tr text not null,
  nuance_tr text,
  -- 1 = most frequently used in real speech, 5 = rarest. Drives the
  -- weighted random selection in weekly batches (see src/lib/batch.ts).
  frequency_score smallint not null default 3 check (frequency_score between 1 and 5),
  created_at timestamptz not null default now()
);

create table word_forms (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references words(id) on delete cascade,
  form_type text not null check (form_type in (
    'base', 'third_person_singular', 'past_simple', 'past_participle', 'gerund',
    'singular', 'plural', 'comparative', 'superlative'
  )),
  text text not null
);

create table example_sentences (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references words(id) on delete cascade,
  tense text not null check (tense in ('general', 'present_simple', 'present_continuous', 'past_simple', 'future')),
  text_en text not null,
  text_tr text not null
);

create index word_forms_word_id_idx on word_forms(word_id);
create index example_sentences_word_id_idx on example_sentences(word_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Per-user learning state. Owner-only; this is where "bildiklerim /
-- öğrendiklerim / çalıştıklarım" lives. One row per (user, word).
--
-- srs_level drives spacing (see src/lib/srs.ts INTERVALS_DAYS); status is
-- the human-facing label derived from it but also settable directly from
-- the word detail screen.
-- ─────────────────────────────────────────────────────────────────────────

create table word_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  status text not null default 'new' check (status in ('new', 'learning', 'known')),
  srs_level int not null default 0,
  times_reviewed int not null default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, word_id)
);

create index word_progress_user_due_idx on word_progress(user_id, next_review_at);

-- ─────────────────────────────────────────────────────────────────────────
-- Per-user weekly settings: how many new words to pull into a batch, and
-- when the current batch was started (used to auto-refresh weekly).
-- ─────────────────────────────────────────────────────────────────────────

create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_goal int not null default 20,
  batch_started_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────

alter table words enable row level security;
alter table word_forms enable row level security;
alter table example_sentences enable row level security;
alter table word_progress enable row level security;
alter table user_settings enable row level security;

-- Catalog tables: any signed-in user can read. Writes only via service role
-- (the import script), so no insert/update/delete policies are defined —
-- RLS default-denies those for the anon/authenticated roles.
create policy "authenticated can read words" on words
  for select using (auth.uid() is not null);
create policy "authenticated can read word_forms" on word_forms
  for select using (auth.uid() is not null);
create policy "authenticated can read example_sentences" on example_sentences
  for select using (auth.uid() is not null);

-- word_progress: strictly owner-only.
create policy "users can read own progress" on word_progress
  for select using (auth.uid() = user_id);
create policy "users can insert own progress" on word_progress
  for insert with check (auth.uid() = user_id);
create policy "users can update own progress" on word_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can delete own progress" on word_progress
  for delete using (auth.uid() = user_id);

-- user_settings: strictly owner-only.
create policy "users can read own settings" on user_settings
  for select using (auth.uid() = user_id);
create policy "users can insert own settings" on user_settings
  for insert with check (auth.uid() = user_id);
create policy "users can update own settings" on user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Review history (streak / weekly chart on Home). See migrations/0002.
-- ─────────────────────────────────────────────────────────────────────────

create table review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  grade text not null check (grade in ('again', 'hard', 'good')),
  reviewed_at timestamptz not null default now()
);

create index review_events_user_time_idx on review_events(user_id, reviewed_at desc);

alter table review_events enable row level security;

create policy "users can read own review events" on review_events
  for select using (auth.uid() = user_id);
create policy "users can insert own review events" on review_events
  for insert with check (auth.uid() = user_id);
create policy "users can delete own review events" on review_events
  for delete using (auth.uid() = user_id);
