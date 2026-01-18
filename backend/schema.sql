-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Profiles table to store subscription status
create table public.profiles (
  id uuid references auth.users not null primary key,
  is_pro boolean default false,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Handle new user signup authentication trigger
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, is_pro)
  values (new.id, false);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Habits table
create table public.habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  icon text,
  color text default '#6366F1',
  frequency text check (frequency in ('daily', 'weekly')) default 'daily',
  target_days integer default 1,
  archived boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.habits enable row level security;

create policy "Users can CRUD own habits" on public.habits
  for all using (auth.uid() = user_id);

-- Habit Logs (completions)
create table public.habit_logs (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habits on delete cascade not null,
  user_id uuid references auth.users not null,
  completed_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(habit_id, completed_date) -- Prevent duplicate processing for same day
);

alter table public.habit_logs enable row level security;

create policy "Users can CRUD own logs" on public.habit_logs
  for all using (auth.uid() = user_id);

-- AI Insights (for the Coach)
create table public.ai_insights (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  type text check (type in ('pattern', 'suggestion', 'summary', 'general')) default 'general',
  title text,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ai_insights enable row level security;

create policy "Users can view own insights" on public.ai_insights
  for select using (auth.uid() = user_id);

-- Only system/service role should typically insert insights, but for now allow user to view
-- We might restrict generation to Edge Functions which use service role.

-- Functions for Analytics
-- Simple aggregation for weekly completion rate
create or replace function get_weekly_completion_rate(start_date date, end_date date)
returns table (
  habit_id uuid,
  completion_count bigint
) as $$
begin
  return query
  select hl.habit_id, count(*)
  from habit_logs hl
  where hl.completed_date >= start_date
  and hl.completed_date <= end_date
  and hl.user_id = auth.uid()
  group by hl.habit_id;
end;
$$ language plpgsql security definer;
