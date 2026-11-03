-- Academia Esmaltes: server-side rules for who can see what.
-- SECURITY DEFINER functions read the tables with the owner's rights, so each one
-- works only from auth.uid() and never trusts an identity sent by the browser.

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create function public.is_enrolled(p_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments where course_id = p_course and user_id = auth.uid());
$$;

-- All lessons of a course in reading order, published only.
create function public.course_lessons(p_course uuid)
returns table (lesson_id uuid, module_id uuid, seq bigint)
language sql stable security definer set search_path = public as $$
  select l.id, m.id, row_number() over (order by m.position, m.id, l.position, l.id)
  from public.modules m
  join public.lessons l on l.module_id = m.id
  where m.course_id = p_course and m.is_published and l.is_published;
$$;

-- status: open | locked_date | locked_previous | no_enrollment | expired | hidden
create function public.lesson_access(p_lesson uuid)
returns table (status text, unlock_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_lesson public.lessons;
  v_module public.modules;
  v_course public.courses;
  v_enrollment public.enrollments;
  v_unlock timestamptz;
  v_seq bigint;
  v_previous uuid;
begin
  select * into v_lesson from public.lessons where id = p_lesson;
  if not found then
    return query select 'hidden'::text, null::timestamptz; return;
  end if;
  select * into v_module from public.modules where id = v_lesson.module_id;
  select * into v_course from public.courses where id = v_module.course_id;

  if public.is_admin() then
    return query select 'open'::text, null::timestamptz; return;
  end if;
  if not (v_lesson.is_published and v_module.is_published) then
    return query select 'hidden'::text, null::timestamptz; return;
  end if;

  select e.* into v_enrollment from public.enrollments e
  where e.user_id = v_user and e.course_id = v_course.id and e.status = 'active';
  if not found then
    return query select 'no_enrollment'::text, null::timestamptz; return;
  end if;
  if v_enrollment.expires_at <= now() then
    return query select 'expired'::text, v_enrollment.expires_at; return;
  end if;

  if v_module.unlock_rule = 'after_days' then
    v_unlock := v_enrollment.starts_at + make_interval(days => v_module.unlock_after_days);
  elsif v_module.unlock_rule = 'on_date' then
    v_unlock := v_module.unlock_date;
  end if;
  if v_unlock is not null and now() < v_unlock then
    return query select 'locked_date'::text, v_unlock; return;
  end if;

  if v_module.unlock_rule = 'after_previous' then
    if exists (
      select 1 from public.course_lessons(v_course.id) cl
      join public.modules m on m.id = cl.module_id
      where m.position < v_module.position
        and not exists (select 1 from public.lesson_progress p where p.user_id = v_user and p.lesson_id = cl.lesson_id)
    ) then
      return query select 'locked_previous'::text, null::timestamptz; return;
    end if;
  end if;

  if v_course.sequential or v_lesson.requires_previous then
    select cl.seq into v_seq from public.course_lessons(v_course.id) cl where cl.lesson_id = p_lesson;
    select cl.lesson_id into v_previous from public.course_lessons(v_course.id) cl where cl.seq = v_seq - 1;
    if v_previous is not null and not exists (
      select 1 from public.lesson_progress p where p.user_id = v_user and p.lesson_id = v_previous
    ) then
      return query select 'locked_previous'::text, null::timestamptz; return;
    end if;
  end if;

  return query select 'open'::text, null::timestamptz;
end;
$$;

create function public.can_open_lesson(p_lesson uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'open' from public.lesson_access(p_lesson)), false);
$$;

-- Everything the course player needs, with no video ids: those come from lessons, guarded by RLS.
create function public.course_player(p_course uuid)
returns table (
  module_id uuid, module_title text, module_position integer,
  lesson_id uuid, lesson_title text, lesson_position integer,
  duration_seconds integer, status text, unlock_at timestamptz, completed boolean
)
language sql stable security definer set search_path = public as $$
  select m.id, m.title, m.position, l.id, l.title, l.position, l.duration_seconds,
         a.status, a.unlock_at,
         exists (select 1 from public.lesson_progress p where p.user_id = auth.uid() and p.lesson_id = l.id)
  from public.modules m
  join public.lessons l on l.module_id = m.id
  cross join lateral public.lesson_access(l.id) a
  where m.course_id = p_course and a.status <> 'hidden'
    and (public.is_admin() or exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid() and e.course_id = p_course and e.status = 'active'
    ))
  order by m.position, l.position;
$$;

