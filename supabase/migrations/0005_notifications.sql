-- Notification preferences: on/off + allowed time-of-day window (minutes since midnight).
alter table user_settings
  add column if not exists notifications_enabled boolean not null default false,
  add column if not exists notify_start_minute int not null default 540,  -- 09:00
  add column if not exists notify_end_minute int not null default 1260;  -- 21:00
