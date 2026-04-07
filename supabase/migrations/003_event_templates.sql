-- event_templates
create table event_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  season_start text not null default '11-01',
  season_end text not null default '05-31',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table event_templates enable row level security;
create policy "public read" on event_templates for select using (true);
create policy "auth insert" on event_templates for insert with check (auth.uid() is not null);
create policy "auth update" on event_templates for update using (auth.uid() is not null);
create policy "auth delete" on event_templates for delete using (auth.uid() is not null);

-- add template_id to events
alter table events
  add column template_id uuid references event_templates(id) on delete set null;
