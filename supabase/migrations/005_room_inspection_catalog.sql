-- Room Inspection catalog: areas, items, per-room assignments, inspections with findings
create table if not exists public.room_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.room_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.room_assignments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  kind text not null check (kind in ('area','item')),
  area_id uuid references public.room_areas(id) on delete cascade,
  item_id uuid references public.room_items(id) on delete cascade,
  created_at timestamptz default now(),
  unique (room_id, kind, area_id, item_id)
);

create table if not exists public.room_inspections (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  inspection_date date not null,
  created_at timestamptz default now(),
  unique (room_id, inspection_date)
);

create table if not exists public.room_findings (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.room_inspections(id) on delete cascade,
  kind text not null check (kind in ('area','item')),
  area_id uuid references public.room_areas(id) on delete cascade,
  item_id uuid references public.room_items(id) on delete cascade,
  note text default '',
  created_at timestamptz default now(),
  unique (inspection_id, kind, area_id, item_id)
);

alter table public.room_areas enable row level security;
alter table public.room_items enable row level security;
alter table public.room_assignments enable row level security;
alter table public.room_inspections enable row level security;
alter table public.room_findings enable row level security;

create policy "room_areas_select" on public.room_areas for select using (auth.role() = 'authenticated');
create policy "room_areas_insert" on public.room_areas for insert with check (auth.role() = 'authenticated');
create policy "room_areas_update" on public.room_areas for update using (auth.role() = 'authenticated');
create policy "room_areas_delete" on public.room_areas for delete using (auth.role() = 'authenticated');

create policy "room_items_select" on public.room_items for select using (auth.role() = 'authenticated');
create policy "room_items_insert" on public.room_items for insert with check (auth.role() = 'authenticated');
create policy "room_items_update" on public.room_items for update using (auth.role() = 'authenticated');
create policy "room_items_delete" on public.room_items for delete using (auth.role() = 'authenticated');

create policy "room_assignments_select" on public.room_assignments for select using (auth.role() = 'authenticated');
create policy "room_assignments_insert" on public.room_assignments for insert with check (auth.role() = 'authenticated');
create policy "room_assignments_update" on public.room_assignments for update using (auth.role() = 'authenticated');
create policy "room_assignments_delete" on public.room_assignments for delete using (auth.role() = 'authenticated');

create policy "room_inspections_select" on public.room_inspections for select using (auth.role() = 'authenticated');
create policy "room_inspections_insert" on public.room_inspections for insert with check (auth.role() = 'authenticated');
create policy "room_inspections_update" on public.room_inspections for update using (auth.role() = 'authenticated');
create policy "room_inspections_delete" on public.room_inspections for delete using (auth.role() = 'authenticated');

create policy "room_findings_select" on public.room_findings for select using (auth.role() = 'authenticated');
create policy "room_findings_insert" on public.room_findings for insert with check (auth.role() = 'authenticated');
create policy "room_findings_update" on public.room_findings for update using (auth.role() = 'authenticated');
create policy "room_findings_delete" on public.room_findings for delete using (auth.role() = 'authenticated');
