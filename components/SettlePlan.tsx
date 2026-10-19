"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { person } from "@/lib/people";
import { inr, type Plan, type PlanId, type Transfer } from "@/lib/split";
import type { PlanRule } from "@/lib/types";
import type { Toast } from "./Dashboard";
import Avatar from "./Avatar";
import { Empty, Segmented, SectionTitle, Skeleton } from "./ui";

export type PaymentTarget = { from: string; to: string; amount: number };

type Props = {
  me: string;
  plans: Record<PlanId, Plan> | null;
  rules: PlanRule[];
  loading: boolean;
  onRecord: (t: PaymentTarget) => void;
  onChanged: () => void;
  notify: (t: Toast) => void;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function TransferRow({ t, me, index, onRecord, onAvoid }: { t: Transfer; me: string; index: number; onRecord?: (t: PaymentTarget) => void; onAvoid?: (t: Transfer) => void }) {
  const iPay = t.from === me, iGet = t.to === me, mine = iPay || iGet;
  const fromLabel = iPay ? "You" : person(t.from).short;
  const toLabel = iGet ? "you" : person(t.to).short;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, delay: Math.min(index, 8) * 0.03 }}
      className={`flex items-center gap-3 px-4 py-3 ${mine ? "" : "opacity-80"}`}
    >
      <div className="relative flex shrink-0 items-center">
        <Avatar id={t.from} size={34} />
        <Avatar id={t.to} size={34} className="-ml-2.5 ring-2 ring-[#0E1527]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] leading-tight">
          <span className={mine ? "font-semibold" : "font-medium"}>{fromLabel}</span>
          <span className="text-white/50"> {iPay ? "pay" : "pays"} </span>
          <span className={mine ? "font-semibold" : "font-medium"}>{toLabel}</span>
        </p>
        {mine && (onRecord || onAvoid) && (
          <div className="mt-1 flex gap-3 text-[12.5px] font-medium">
            {onRecord && <button onClick={() => onRecord(t)} className="text-tide underline-offset-2 active:underline">{iPay ? "Mark as paid" : "Mark as received"}</button>}
            {onAvoid && <button onClick={() => onAvoid(t)} className="text-white/45 underline-offset-2 active:underline">{iPay ? `Not to ${person(t.to).short}` : `Not from ${person(t.from).short}`}</button>}
          </div>
        )}
      </div>
      <span className={`money text-[16px] font-semibold ${iPay ? "text-coral" : iGet ? "text-mint" : "text-white/85"}`}>{inr(t.amount)}</span>
    </motion.li>
  );
}

