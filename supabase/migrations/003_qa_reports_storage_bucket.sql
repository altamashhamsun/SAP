-- QA reports storage bucket (private, PDF only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qa-reports', 'qa-reports', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

-- QA reports storage: authenticated users can upload, read, update, delete
create policy "QA reports: upload for authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'qa-reports');

create policy "QA reports: read for authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'qa-reports');

create policy "QA reports: update for authenticated"
  on storage.objects for update to authenticated
  using (bucket_id = 'qa-reports');

create policy "QA reports: delete for authenticated"
  on storage.objects for delete to authenticated
  using (bucket_id = 'qa-reports');