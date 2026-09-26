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

/** Greedy debt simplification: minimal-ish set of transfers that clears every balance. */
export function simplify(net: Record<string, number>): Transfer[] {
  const debtors = Object.entries(net).filter(([, v]) => v < -0.004).map(([id, v]) => ({ id, v: -v })).sort((a, b) => b.v - a.v);
  const creditors = Object.entries(net).filter(([, v]) => v > 0.004).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v);
  const out: Transfer[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = round2(Math.min(debtors[i].v, creditors[j].v));
    if (amt > 0) out.push({ from: debtors[i].id, to: creditors[j].id, amount: amt });
    debtors[i].v = round2(debtors[i].v - amt);
    creditors[j].v = round2(creditors[j].v - amt);
    if (debtors[i].v <= 0.004) i++;
    if (creditors[j].v <= 0.004) j++;
  }
  return out;
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
