create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  school_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null,
  course_code text not null default '',
  course_name text not null,
  grade text not null,
  school_year text not null,
  semester_number smallint not null default 1 check (semester_number between 1 and 3),
  weeks smallint not null default 20 check (weeks between 1 and 25),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.standards add column if not exists subject_id text;
alter table public.indicators add column if not exists subject_id text;
alter table public.lesson_plans add column if not exists semester_id uuid references public.semesters(id) on delete cascade;
alter table public.lesson_plans add column if not exists subject_id text;
alter table public.lesson_plans add column if not exists plan_number integer not null default 1;

create index if not exists standards_subject_id_idx on public.standards(subject_id);
create index if not exists indicators_subject_id_idx on public.indicators(subject_id);
create index if not exists semesters_user_id_idx on public.semesters(user_id);
create index if not exists semesters_subject_grade_idx on public.semesters(subject_id, grade);
create index if not exists lesson_plans_semester_id_idx on public.lesson_plans(semester_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
drop trigger if exists semesters_set_updated_at on public.semesters;
create trigger semesters_set_updated_at before update on public.semesters for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.semesters enable row level security;

revoke all on public.profiles, public.semesters from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.semesters to authenticated;

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "users read own semesters" on public.semesters;
create policy "users read own semesters" on public.semesters for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users create own semesters" on public.semesters;
create policy "users create own semesters" on public.semesters for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users update own semesters" on public.semesters;
create policy "users update own semesters" on public.semesters for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "users delete own semesters" on public.semesters;
create policy "users delete own semesters" on public.semesters for delete to authenticated using ((select auth.uid()) = user_id);
