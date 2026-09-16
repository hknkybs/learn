-- Weekly batch feature: frequency-tier scoring on words + per-user weekly goal.
-- Run this once in the SQL Editor against a project that already has schema.sql applied.

alter table words
  add column if not exists frequency_score smallint not null default 3 check (frequency_score between 1 and 5);

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_goal int not null default 20,
  batch_started_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

create policy "users can read own settings" on user_settings
  for select using (auth.uid() = user_id);
create policy "users can insert own settings" on user_settings
  for insert with check (auth.uid() = user_id);
create policy "users can update own settings" on user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
