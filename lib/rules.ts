import type { db } from "./db";

/**
 * Rules the app seeds into plan_rules exactly once each (tracked in app_seeds).
 * Removing a seeded rule in the app sticks — the seed never re-runs.
 */
const SEEDED_RULES: { key: string; from: string; to: string; by: string }[] = [
  { key: "rule:kunal->mrigankar", from: "kunal", to: "mrigankar", by: "mrigankar" },
];

/** Tables are tiny and new; create them on first use so no manual migration is needed. */
export async function ensureRules(sql: ReturnType<typeof db>) {
  await sql`create table if not exists plan_rules (
    id uuid primary key default gen_random_uuid(),
    from_person text not null,
    to_person text not null,
    created_by text not null,
    created_at timestamptz not null default now(),
    unique (from_person, to_person)
  )`;
  await sql`create table if not exists app_seeds (key text primary key, applied_at timestamptz not null default now())`;
  for (const r of SEEDED_RULES) {
    const [done] = await sql`insert into app_seeds (key) values (${r.key}) on conflict (key) do nothing returning key`;
    if (done) await sql`insert into plan_rules (from_person, to_person, created_by) values (${r.from}, ${r.to}, ${r.by}) on conflict (from_person, to_person) do nothing`;
  }
}
