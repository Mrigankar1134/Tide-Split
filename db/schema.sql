create extension if not exists pgcrypto;

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  category text not null default 'other',
  created_by text not null,
  receipt_key text,
  created_at timestamptz not null default now()
);

create table if not exists expense_payers (
  expense_id uuid not null references expenses(id) on delete cascade,
  person_id text not null,
  amount numeric(12,2) not null check (amount >= 0),
  primary key (expense_id, person_id)
);

create table if not exists expense_shares (
  expense_id uuid not null references expenses(id) on delete cascade,
  person_id text not null,
  amount numeric(12,2) not null check (amount >= 0),
  primary key (expense_id, person_id)
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  from_person text not null,
  to_person text not null,
  amount numeric(12,2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_created_at_idx on expenses (created_at desc);
create index if not exists settlements_created_at_idx on settlements (created_at desc);

create table if not exists pins (
  person_id text primary key,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

alter table expenses add column if not exists lat double precision;
alter table expenses add column if not exists lng double precision;
alter table expenses add column if not exists place text;
alter table settlements add column if not exists lat double precision;
alter table settlements add column if not exists lng double precision;
alter table settlements add column if not exists place text;

insert into pins (person_id, pin_hash) values
  ('rahul', '46c9610df11cb9febc3744bcf68feaf604ab4746944cbe1fb5dca37a36eda7e4'),
  ('kunal', '9c8b88551a27e19a5b077124d49b126f0499fb909caa00724d5b6aa39b38f12e'),
  ('jaydeep', '7743dbfe0bdce2d0e6479b63359dfec94dbde1fb5f2983ff53019be12db3385e'),
  ('shubham-g', 'e51091acdc84b58151816c1155aacc223ac20d5ce2a5cb710bfa487da2033057'),
  ('shubham-w', '3c05bc2a5549b51d5d55850d1f45939c23a656649b02493b76912cbae47d7145'),
  ('mrigankar', '5413a177b26b5bbb6dc1911a03382d5f00172325123983527f9d5e61e7595663'),
  ('ashish', 'c9adee6ebca88e0192f656fbd0659592dfbdf73ceaa0dd1e8f49d832355b2dbd'),
  ('bhanu', 'b06b1b9f3a5a7479caa4d034e7c70cdc35415936533b76241338767a8ba1aa5d'),
  ('abhishek', 'c1b00f5debea58d8b1bad8311e3678876cb83400af4a5a8f0271a20c0a3bb8b2')
on conflict (person_id) do nothing;
