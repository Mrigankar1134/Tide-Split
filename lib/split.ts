import type { Expense, Settlement, Portion } from "./types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Split `total` equally across `ids`, distributing leftover paise so the sum is exact. */
export function splitEqual(total: number, ids: string[]): Portion[] {
  if (ids.length === 0) return [];
  const paise = Math.round(total * 100);
  const base = Math.floor(paise / ids.length);
  let rem = paise - base * ids.length;
  return ids.map((person_id) => ({ person_id, amount: (base + (rem-- > 0 ? 1 : 0)) / 100 }));
}

/** Convert percentages (must total 100) into rupee portions summing to `total`. */
export function splitPercent(total: number, pct: Record<string, number>): Portion[] {
  const entries = Object.entries(pct).filter(([, v]) => v > 0);
  const paise = Math.round(total * 100);
  let allotted = 0;
  const out = entries.map(([person_id, v], i) => {
    const amt = i === entries.length - 1 ? paise - allotted : Math.round((paise * v) / 100);
    allotted += amt;
    return { person_id, amount: amt / 100 };
  });
  return out;
}

export const sumPortions = (p: Portion[]) => round2(p.reduce((s, x) => s + x.amount, 0));

/** Net position per person: positive = is owed money, negative = owes money. */
export function netBalances(expenses: Expense[], settlements: Settlement[]): Record<string, number> {
  const net: Record<string, number> = {};
  const add = (id: string, v: number) => { net[id] = round2((net[id] ?? 0) + v); };
  for (const e of expenses) {
    for (const p of e.payers) add(p.person_id, p.amount);
    for (const s of e.shares) add(s.person_id, -s.amount);
  }
  for (const s of settlements) { add(s.from_person, s.amount); add(s.to_person, -s.amount); }
  return net;
}

export type Transfer = { from: string; to: string; amount: number };

const EPS = 0.004;

/** Greedy chain within one group of balances (in paise): largest debtor pays largest creditor until clear. */
function chain(entries: { id: string; paise: number }[]): Transfer[] {
  const debtors = entries.filter((e) => e.paise < 0).map((e) => ({ id: e.id, v: -e.paise })).sort((a, b) => b.v - a.v);
  const creditors = entries.filter((e) => e.paise > 0).map((e) => ({ id: e.id, v: e.paise })).sort((a, b) => b.v - a.v);
  const out: Transfer[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].v, creditors[j].v);
    if (amt > 0) out.push({ from: debtors[i].id, to: creditors[j].id, amount: amt / 100 });
    debtors[i].v -= amt;
    creditors[j].v -= amt;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return out;
}

/** Greedy debt simplification: few transfers, not always the fewest. Kept for reference/tests. */
export function simplify(net: Record<string, number>): Transfer[] {
  const entries = Object.entries(net).filter(([, v]) => Math.abs(v) > EPS).map(([id, v]) => ({ id, paise: Math.round(v * 100) }));
  return chain(entries);
}

/**
 * The true minimum number of transfers that clears every balance.
 * Minimum = (people with a non-zero balance) − (max number of disjoint zero-sum groups).
 * Exact search over subsets — for a group of nine that is 512 states, instant.
 */
export function fewestTransfers(net: Record<string, number>): Transfer[] {
  const entries = Object.entries(net).filter(([, v]) => Math.abs(v) > EPS).map(([id, v]) => ({ id, paise: Math.round(v * 100) }));
  const n = entries.length;
  if (n === 0) return [];
  if (n > 16) return chain(entries); // never for this app, but stay safe

  const full = (1 << n) - 1;
  const sum = new Int32Array(1 << n);
  for (let m = 1; m <= full; m++) {
    const low = m & -m, i = 31 - Math.clz32(low);
    sum[m] = sum[m ^ low] + entries[i].paise;
  }
  // dp[m] = max zero-sum groups obtainable from the people in m; via[m] = which person was removed last.
  const dp = new Int8Array(1 << n), via = new Int8Array(1 << n).fill(-1);
  for (let m = 1; m <= full; m++) {
    let best = -1, arg = -1;
    for (let i = 0; i < n; i++) {
      if (!(m & (1 << i))) continue;
      const d = dp[m ^ (1 << i)];
      if (d > best) { best = d; arg = i; }
    }
    dp[m] = best + (sum[m] === 0 ? 1 : 0);
    via[m] = arg;
  }

  // Walk back from the full set; every time we pass a zero-sum mask a group closes.
  const groups: { id: string; paise: number }[][] = [];
  let m = full, current: { id: string; paise: number }[] = [];
  while (m) {
    if (sum[m] === 0 && current.length) { groups.push(current); current = []; }
    const i = via[m];
    current.push(entries[i]);
    m ^= 1 << i;
  }
  if (current.length) groups.push(current);

  return groups.flatMap(chain).sort((a, b) => b.amount - a.amount);
}

/**
 * Direct settlement: each person pays exactly the people they actually owe, pair by pair.
 * No simplification at all — the "everyone settles their own tab" plan.
 */
export function directTransfers(ids: string[], expenses: Expense[], settlements: Settlement[]): Transfer[] {
  const out: Transfer[] = [];
  const seen = new Set<string>();
  for (const me of ids) {
    const pair = pairwise(me, expenses, settlements);
    for (const [other, v] of Object.entries(pair)) {
      const key = [me, other].sort().join("|");
      if (seen.has(key) || Math.abs(v) <= EPS) continue;
      seen.add(key);
      // v > 0: other owes me → other pays me. v < 0: I pay other.
      out.push(v > 0 ? { from: other, to: me, amount: Math.abs(v) } : { from: me, to: other, amount: Math.abs(v) });
    }
  }
  return out.sort((a, b) => b.amount - a.amount);
}

export type PlanId = "fewest" | "direct";
export type Plan = { id: PlanId; transfers: Transfer[]; count: number; volume: number };

/** Both settlement plans side by side, so the UI can show what the fewest-transfers plan saves. */
export function settlementPlans(ids: string[], expenses: Expense[], settlements: Settlement[]): Record<PlanId, Plan> {
  const net = netBalances(expenses, settlements);
  const mk = (id: PlanId, transfers: Transfer[]): Plan => ({ id, transfers, count: transfers.length, volume: round2(transfers.reduce((s, t) => s + t.amount, 0)) });
  return { fewest: mk("fewest", fewestTransfers(net)), direct: mk("direct", directTransfers(ids, expenses, settlements)) };
}

/** Exact pairwise ledger for `me`: what each person owes me (+) or I owe them (−). */
export function pairwise(me: string, expenses: Expense[], settlements: Settlement[]): Record<string, number> {
  const out: Record<string, number> = {};
  const add = (id: string, v: number) => { if (id !== me) out[id] = round2((out[id] ?? 0) + v); };
  for (const e of expenses) {
    const total = sumPortions(e.payers) || 1;
    // Each payer covers each sharer's portion proportionally to what they paid.
    for (const p of e.payers) for (const s of e.shares) {
      const covered = round2((s.amount * p.amount) / total);
      if (p.person_id === me && s.person_id !== me) add(s.person_id, covered);
      if (s.person_id === me && p.person_id !== me) add(p.person_id, -covered);
    }
  }
  for (const s of settlements) {
    if (s.from_person === me) add(s.to_person, s.amount);
    if (s.to_person === me) add(s.from_person, -s.amount);
  }
  return out;
}

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(n);
