"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { person } from "@/lib/people";
import { inr, type Plan, type PlanId, type Transfer } from "@/lib/split";
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

function TransferRow({ t, me, index, onRecord }: { t: Transfer; me: string; index: number; onRecord?: (t: PaymentTarget) => void }) {
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
        {mine && onRecord && (
          <button onClick={() => onRecord(t)} className="mt-1 text-[12.5px] font-medium text-tide underline-offset-2 active:underline">
            {iPay ? "Mark as paid" : "Mark as received"}
          </button>
        )}
      </div>
      <span className={`money text-[16px] font-semibold ${iPay ? "text-coral" : iGet ? "text-mint" : "text-white/85"}`}>{inr(t.amount)}</span>
    </motion.li>
  );
}

export default function SettlePlan({ me, plans, loading, onRecord }: Props) {
  const [planId, setPlanId] = useState<PlanId>("fewest");

  if (loading || !plans) return <Skeleton rows={4} height={64} />;

  const plan = plans[planId];
  const fewest = plans.fewest, direct = plans.direct;
  const saved = direct.count - fewest.count;
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
            <div className="mt-3 flex gap-2 text-[12.5px]">
              <span className="pill rounded-full px-2.5 py-1 text-white/70">{inr(plan.volume)} changes hands</span>
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
              {mine.map((t, i) => <TransferRow key={`${planId}-${t.from}-${t.to}`} t={t} me={me} index={i} onRecord={onRecord} />)}
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
