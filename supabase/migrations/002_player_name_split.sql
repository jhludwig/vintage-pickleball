-- Split players.name into first_name + last_name
alter table players
  add column first_name text not null default '',
  add column last_name text not null default '';

-- Migrate existing rows: split on first space
update players
  set last_name  = split_part(name, ' ', 1),
      first_name = trim(substring(name from position(' ' in name)));

alter table players drop column name;
