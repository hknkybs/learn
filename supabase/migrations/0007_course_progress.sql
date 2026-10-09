-- Progress through the level courses in the "Öğren" tab (unit tests, level exam, topics studied).
create table if not exists course_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null,
  item_key text not null,
  score int,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, level, item_key)
);

alter table course_progress enable row level security;

create policy "users can read own course progress" on course_progress
  for select using (auth.uid() = user_id);
create policy "users can insert own course progress" on course_progress
  for insert with check (auth.uid() = user_id);
create policy "users can update own course progress" on course_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can delete own course progress" on course_progress
  for delete using (auth.uid() = user_id);
