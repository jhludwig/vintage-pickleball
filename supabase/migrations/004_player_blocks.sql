-- player_blocks: one row per blocked pair, canonical order enforced by check constraint
create table player_blocks (
  id          uuid primary key default gen_random_uuid(),
  player_id_a uuid not null references players(id) on delete cascade,
  player_id_b uuid not null references players(id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (player_id_a < player_id_b),
  unique (player_id_a, player_id_b)
);
alter table player_blocks enable row level security;
create policy "public read" on player_blocks for select using (true);
create policy "auth insert" on player_blocks for insert with check (auth.uid() is not null);
create policy "auth update" on player_blocks for update using (auth.uid() is not null);
create policy "auth delete" on player_blocks for delete using (auth.uid() is not null);
create index on player_blocks (player_id_b);
