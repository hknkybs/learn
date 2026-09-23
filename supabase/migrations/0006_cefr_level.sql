-- User's declared level: only introduce new words at or below this CEFR band.
-- null = no filter (all levels).
alter table user_settings
  add column if not exists cefr_level text check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));
