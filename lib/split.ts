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

/** A pairing to steer clear of, as "from|to". Example: "kunal|mrigankar" = Kunal should not be the one paying Mrigankar. */
export type AvoidSet = Set<string>;
export const avoidKey = (from: string, to: string) => `${from}|${to}`;

type Entry = { id: string; paise: number };

/** Can the debtors in this group pay off the creditors using only allowed pairings? (bipartite max-flow) */
function feasible(group: Entry[], avoid: AvoidSet): boolean {
  if (avoid.size === 0) return true;
  const debtors = group.filter((e) => e.paise < 0), creditors = group.filter((e) => e.paise > 0);
  const need = debtors.reduce((s, d) => s - d.paise, 0);
  return maxFlow(debtors, creditors, avoid).total === need;
}

/** Ford–Fulkerson on a tiny bipartite graph. Returns total flow and the debtor→creditor flows. */
function maxFlow(debtors: Entry[], creditors: Entry[], avoid: AvoidSet) {
  const D = debtors.length, C = creditors.length, S = D + C, T = S + 1, N = T + 1;
  const cap: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  debtors.forEach((d, i) => { cap[S][i] = -d.paise; });
  creditors.forEach((c, j) => { cap[D + j][T] = c.paise; });
  for (let i = 0; i < D; i++) for (let j = 0; j < C; j++) if (!avoid.has(avoidKey(debtors[i].id, creditors[j].id))) cap[i][D + j] = 1e12;
  let total = 0;
  for (;;) {
    const prev = new Array(N).fill(-1); prev[S] = S;
    const q = [S];
    while (q.length && prev[T] === -1) {
      const u = q.shift()!;
      for (let v = 0; v < N; v++) if (prev[v] === -1 && cap[u][v] > 0) { prev[v] = u; q.push(v); }
    }
    if (prev[T] === -1) break;
    let f = Infinity;
    for (let v = T; v !== S; v = prev[v]) f = Math.min(f, cap[prev[v]][v]);
    for (let v = T; v !== S; v = prev[v]) { cap[prev[v]][v] -= f; cap[v][prev[v]] += f; }
    total += f;
  }
  const flow: number[][] = Array.from({ length: D }, () => new Array(C).fill(0));
  for (let i = 0; i < D; i++) for (let j = 0; j < C; j++) flow[i][j] = cap[D + j][i]; // reverse residual = flow sent
  return { total, flow };
}

/**
 * Transfers for one zero-sum group while respecting `avoid`.
 * Starts from any feasible flow, then cancels cycles until the payment graph is a forest,
 * which guarantees at most (people − 1) transfers — the same count the unconstrained chain gets.
 */
function chainAvoiding(group: Entry[], avoid: AvoidSet): Transfer[] {
  if (avoid.size === 0) return chain(group);
  const debtors = group.filter((e) => e.paise < 0), creditors = group.filter((e) => e.paise > 0);
  const { flow } = maxFlow(debtors, creditors, avoid);
  const D = debtors.length, C = creditors.length;

  // Cycle cancelling on the undirected bipartite graph of positive flows.
  for (;;) {
    // adjacency: node ids 0..D-1 debtors, D..D+C-1 creditors
    const adj: number[][] = Array.from({ length: D + C }, () => []);
    for (let i = 0; i < D; i++) for (let j = 0; j < C; j++) if (flow[i][j] > 0) { adj[i].push(D + j); adj[D + j].push(i); }
    const parent = new Array(D + C).fill(-2);
    let cycle: number[] | null = null;
    const dfs = (u: number, p: number): boolean => {
      parent[u] = p;
      for (const v of adj[u]) {
        if (v === p) continue;
        if (parent[v] !== -2) { // back edge → cycle v … u
          const c = [u]; for (let x = u; x !== v; x = parent[x]) c.push(parent[x]);
          cycle = c; return true;
        }
        if (dfs(v, u)) return true;
      }
      return false;
    };
    for (let s = 0; s < D + C && !cycle; s++) if (parent[s] === -2) dfs(s, -1);
    if (!cycle) break;
    const cyc: number[] = cycle;
    // Edges of the cycle, alternating sign. Pick the parity that subtracts from the smallest edge.
    const edges = cyc.map((u, k) => { const v = cyc[(k + 1) % cyc.length]; const [d, c] = u < D ? [u, v - D] : [v, u - D]; return { d, c }; });
    const minOn = (parity: number) => Math.min(...edges.filter((_, k) => k % 2 === parity).map((e) => flow[e.d][e.c]));
    const parity = minOn(0) <= minOn(1) ? 0 : 1;
    const delta = minOn(parity);
    edges.forEach((e, k) => { flow[e.d][e.c] += k % 2 === parity ? -delta : delta; });
  }

  const out: Transfer[] = [];
  for (let i = 0; i < D; i++) for (let j = 0; j < C; j++) if (flow[i][j] > 0) out.push({ from: debtors[i].id, to: creditors[j].id, amount: flow[i][j] / 100 });
  return out;
}

