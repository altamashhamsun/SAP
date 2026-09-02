-- Room inspection full report schema + evidence images + PDF storage bucket
-- Extends room_inspections with full "Hotel Room Audit / Inspection Report" fields.

alter table public.room_inspections add column if not exists property_name text default '';
alter table public.room_inspections add column if not exists coordination_with text default '';
alter table public.room_inspections add column if not exists room_type text default '';
alter table public.room_inspections add column if not exists overall_rating text default '';
alter table public.room_inspections add column if not exists major_issues text default '';
alter table public.room_inspections add column if not exists action_required text default '';
alter table public.room_inspections add column if not exists action_other text default '';
alter table public.room_inspections add column if not exists inspected_by text default '';
alter table public.room_inspections add column if not exists finalized boolean default false;
alter table public.room_inspections add column if not exists pdf_url text default '';

create table if not exists public.room_finding_images (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references public.room_findings(id) on delete cascade,
  url text not null,
  created_at timestamptz default now()
);

alter table public.room_finding_images enable row level security;

drop policy if exists "room_finding_images_select" on public.room_finding_images;
create policy "room_finding_images_select" on public.room_finding_images
  for select using (auth.role() = 'authenticated');
drop policy if exists "room_finding_images_insert" on public.room_finding_images;
create policy "room_finding_images_insert" on public.room_finding_images
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "room_finding_images_delete" on public.room_finding_images;
create policy "room_finding_images_delete" on public.room_finding_images
  for delete using (auth.role() = 'authenticated');

-- Room reports PDF storage bucket (private, PDF only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-reports', 'room-reports', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "Room reports: upload for authenticated" on storage.objects;
create policy "Room reports: upload for authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'room-reports');
drop policy if exists "Room reports: read for authenticated" on storage.objects;
create policy "Room reports: read for authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'room-reports');
drop policy if exists "Room reports: update for authenticated" on storage.objects;
create policy "Room reports: update for authenticated"
  on storage.objects for update to authenticated
  using (bucket_id = 'room-reports');
drop policy if exists "Room reports: delete for authenticated" on storage.objects;
create policy "Room reports: delete for authenticated"
  on storage.objects for delete to authenticated
  using (bucket_id = 'room-reports');
