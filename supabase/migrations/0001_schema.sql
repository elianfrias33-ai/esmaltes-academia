-- Academia Esmaltes: tables.
-- Access rules live in 0002_access.sql and 0003_policies.sql.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  country text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  subtitle text,
  description text,
  cover_url text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  level text,
  includes text[] not null default '{}',
  -- how long a purchase gives access: 1 month, 3 months, 6 months or any other period
  access_amount integer not null default 3 check (access_amount > 0),
  access_unit text not null default 'months' check (access_unit in ('days', 'weeks', 'months')),
  -- true: every lesson needs the one before it, on top of each lesson's own rule
  sequential boolean not null default false,
  provider_variant_id text,
  is_published boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  position integer not null default 0,
  unlock_rule text not null default 'immediate' check (unlock_rule in ('immediate', 'after_days', 'on_date', 'after_previous')),
  unlock_after_days integer check (unlock_after_days is null or unlock_after_days >= 0),
  unlock_date timestamptz,
  is_published boolean not null default true,
  check (unlock_rule <> 'after_days' or unlock_after_days is not null),
  check (unlock_rule <> 'on_date' or unlock_date is not null)
);
create index modules_course_idx on public.modules (course_id, position);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  title text not null,
  summary text,
  position integer not null default 0,
  video_provider text,
  video_id text,
  duration_seconds integer,
  requires_previous boolean not null default false,
  is_published boolean not null default true
);
create index lessons_module_idx on public.lessons (module_id, position);

create table public.lesson_materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  name text not null,
  storage_path text not null,
  position integer not null default 0
);
create index lesson_materials_lesson_idx on public.lesson_materials (lesson_id, position);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  course_id uuid not null references public.courses (id) on delete restrict,
  provider text not null,
  provider_order_id text,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'refunded', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_order_id)
);
create index payments_user_idx on public.payments (user_id);

-- Every notice from the payment provider, so a repeated one is never processed twice.
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  unique (provider, event_id)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete restrict,
  payment_id uuid references public.payments (id) on delete set null,
  source text not null default 'payment' check (source in ('payment', 'manual')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, course_id),
  check (expires_at > starts_at)
);
create index enrollments_course_idx on public.enrollments (course_id);

create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  quote text not null,
  is_visible boolean not null default true,
  sort_order integer not null default 0
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0
);

create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  teacher_name text,
  teacher_title text,
  teacher_bio text,
  teacher_photo_url text,
  contact_whatsapp text,
  contact_instagram text,
  contact_location text
);
