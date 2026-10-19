"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { person } from "@/lib/people";
import { inr, type Pin, type Plan, type PlanId, type Transfer } from "@/lib/split";
import Avatar from "./Avatar";
import { Empty, Segmented, SectionTitle, Skeleton } from "./ui";

export type PaymentTarget = { from: string; to: string; amount: number };

type Props = {
  me: string;
  plans: Record<PlanId, Plan> | null;
  loading: boolean;
  onRecord: (t: PaymentTarget) => void;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const Pair = ({ from, to, size = 34 }: { from: string; to: string; size?: number }) => (
  <div className="relative flex shrink-0 items-center">
    <Avatar id={from} size={size} />
    <Avatar id={to} size={size} className="-ml-2.5 ring-2 ring-[#0E1527]" />
  </div>
);

function TransferRow({ t, me, index, onRecord, pin }: { t: Transfer; me: string; index: number; onRecord?: (t: PaymentTarget) => void; pin?: Pin }) {
  const iPay = t.from === me, iGet = t.to === me, mine = iPay || iGet;
  const pct = pin ? Math.min(100, Math.round((pin.paid / pin.planned) * 100)) : 0;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, delay: Math.min(index, 8) * 0.03 }}
      className={`px-4 py-3.5 ${mine ? "" : "opacity-80"}`}
    >
      <div className="flex items-center gap-3">
        <Pair from={t.from} to={t.to} />
        <p className="min-w-0 flex-1 truncate text-[15.5px] leading-tight">
          <span className={mine ? "font-semibold" : "font-medium"}>{iPay ? "You" : person(t.from).short}</span>
          <span className="text-white/50"> {iPay ? "pay" : "pays"} </span>
          <span className={mine ? "font-semibold" : "font-medium"}>{iGet ? "you" : person(t.to).short}</span>
        </p>
        <span className={`money shrink-0 text-[16px] font-semibold ${iPay ? "text-coral" : iGet ? "text-mint" : "text-white/85"}`}>{inr(t.amount)}</span>
      </div>
      {pin && (
        <div className="mt-2 pl-[52px]">
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-tide/80" style={{ width: `${pct}%` }} /></div>
          <p className="mt-1 text-[12px] text-white/50"><span className="money">{inr(pin.paid)}</span> of <span className="money">{inr(pin.planned)}</span> paid so far</p>
        </div>
      )}
      {mine && onRecord && (
        <div className="mt-2.5 flex gap-2 pl-[52px]">
          <button onClick={() => onRecord(t)} className="btn-ghost whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-medium text-tide">
            {iPay ? "Mark as paid" : "Mark as received"}
          </button>
        </div>
      )}
    </motion.li>
  );
}

export default function SettlePlan({ me, plans, loading, onRecord }: Props) {
  const [planId, setPlanId] = useState<PlanId>("fewest");

  if (loading || !plans) return <Skeleton rows={4} height={64} />;

  const plan = plans[planId];
  const fewest = plans.fewest, direct = plans.direct;
  const saved = direct.count - fewest.count;
  const extra = fewest.count - (fewest.minimum ?? fewest.count);
  const pins = planId === "fewest" ? (fewest.pins ?? []) : [];
  const pinFor = (t: Transfer) => pins.find((p) => p.from === t.from && p.to === t.to);
  const mine = plan.transfers.filter((t) => t.from === me || t.to === me);
  const others = plan.transfers.filter((t) => t.from !== me && t.to !== me);
  const iPayTotal = mine.filter((t) => t.from === me).reduce((s, t) => s + t.amount, 0);
  const iGetTotal = mine.filter((t) => t.to === me).reduce((s, t) => s + t.amount, 0);

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
            <div className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
              <span className="pill rounded-full px-2.5 py-1 text-white/70"><span className="money">{inr(plan.volume)}</span> changes hands</span>
              {mine.length > 0 && <span className="pill rounded-full px-2.5 py-1 text-white/70">{plural(mine.length, "payment")} involve you</span>}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

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
                <TransferRow key={`${planId}-${t.from}-${t.to}`} t={t} me={me} index={i} onRecord={onRecord} pin={pinFor(t)} />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </section>

      {/* Everyone else */}
      {others.length > 0 && (
        <section>
          <SectionTitle aside={plural(others.length, "payment")}>Everyone else</SectionTitle>
          <motion.ul layout className="card-flat divide-y divide-white/[0.06] overflow-hidden rounded-card">
            <AnimatePresence initial={false}>
              {others.map((t, i) => <TransferRow key={`${planId}-${t.from}-${t.to}`} t={t} me={me} index={i + mine.length} pin={pinFor(t)} />)}
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
