create table if not exists notes (
  id          uuid primary key default gen_random_uuid(),
  content     text        not null,
  agent       text        not null,
  created_at  timestamptz not null default now()
);

create table if not exists action_log (
  id          uuid primary key default gen_random_uuid(),
  agent       text        not null,
  action      text        not null,
  success     boolean     not null,
  created_at  timestamptz not null default now()
);

create index if not exists notes_created_at_idx on notes (created_at);
create index if not exists action_log_created_at_idx on action_log (created_at desc);