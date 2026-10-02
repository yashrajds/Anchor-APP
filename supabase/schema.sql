-- ============================================================================
-- Anchor — Supabase PostgreSQL Schema & RLS Policies
-- ============================================================================
-- Run this script in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Enable uuid-ossp extension
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Profiles Table
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  photo_url text,
  course text,
  year text,
  birthday text,
  joined text default to_char(now(), 'YYYY-MM-DD'),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 2. User Preferences Table
-- ----------------------------------------------------------------------------
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  theme text not null default 'forest',
  notif_checkin boolean default false,
  notif_checkin_time text default '09:00',
  notif_streak boolean default false,
  notif_weekly boolean default false,
  notif_quiet boolean default false,
  notif_quiet_start text default '22:00',
  notif_quiet_end text default '07:00',
  a11y_text_size text default 'md',
  a11y_reduce_motion boolean default false,
  a11y_contrast boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can view their own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own preferences"
  on public.user_preferences for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. Daily Records Table (Sleep, Mood, Focus, Calm)
-- ----------------------------------------------------------------------------
create table if not exists public.daily_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day text not null, -- Format: YYYY-MM-DD
  sleep smallint check (sleep >= 1 and sleep <= 5),
  mood smallint check (mood >= 0 and mood <= 4),
  focus_sec integer default 0,
  calm_sec integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint daily_records_user_day_unique unique (user_id, day)
);

create index if not exists daily_records_user_day_idx on public.daily_records(user_id, day);

alter table public.daily_records enable row level security;

create policy "Users can view their own daily records"
  on public.daily_records for select
  using (auth.uid() = user_id);

create policy "Users can insert their own daily records"
  on public.daily_records for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own daily records"
  on public.daily_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own daily records"
  on public.daily_records for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Journal Entries Table
-- ----------------------------------------------------------------------------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day text not null, -- Format: YYYY-MM-DD
  content text not null,
  mood smallint check (mood is null or (mood >= 0 and mood <= 4)),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists journal_entries_user_day_idx on public.journal_entries(user_id, day);

alter table public.journal_entries enable row level security;

create policy "Users can view their own journal entries"
  on public.journal_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own journal entries"
  on public.journal_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own journal entries"
  on public.journal_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own journal entries"
  on public.journal_entries for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. Habits Table
-- ----------------------------------------------------------------------------
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  color text not null default '#5B8FBF',
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists habits_user_sort_idx on public.habits(user_id, sort_order);

alter table public.habits enable row level security;

create policy "Users can view their own habits"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "Users can insert their own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own habits"
  on public.habits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own habits"
  on public.habits for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. Habit Completions Table
-- ----------------------------------------------------------------------------
create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  day text not null, -- Format: YYYY-MM-DD
  created_at timestamp with time zone default now(),
  constraint habit_completions_user_habit_day_unique unique (user_id, habit_id, day)
);

create index if not exists habit_completions_user_day_idx on public.habit_completions(user_id, day);

alter table public.habit_completions enable row level security;

create policy "Users can view their own habit completions"
  on public.habit_completions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own habit completions"
  on public.habit_completions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own habit completions"
  on public.habit_completions for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. Automated New User Trigger
-- Automatically creates a profile record and default habits upon user signup
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_name text;
begin
  user_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  
  -- Create user profile
  insert into public.profiles (id, name, email, joined)
  values (new.id, user_name, coalesce(new.email, ''), to_char(now(), 'YYYY-MM-DD'))
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name);

  -- Create initial user preferences
  insert into public.user_preferences (user_id, theme)
  values (new.id, 'forest')
  on conflict (user_id) do nothing;

  -- Seed starter habits for new student user
  insert into public.habits (user_id, label, color, sort_order)
  values
    (new.id, 'Drink 8 glasses of water', '#5B8FBF', 0),
    (new.id, 'Morning stretch — 10 min', '#6D9B72', 1),
    (new.id, 'Study break every 90 min', '#C2D5A3', 2),
    (new.id, 'Screen-free 30 min before bed', '#E07A5F', 3),
    (new.id, 'Check in with a friend', '#B08968', 4)
  on conflict do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