export default function SettlePlan({ me, plans, rules, loading, onRecord, onChanged, notify }: Props) {
  const [planId, setPlanId] = useState<PlanId>("fewest");
  const [busy, setBusy] = useState(false);

  if (loading || !plans) return <Skeleton rows={4} height={64} />;

  const plan = plans[planId];
  const fewest = plans.fewest, direct = plans.direct;
  const saved = direct.count - fewest.count;
  const extra = fewest.count - (fewest.minimum ?? fewest.count);
  const mine = plan.transfers.filter((t) => t.from === me || t.to === me);
  const others = plan.transfers.filter((t) => t.from !== me && t.to !== me);
  const iPayTotal = mine.filter((t) => t.from === me).reduce((s, t) => s + t.amount, 0);
  const iGetTotal = mine.filter((t) => t.to === me).reduce((s, t) => s + t.amount, 0);

  const addRule = async (t: Transfer) => {
    setBusy(true);
    try {
      const r = await fetch("/api/rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from_person: t.from, to_person: t.to }) });
      if (!r.ok) throw new Error((await r.json()).error);
      notify({ text: `Plan updated — ${person(t.from).short} won't be routed to ${person(t.to).short}` });
      onChanged();
    } catch (e: any) { notify({ text: e.message ?? "Couldn't save the preference", kind: "error" }); }
    finally { setBusy(false); }
  };
  const removeRule = async (id: string) => {
    setBusy(true);
    try {
      const r = await fetch("/api/rules", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!r.ok) throw new Error((await r.json()).error);
      notify({ text: "Preference removed" });
      onChanged();
    } catch (e: any) { notify({ text: e.message ?? "Couldn't remove it", kind: "error" }); }
    finally { setBusy(false); }
  };

  if (fewest.count === 0)
    return <Empty glyph="🌊" title="All settled" body="Nobody owes anyone right now. Add an expense and the plan appears here." />;

  return (
    <div className="space-y-5">
      {/* Plan picker */}
      <section className="card rounded-card p-4">
        <Segmented<PlanId>
          layoutKey="plan"
          value={planId}
          onChange={setPlanId}
          options={[
            { id: "fewest", label: <>Fewest <span className="ml-1 rounded-full bg-white/10 px-1.5 py-px text-[11px] tabular">{fewest.count}</span></> },
            { id: "direct", label: <>Direct <span className="ml-1 rounded-full bg-white/10 px-1.5 py-px text-[11px] tabular">{direct.count}</span></> },
          ]}
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={planId} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="mt-4">
            {planId === "fewest" ? (
              <>
                <p className="font-display text-[22px] font-semibold leading-tight tracking-tight">
                  {plural(fewest.count, "payment")} clears the whole group
                </p>
                <p className="mt-1.5 text-[13.5px] leading-snug text-white/55">
                  {saved > 0
                    ? `Paying everyone directly would take ${plural(direct.count, "payment")} — this plan removes ${saved}. Some people end up paying someone they never split a bill with, and that is fine: everyone's balance still lands on zero.`
                    : "That is already as few as it can be — every payment here goes to someone you actually owe."}
                  {extra > 0 && ` It is ${plural(extra, "payment")} more than the bare minimum because of the preferences below.`}
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-[22px] font-semibold leading-tight tracking-tight">
                  {plural(direct.count, "payment")}, each one between the two people involved
                </p>
                <p className="mt-1.5 text-[13.5px] leading-snug text-white/55">
                  Everyone pays exactly the people they owe, no routing. {saved > 0 ? `The fewest-payments plan does the same job in ${fewest.count}.` : ""}
                </p>
              </>
            )}
            <div className="mt-3 flex gap-2 text-[12.5px]">
              <span className="pill rounded-full px-2.5 py-1 text-white/70">{inr(plan.volume)} changes hands</span>
              {mine.length > 0 && <span className="pill rounded-full px-2.5 py-1 text-white/70">{plural(mine.length, "payment")} involve you</span>}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Shared preferences */}
      {planId === "fewest" && (rules.length > 0 || fewest.honored === false) && (
        <section>
          <SectionTitle aside="shared with everyone">Preferences</SectionTitle>
          <div className="card-flat rounded-card px-4 py-3">
            {fewest.honored === false && (
              <p className="mb-2 text-[13px] leading-snug text-amber">
                These can't all be honoured right now — someone marked as avoided is the only person who can make that payment. The plan below ignores them until balances change.
              </p>
            )}
            <ul className="divide-y divide-white/[0.07]">
              {rules.map((r) => {
                const canRemove = r.from_person === me || r.to_person === me;
                return (
                  <li key={r.id} className="flex items-center gap-3 py-2">
                    <div className="relative flex shrink-0 items-center">
                      <Avatar id={r.from_person} size={26} />
                      <Avatar id={r.to_person} size={26} className="-ml-2 ring-2 ring-[#0E1527]" />
                    </div>
                    <p className="min-w-0 flex-1 truncate text-[14px]">
                      <span className="font-medium">{r.from_person === me ? "You" : person(r.from_person).short}</span>
                      <span className="text-white/50"> {r.from_person === me ? "don't pay" : "doesn't pay"} </span>
                      <span className="font-medium">{r.to_person === me ? "you" : person(r.to_person).short}</span>
                      <span className="text-white/40"> directly</span>
                    </p>
                    {canRemove && <button disabled={busy} onClick={() => removeRule(r.id)} className="btn-ghost rounded-full px-3 py-1.5 text-[12.5px]">Remove</button>}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* My part */}
      <section>
        <SectionTitle aside={mine.length ? (
          <>
            {iPayTotal > 0 && <span className="money text-coral">−{inr(iPayTotal)}</span>}
            {iPayTotal > 0 && iGetTotal > 0 && " / "}
            {iGetTotal > 0 && <span className="money text-mint">+{inr(iGetTotal)}</span>}
          </>
        ) : undefined}>
          Your part
        </SectionTitle>
        {mine.length === 0 ? (
          <div className="card-flat rounded-row px-4 py-3.5 text-[14px] text-white/55">Nothing for you to do in this plan.</div>
        ) : (
          <motion.ul layout className="card divide-y divide-white/[0.07] overflow-hidden rounded-card">
            <AnimatePresence initial={false}>
              {mine.map((t, i) => (
                <TransferRow key={`${planId}-${t.from}-${t.to}`} t={t} me={me} index={i} onRecord={onRecord} onAvoid={planId === "fewest" && !busy ? addRule : undefined} />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
        {planId === "fewest" && mine.length > 0 && rules.length === 0 && (
          <p className="mt-2 px-1 text-[12.5px] leading-snug text-white/40">
            Rather not deal with someone? Tap “Not from …” and the plan reroutes for everyone.
          </p>
        )}
      </section>

      {/* Everyone else */}
      {others.length > 0 && (
        <section>
          <SectionTitle aside={plural(others.length, "payment")}>Everyone else</SectionTitle>
          <motion.ul layout className="card-flat divide-y divide-white/[0.06] overflow-hidden rounded-card">
            <AnimatePresence initial={false}>
              {others.map((t, i) => <TransferRow key={`${planId}-${t.from}-${t.to}`} t={t} me={me} index={i + mine.length} />)}
            </AnimatePresence>
          </motion.ul>
        </section>
      )}

      <p className="px-1 text-[12.5px] leading-snug text-white/40">
        Plans are worked out live from the ledger. Recording a payment updates balances for everyone; nothing is settled until it is recorded.
      </p>
    </div>
  );
}