/**
 * An unfinished part payment: `from` meant to clear `planned` to `to`, has paid `paid` so far,
 * and `remaining` is still expected between the same two people.
 */
export type Pin = { from: string; to: string; planned: number; paid: number; remaining: number };

/**
 * Open part payments, per pair, in ledger order: a payment recorded against a plan amount opens
 * (or replaces) that pair's expectation; later payments between the same two people pay it down.
 */
export function pendingPins(settlements: Settlement[]): Pin[] {
  const byPair = new Map<string, Pin>();
  const sorted = [...settlements].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  for (const s of sorted) {
    const key = `${s.from_person}|${s.to_person}`;
    if (s.planned != null && s.planned > s.amount + EPS) {
      byPair.set(key, { from: s.from_person, to: s.to_person, planned: s.planned, paid: s.amount, remaining: round2(s.planned - s.amount) });
    } else {
      const open = byPair.get(key);
      if (open) {
        open.paid = round2(open.paid + s.amount);
        open.remaining = round2(Math.max(0, open.remaining - s.amount));
        if (open.remaining <= EPS) byPair.delete(key);
      }
    }
  }
  return [...byPair.values()];
}

export type FewestResult = {
  transfers: Transfer[];
  /** Fewest transfers possible with no preferences at all. */
  minimum: number;
  /** True when every avoided pairing was kept out of the plan. */
  honored: boolean;
  /**
   * Payments on avoided pairings that could not be avoided — e.g. the avoided payer owes more than
   * everyone else is owed combined. Everything else is routed around the rule. Empty when honoured.
   */
  forced: Transfer[];
  /** Transfers kept between the same two people because of an unfinished part payment. */
  pinned: Transfer[];
};

/**
 * Best partition of `entries` into zero-sum groups that can each be settled with allowed pairings.
 * Returns null when no such partition exists. Exact search over subsets — at most 3^n steps.
 */
function partition(entries: Entry[], av: AvoidSet): Entry[][] | null {
  const n = entries.length;
  if (n === 0) return [];
  const full = (1 << n) - 1;
  const sum = new Int32Array(1 << n);
  for (let m = 1; m <= full; m++) { const low = m & -m, i = 31 - Math.clz32(low); sum[m] = sum[m ^ low] + entries[i].paise; }
  const members = (m: number) => entries.filter((_, i) => m & (1 << i));
  const ok = new Int8Array(1 << n); // 0 unknown, 1 yes, 2 no
  const valid = (g: number) => {
    if (sum[g] !== 0) return false;
    if (ok[g] === 0) ok[g] = feasible(members(g), av) ? 1 : 2;
    return ok[g] === 1;
  };
  // dp[m] = max number of valid groups partitioning m exactly; -1 = impossible.
  const dp = new Int8Array(1 << n).fill(-1), pick = new Int32Array(1 << n);
  dp[0] = 0;
  for (let m = 1; m <= full; m++) {
    const low = m & -m, rest = m ^ low;
    let best = -1, arg = 0;
    for (let sub = rest; ; sub = (sub - 1) & rest) { // every submask of m containing `low`
      const g = sub | low;
      if (dp[m ^ g] >= 0 && valid(g)) { const c = dp[m ^ g] + 1; if (c > best) { best = c; arg = g; } }
      if (sub === 0) break;
    }
    dp[m] = best; pick[m] = arg;
  }
  if (dp[full] < 0) return null;
  const groups: Entry[][] = [];
  for (let m = full; m; m ^= pick[m]) groups.push(members(pick[m]));
  return groups;
}

/**
 * When the rules cannot be fully honoured, find the smallest amount that has to travel over avoided
 * pairings, assign it, and return the reduced balances (which are then solvable with the rules).
 */
