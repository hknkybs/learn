-- Review history: powers the streak, weekly chart and today's progress on Home.
-- Run once in the SQL Editor.

create table if not exists review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  grade text not null check (grade in ('again', 'hard', 'good')),
  reviewed_at timestamptz not null default now()
);

create index if not exists review_events_user_time_idx on review_events(user_id, reviewed_at desc);

alter table review_events enable row level security;

create policy "users can read own review events" on review_events
  for select using (auth.uid() = user_id);
create policy "users can insert own review events" on review_events
  for insert with check (auth.uid() = user_id);
create policy "users can delete own review events" on review_events
  for delete using (auth.uid() = user_id);