create function public.complete_lesson(p_lesson uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.can_open_lesson(p_lesson) then
    raise exception 'lesson_locked' using errcode = 'P0001';
  end if;
  insert into public.lesson_progress (user_id, lesson_id)
  values (auth.uid(), p_lesson)
  on conflict do nothing;
end;
$$;

-- The student's area: their courses, dates and progress.
create function public.my_courses()
returns table (
  course_id uuid, slug text, title text, cover_url text,
  starts_at timestamptz, expires_at timestamptz, is_expired boolean,
  total_lessons bigint, completed_lessons bigint
)
language sql stable security definer set search_path = public as $$
  select c.id, c.slug, c.title, c.cover_url, e.starts_at, e.expires_at, e.expires_at <= now(),
         (select count(*) from public.course_lessons(c.id)),
         (select count(*) from public.course_lessons(c.id) cl
            join public.lesson_progress p on p.lesson_id = cl.lesson_id and p.user_id = auth.uid())
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  where e.user_id = auth.uid() and e.status = 'active'
  order by e.created_at desc;
$$;

-- Public catalog: lesson count and titles, never videos or materials.
create function public.course_lesson_count(p_course uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from public.course_lessons(p_course);
$$;

create function public.course_outline(p_course uuid)
returns table (module text, unlock text, lessons text[])
language sql stable security definer set search_path = public as $$
  select m.title,
         case m.unlock_rule
           when 'immediate' then 'Disponible desde el inicio'
           when 'after_days' then format('Se abre %s días después de inscribirte', m.unlock_after_days)
           when 'on_date' then format('Se abre el %s', to_char(m.unlock_date, 'DD/MM/YYYY'))
           else 'Se abre al terminar el módulo anterior'
         end,
         coalesce(array_agg(l.title order by l.position) filter (where l.id is not null), '{}')
  from public.modules m
  join public.courses c on c.id = m.course_id and c.is_published and c.is_active
  left join public.lessons l on l.module_id = m.id and l.is_published
  where m.course_id = p_course and m.is_published
  group by m.id, m.title, m.unlock_rule, m.unlock_after_days, m.unlock_date, m.position
  order by m.position;
$$;

create view public.public_courses with (security_invoker = true) as
  select c.id, c.slug, c.title, c.subtitle, c.description, c.cover_url, c.price_cents, c.currency, c.level,
         c.includes, c.access_amount, c.access_unit, c.sort_order,
         public.course_lesson_count(c.id) as lessons_count
  from public.courses c
  where c.is_published and c.is_active;

-- Server only: called by the payment webhook after checking the provider's signature.
-- Safe to call twice for the same payment, and it refuses a paid amount that does not match.
create function public.grant_enrollment(p_payment uuid, p_provider_order text, p_amount_cents integer, p_currency text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_payment public.payments;
  v_course public.courses;
  v_period interval;
  v_enrollment uuid;
begin
  select * into v_payment from public.payments where id = p_payment for update;
  if not found then
    raise exception 'payment_not_found' using errcode = 'P0001';
  end if;
  if v_payment.amount_cents <> p_amount_cents or v_payment.currency <> p_currency then
    raise exception 'amount_mismatch' using errcode = 'P0001';
  end if;
  if v_payment.status = 'approved' then
    select id into v_enrollment from public.enrollments where payment_id = p_payment;
    return v_enrollment;
  end if;
  if v_payment.status <> 'pending' then
    raise exception 'payment_not_pending' using errcode = 'P0001';
  end if;

  select * into v_course from public.courses where id = v_payment.course_id;
  v_period := case v_course.access_unit
    when 'days' then make_interval(days => v_course.access_amount)
    when 'weeks' then make_interval(weeks => v_course.access_amount)
    else make_interval(months => v_course.access_amount)
  end;

  update public.payments
  set status = 'approved', provider_order_id = p_provider_order, updated_at = now()
  where id = p_payment;

  -- a repeat purchase extends from the current end date if the access is still running
  insert into public.enrollments (user_id, course_id, payment_id, source, status, starts_at, expires_at)
  values (v_payment.user_id, v_payment.course_id, p_payment, 'payment', 'active', now(), now() + v_period)
  on conflict (user_id, course_id) do update
    set payment_id = excluded.payment_id, status = 'active',
        expires_at = greatest(public.enrollments.expires_at, now()) + v_period
  returning id into v_enrollment;
  return v_enrollment;
end;
$$;

-- Server only: a refund removes the access that payment gave.
create function public.revoke_enrollment_for_payment(p_payment uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.payments set status = 'refunded', updated_at = now() where id = p_payment;
  update public.enrollments set status = 'revoked' where payment_id = p_payment;
end;
$$;
