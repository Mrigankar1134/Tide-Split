import type { db } from "./db";

/** The table is tiny and new; create it on first use so no manual migration is needed. */
export async function ensureRules(sql: ReturnType<typeof db>) {
  await sql`create table if not exists plan_rules (
    id uuid primary key default gen_random_uuid(),
    from_person text not null,
    to_person text not null,
    created_by text not null,
    created_at timestamptz not null default now(),
    unique (from_person, to_person)
  )`;
}
