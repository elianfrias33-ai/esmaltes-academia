-- Academia Esmaltes: row level security and privileges.
-- Start from nothing, then grant only what each role needs.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_materials enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_events enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.testimonials enable row level security;
alter table public.faqs enable row level security;
alter table public.site_settings enable row level security;

-- Functions the app may call. grant_enrollment and revoke_enrollment_for_payment stay server only.
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_enrolled(uuid) to anon, authenticated;
grant execute on function public.lesson_access(uuid) to authenticated;
grant execute on function public.can_open_lesson(uuid) to anon, authenticated;
grant execute on function public.course_player(uuid) to authenticated;
grant execute on function public.complete_lesson(uuid) to authenticated;
grant execute on function public.my_courses() to authenticated;
grant execute on function public.course_lesson_count(uuid) to anon, authenticated;
grant execute on function public.course_outline(uuid) to anon, authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Profiles: only your own. The role column cannot be changed from the app.
grant select on public.profiles to authenticated;
grant update (full_name, phone, country) on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Catalog: everyone sees what is published; students keep seeing a course they own if it is later hidden.
grant select on public.courses, public.public_courses to anon, authenticated;
grant insert, update, delete on public.courses to authenticated;
create policy courses_select on public.courses for select to anon, authenticated using (
  (is_published and is_active)
  or public.is_admin()
  or public.is_enrolled(id)
);
create policy courses_admin_insert on public.courses for insert to authenticated with check (public.is_admin());
create policy courses_admin_update on public.courses for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy courses_admin_delete on public.courses for delete to authenticated using (public.is_admin());

-- Modules and lessons: read only by the admin, or a lesson its rules leave open.
grant select, insert, update, delete on public.modules, public.lessons, public.lesson_materials to authenticated;
create policy modules_admin on public.modules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy lessons_select on public.lessons for select to authenticated using (public.is_admin() or public.can_open_lesson(id));
create policy lessons_admin_insert on public.lessons for insert to authenticated with check (public.is_admin());
create policy lessons_admin_update on public.lessons for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy lessons_admin_delete on public.lessons for delete to authenticated using (public.is_admin());
create policy materials_select on public.lesson_materials for select to authenticated using (public.is_admin() or public.can_open_lesson(lesson_id));
create policy materials_admin_insert on public.lesson_materials for insert to authenticated with check (public.is_admin());
create policy materials_admin_update on public.lesson_materials for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy materials_admin_delete on public.lesson_materials for delete to authenticated using (public.is_admin());

-- Payments: read only from the app; written by the server with the service role.
grant select on public.payments to authenticated;
create policy payments_select on public.payments for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Enrollments: students read their own; the admin can add or change one by hand.
grant select, insert, update, delete on public.enrollments to authenticated;
create policy enrollments_select on public.enrollments for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy enrollments_admin_insert on public.enrollments for insert to authenticated with check (public.is_admin());
create policy enrollments_admin_update on public.enrollments for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy enrollments_admin_delete on public.enrollments for delete to authenticated using (public.is_admin());

-- Progress: written only through complete_lesson.
grant select on public.lesson_progress to authenticated;
create policy progress_select on public.lesson_progress for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Site content: public to read, the admin edits it.
grant select on public.testimonials, public.faqs, public.site_settings to anon, authenticated;
grant insert, update, delete on public.testimonials, public.faqs, public.site_settings to authenticated;
create policy testimonials_select on public.testimonials for select to anon, authenticated using (is_visible or public.is_admin());
create policy testimonials_admin_insert on public.testimonials for insert to authenticated with check (public.is_admin());
create policy testimonials_admin_update on public.testimonials for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy testimonials_admin_delete on public.testimonials for delete to authenticated using (public.is_admin());
create policy faqs_select on public.faqs for select to anon, authenticated using (true);
create policy faqs_admin_insert on public.faqs for insert to authenticated with check (public.is_admin());
create policy faqs_admin_update on public.faqs for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy faqs_admin_delete on public.faqs for delete to authenticated using (public.is_admin());
create policy settings_select on public.site_settings for select to anon, authenticated using (true);
create policy settings_admin_insert on public.site_settings for insert to authenticated with check (public.is_admin());
create policy settings_admin_update on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