function forceMinimum(entries: Entry[], avoid: AvoidSet): { rest: Entry[]; forced: Transfer[] } {
  const work = entries.map((e) => ({ ...e }));
  const forced: Transfer[] = [];
  for (let guard = 0; guard < 64; guard++) {
    const debtors = work.filter((e) => e.paise < 0), creditors = work.filter((e) => e.paise > 0);
    const need = debtors.reduce((s, d) => s - d.paise, 0);
    const short = need - maxFlow(debtors, creditors, avoid).total;
    if (short <= 0) break;
    // Avoided pairings that still have money on both sides, biggest capacity first.
    const cands = debtors.flatMap((d) => creditors.filter((c) => avoid.has(avoidKey(d.id, c.id))).map((c) => ({ d, c, cap: Math.min(-d.paise, c.paise) }))).sort((a, b) => b.cap - a.cap);
    if (cands.length === 0) break;
    const { d, c, cap } = cands[0];
    const amt = Math.min(short, cap);
    forced.push({ from: d.id, to: c.id, amount: amt / 100 });
    d.paise += amt; c.paise -= amt;
  }
  return { rest: work.filter((e) => e.paise !== 0), forced };
}

/**
 * The true minimum number of transfers that clears every balance, optionally steering clear of
 * some pairings. Minimum = (people with a non-zero balance) − (max number of disjoint zero-sum groups),
 * where a group only counts if it can be settled with allowed pairings.
 */
export function fewestTransfersWith(net: Record<string, number>, avoid: AvoidSet = new Set(), pins: Pin[] = []): FewestResult {
  const all: Entry[] = Object.entries(net).filter(([, v]) => Math.abs(v) > EPS).map(([id, v]) => ({ id, paise: Math.round(v * 100) }));
  const byAmount = (a: Transfer, b: Transfer) => b.amount - a.amount;
  const empty = { minimum: 0, honored: true, forced: [] as Transfer[], pinned: [] as Transfer[] };
  if (all.length === 0) return { transfers: [], ...empty };
  if (all.length > 14) { const t = chain(all); return { transfers: t, ...empty, minimum: t.length, honored: avoid.size === 0 }; }

  // Unconstrained minimum, for reporting.
  const free = partition(all, new Set()) ?? [all];
  const minimum = all.length - free.length;

  // Pins first: keep an unfinished part payment between the same two people, as far as balances allow.
  const work = all.map((e) => ({ ...e }));
  const byId = new Map(work.map((e) => [e.id, e]));
  const pinned: Transfer[] = [];
  for (const p of pins) {
    const d = byId.get(p.from), c = byId.get(p.to);
    if (!d || !c || d.paise >= 0 || c.paise <= 0) continue;
    const amt = Math.min(Math.round(p.remaining * 100), -d.paise, c.paise);
    if (amt <= 0) continue;
    pinned.push({ from: p.from, to: p.to, amount: amt / 100 });
    d.paise += amt; c.paise -= amt;
  }
  const entries = work.filter((e) => e.paise !== 0);
  const done = (rest: Transfer[], honored: boolean, forced: Transfer[]) => ({ transfers: [...pinned, ...rest].sort(byAmount), minimum, honored, forced, pinned });

  if (avoid.size === 0) return done((partition(entries, new Set()) ?? [entries]).flatMap(chain), true, []);

  const constrained = partition(entries, avoid);
  if (constrained) return done(constrained.flatMap((g) => chainAvoiding(g, avoid)), true, []);

  // Partially honour: push as much as possible around the rules, force only the remainder.
  const { rest, forced } = forceMinimum(entries, avoid);
  const after = partition(rest, avoid);
  if (!after) return done((partition(entries, new Set()) ?? [entries]).flatMap(chain), false, []); // should not happen; stay safe
  return done([...forced, ...after.flatMap((g) => chainAvoiding(g, avoid))], false, forced);
}

export const fewestTransfers = (net: Record<string, number>): Transfer[] => fewestTransfersWith(net).transfers;

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
export type Plan = {
  id: PlanId;
  transfers: Transfer[];
  count: number;
  volume: number;
  /** Fewest plan only: the count with no preferences, and whether the preferences could be honoured. */
  minimum?: number;
  honored?: boolean;
  forced?: Transfer[];
  /** Fewest plan only: unfinished part payments, so rows can show progress. */
  pins?: Pin[];
};

/** Both settlement plans side by side, so the UI can show what the fewest-transfers plan saves. */
export function settlementPlans(ids: string[], expenses: Expense[], settlements: Settlement[], avoid: AvoidSet = new Set()): Record<PlanId, Plan> {
  const net = netBalances(expenses, settlements);
  const mk = (id: PlanId, transfers: Transfer[]): Plan => ({ id, transfers, count: transfers.length, volume: round2(transfers.reduce((s, t) => s + t.amount, 0)) });
  const pins = pendingPins(settlements);
  const f = fewestTransfersWith(net, avoid, pins);
  return { fewest: { ...mk("fewest", f.transfers), minimum: f.minimum, honored: f.honored, forced: f.forced, pins }, direct: mk("direct", directTransfers(ids, expenses, settlements)) };
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
