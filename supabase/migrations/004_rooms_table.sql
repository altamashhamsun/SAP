-- Room Inspection: rooms per branch
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id) on delete cascade,
  name text not null,
  room_type text default 'Room',
  floor text default '',
  status text default 'Clear',
  created_at timestamptz default now()
);

alter table public.rooms enable row level security;

create policy if not exists "rooms_select" on public.rooms for select using (auth.role() = 'authenticated');
create policy if not exists "rooms_insert" on public.rooms for insert with check (auth.role() = 'authenticated');
create policy if not exists "rooms_update" on public.rooms for update using (auth.role() = 'authenticated');
create policy if not exists "rooms_delete" on public.rooms for delete using (auth.role() = 'authenticated');
