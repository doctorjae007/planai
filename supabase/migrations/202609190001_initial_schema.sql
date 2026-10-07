create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.standards (
  id text primary key,
  code text not null unique,
  strand text not null,
  text text not null,
  verification_status text not null default 'verified',
  source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.indicators (
  id text primary key,
  standard_id text not null references public.standards(id) on update cascade on delete restrict,
  code text not null unique,
  grade text not null,
  text text not null,
  content_topics text[] not null default '{}',
  verification_status text not null default 'verified',
  source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_models (
  id text primary key,
  name text not null,
  description text not null default '',
  steps jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_id text not null,
  title text not null,
  subject text,
  grade text,
  semester text,
  duration text,
  teaching_model_id text references public.learning_models(id) on update cascade on delete set null,
  standard_id text references public.standards(id) on update cascade on delete set null,
  indicator_ids text[] not null default '{}',
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_id)
);

create index if not exists indicators_standard_id_idx on public.indicators(standard_id);
create index if not exists indicators_grade_idx on public.indicators(grade);
create index if not exists lesson_plans_user_id_idx on public.lesson_plans(user_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists standards_set_updated_at on public.standards;
create trigger standards_set_updated_at before update on public.standards for each row execute function private.set_updated_at();
drop trigger if exists indicators_set_updated_at on public.indicators;
create trigger indicators_set_updated_at before update on public.indicators for each row execute function private.set_updated_at();
drop trigger if exists learning_models_set_updated_at on public.learning_models;
create trigger learning_models_set_updated_at before update on public.learning_models for each row execute function private.set_updated_at();
drop trigger if exists lesson_plans_set_updated_at on public.lesson_plans;
create trigger lesson_plans_set_updated_at before update on public.lesson_plans for each row execute function private.set_updated_at();

alter table public.standards enable row level security;
alter table public.indicators enable row level security;
alter table public.learning_models enable row level security;
alter table public.lesson_plans enable row level security;

revoke all on public.standards, public.indicators, public.learning_models, public.lesson_plans from anon, authenticated;
grant select on public.standards, public.indicators, public.learning_models to anon, authenticated;
grant select, insert, update, delete on public.lesson_plans to authenticated;

drop policy if exists "reference standards are readable" on public.standards;
create policy "reference standards are readable" on public.standards for select to anon, authenticated using (true);
drop policy if exists "reference indicators are readable" on public.indicators;
create policy "reference indicators are readable" on public.indicators for select to anon, authenticated using (true);
drop policy if exists "reference learning models are readable" on public.learning_models;
create policy "reference learning models are readable" on public.learning_models for select to anon, authenticated using (true);

drop policy if exists "users read own lesson plans" on public.lesson_plans;
create policy "users read own lesson plans" on public.lesson_plans for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users create own lesson plans" on public.lesson_plans;
create policy "users create own lesson plans" on public.lesson_plans for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users update own lesson plans" on public.lesson_plans;
create policy "users update own lesson plans" on public.lesson_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "users delete own lesson plans" on public.lesson_plans;
create policy "users delete own lesson plans" on public.lesson_plans for delete to authenticated using ((select auth.uid()) = user_id);

