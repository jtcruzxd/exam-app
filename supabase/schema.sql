-- ============================================================
--  EXAM APP — SUPABASE SCHEMA
--  Run this entire file in your Supabase SQL Editor once.
--  Order matters: referenced tables are created first.
-- ============================================================

-- ── 1. EXTENSIONS ───────────────────────────────────────────
create extension if not exists "pgcrypto";


-- ── 2. SETTINGS (global landing-page config) ────────────────
create table if not exists settings (
  id          int primary key default 1 check (id = 1),  -- single-row table
  site_title  text not null default 'Examination System',
  site_description text not null default 'Please select your section and enter your name to begin.',
  updated_at  timestamptz not null default now()
);

-- seed the single settings row
insert into settings (id, site_title, site_description)
values (1, 'Examination System', 'Please select your section and enter your name to begin.')
on conflict (id) do nothing;


-- ── 3. SECTIONS ─────────────────────────────────────────────
create table if not exists sections (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,           -- e.g. '3A', '3B'
  created_at timestamptz not null default now()
);


-- ── 4. EXAMS ────────────────────────────────────────────────
create table if not exists exams (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,                 -- e.g. 'Midterm Math V2'
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ── 5. SECTION ↔ EXAM ASSIGNMENT (one active exam per section)
create table if not exists section_exam (
  section_id uuid primary key references sections(id) on delete cascade,
  exam_id    uuid not null references exams(id) on delete cascade,
  assigned_at timestamptz not null default now()
);


-- ── 6. QUESTIONS ────────────────────────────────────────────
-- question_type: 'mc' | 'tf' | 'sa'
-- choices: JSONB array — used for mc/tf, null for sa
--   mc  → ["Choice A", "Choice B", "Choice C", "Choice D"]
--   tf  → ["True", "False"]
--   sa  → null
-- answer: stored as plain text, NEVER exposed to client
--   mc  → "Choice A"  (the full text of the correct choice)
--   tf  → "True" | "False"
--   sa  → expected answer string (case-insensitive match at grading time)
create table if not exists questions (
  id            uuid primary key default gen_random_uuid(),
  exam_id       uuid not null references exams(id) on delete cascade,
  question_text text not null,
  question_type text not null check (question_type in ('mc', 'tf', 'sa')),
  choices       jsonb,                        -- null for 'sa'
  answer        text not null,                -- NEVER sent to client
  points        int not null default 1,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_questions_exam_id on questions(exam_id);


-- ── 7. APP USERS (admin + examiners) ────────────────────────
-- role: 'admin' | 'examiner'
-- Admin credentials are seeded here via env vars substitute.
-- Passwords are stored as bcrypt hashes.
create table if not exists app_users (
  id           uuid primary key default gen_random_uuid(),
  username     text not null unique,
  password_hash text not null,
  role         text not null check (role in ('admin', 'examiner')),
  created_at   timestamptz not null default now()
);


-- ── 8. EXAMINER ↔ SECTION ASSIGNMENT ────────────────────────
create table if not exists examiner_sections (
  user_id    uuid not null references app_users(id) on delete cascade,
  section_id uuid not null references sections(id) on delete cascade,
  primary key (user_id, section_id)
);


-- ── 9. RESULTS ──────────────────────────────────────────────
create table if not exists results (
  id             uuid primary key default gen_random_uuid(),
  student_name   text not null,
  section_id     uuid not null references sections(id) on delete cascade,
  exam_id        uuid not null references exams(id) on delete cascade,
  score          int not null,
  total_points   int not null,
  answers        jsonb not null,   -- { question_id: student_answer, ... }
  submitted_at   timestamptz not null default now()
);

create index if not exists idx_results_section_id on results(section_id);
create index if not exists idx_results_exam_id    on results(exam_id);


-- ── 10. ROW LEVEL SECURITY ──────────────────────────────────
-- All access goes through the service-role key (server-side API routes only).
-- We disable RLS on all tables so the service key has full access.
-- Client-side Supabase calls are NEVER made directly to these tables.
alter table settings         disable row level security;
alter table sections         disable row level security;
alter table exams            disable row level security;
alter table section_exam     disable row level security;
alter table questions        disable row level security;
alter table app_users        disable row level security;
alter table examiner_sections disable row level security;
alter table results          disable row level security;


-- ── 11. UPDATED_AT TRIGGER ──────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_exams_updated_at
  before update on exams
  for each row execute function update_updated_at();

create trigger trg_settings_updated_at
  before update on settings
  for each row execute function update_updated_at();


-- ============================================================
--  DONE. Next step: seed your admin user from the app's
--  setup route or manually with a bcrypt hash.
-- ============================================================
