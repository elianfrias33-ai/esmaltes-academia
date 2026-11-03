-- Academia Esmaltes: private bucket for lesson materials (PDFs, guides). Videos do not go here.
-- Files are stored as <lesson id>/<file name>, so access follows the lesson's rules.
-- This file needs Supabase's storage schema, so scripts/test-db.mjs does not run it.

insert into storage.buckets (id, name, public) values ('materials', 'materials', false)
on conflict (id) do nothing;

create policy materials_read on storage.objects for select to authenticated using (
  bucket_id = 'materials'
  and (public.is_admin() or public.can_open_lesson(((storage.foldername(name))[1])::uuid))
);
create policy materials_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and public.is_admin());
create policy materials_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'materials' and public.is_admin());
create policy materials_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and public.is_admin());
