-- players
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gender text not null default '',
  ranking text not null default '',
  player_type text not null default 'member'
    check (player_type in ('pro', 'member', 'guest')),
  plays_pickleball boolean not null default true,
  created_at timestamptz not null default now()
);
alter table players enable row level security;
create policy "public read" on players for select using (true);
create policy "auth insert" on players for insert with check (auth.uid() is not null);
create policy "auth update" on players for update using (auth.uid() is not null);
create policy "auth delete" on players for delete using (auth.uid() is not null);

-- events
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Chooseup',
  date date not null default current_date,
  created_at timestamptz not null default now()
);
alter table events enable row level security;
create policy "public read" on events for select using (true);
create policy "auth insert" on events for insert with check (auth.uid() is not null);
create policy "auth update" on events for update using (auth.uid() is not null);
create policy "auth delete" on events for delete using (auth.uid() is not null);

-- rounds
create table rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  round_number integer not null,
  is_committed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table rounds enable row level security;
create policy "public read" on rounds for select using (true);
create policy "auth insert" on rounds for insert with check (auth.uid() is not null);
create policy "auth update" on rounds for update using (auth.uid() is not null);
create policy "auth delete" on rounds for delete using (auth.uid() is not null);

-- round_participants
create table round_participants (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  unique(round_id, player_id)
);
alter table round_participants enable row level security;
create policy "public read" on round_participants for select using (true);
create policy "auth insert" on round_participants for insert with check (auth.uid() is not null);
create policy "auth delete" on round_participants for delete using (auth.uid() is not null);

-- active_courts (8 rows created per round)
create table active_courts (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  court_number integer not null check (court_number between 1 and 8),
  is_active boolean not null default false,
  unique(round_id, court_number)
);
alter table active_courts enable row level security;
create policy "public read" on active_courts for select using (true);
create policy "auth insert" on active_courts for insert with check (auth.uid() is not null);
create policy "auth update" on active_courts for update using (auth.uid() is not null);
create policy "auth delete" on active_courts for delete using (auth.uid() is not null);

-- court_assignments
create table court_assignments (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  court_number integer not null check (court_number between 1 and 8),
  player_id uuid not null references players(id) on delete cascade,
  team integer not null check (team in (1, 2)),
  unique(round_id, player_id)
);
alter table court_assignments enable row level security;
create policy "public read" on court_assignments for select using (true);
create policy "auth insert" on court_assignments for insert with check (auth.uid() is not null);
create policy "auth update" on court_assignments for update using (auth.uid() is not null);
create policy "auth delete" on court_assignments for delete using (auth.uid() is not null);

-- court_results
create table court_results (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  court_number integer not null check (court_number between 1 and 8),
  winning_team integer not null check (winning_team in (1, 2)),
  unique(round_id, court_number)
);
alter table court_results enable row level security;
create policy "public read" on court_results for select using (true);
create policy "auth insert" on court_results for insert with check (auth.uid() is not null);
create policy "auth update" on court_results for update using (auth.uid() is not null);
create policy "auth delete" on court_results for delete using (auth.uid() is not null);
