"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { person } from "@/lib/people";
import { inr, type Plan } from "@/lib/split";
import Avatar from "./Avatar";
import { TransferRow, type PaymentTarget } from "./SettlePlan";
import { Empty, SectionTitle, Skeleton } from "./ui";

type Props = {
  me: string;
  pair: Record<string, number>;   // one-to-one: + they owe me, − I owe them
  plan: Plan | null;              // the group's fewest-payments plan
  loading: boolean;
  onRecord: (t: PaymentTarget) => void;
  onGoSettle: () => void;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Balances({ me, pair, plan, loading, onRecord, onGoSettle }: Props) {
  const [showDirect, setShowDirect] = useState(false);
  if (loading || !plan) return <Skeleton rows={3} />;

  const mine = plan.transfers.filter((t) => t.from === me || t.to === me);
  const pins = plan.pins ?? [];
  const rows = Object.entries(pair).filter(([, v]) => Math.abs(v) > 0.004).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const iPayTotal = mine.filter((t) => t.from === me).reduce((s, t) => s + t.amount, 0);
  const iGetTotal = mine.filter((t) => t.to === me).reduce((s, t) => s + t.amount, 0);

  if (mine.length === 0 && rows.length === 0)
    return <Empty glyph="🌊" title="Nothing owed either way" body="Add an expense and your payments show up here." />;

  return (
    <div className="space-y-5">
      {/* What to actually do — same rows as the Settle tab */}
      <section>
        <SectionTitle aside={mine.length ? (
          <>
            {iPayTotal > 0 && <span className="money text-coral">−{inr(iPayTotal)}</span>}
            {iPayTotal > 0 && iGetTotal > 0 && " / "}
            {iGetTotal > 0 && <span className="money text-mint">+{inr(iGetTotal)}</span>}
          </>
        ) : undefined}>
          Your payments
        </SectionTitle>
        {mine.length === 0 ? (
          <div className="card-flat rounded-row px-4 py-3.5 text-[14px] text-white/55">Nothing for you to pay or collect — the rest of the group settles among themselves.</div>
        ) : (
          <ul className="card divide-y divide-white/[0.07] overflow-hidden rounded-card">
            {mine.map((t, i) => <TransferRow key={`${t.from}-${t.to}`} t={t} me={me} index={i} onRecord={onRecord} pin={pins.find((p) => p.from === t.from && p.to === t.to)} />)}
          </ul>
        )}
        <button onClick={onGoSettle} className="mt-2 px-1 text-[12.5px] text-white/45 underline-offset-2 active:underline">
          Part of the group plan: {plural(plan.count, "payment")} clears everyone ›
        </button>
      </section>

      {/* One-to-one ledger — context, not instructions */}
      {rows.length > 0 && (
        <section>
          <button onClick={() => setShowDirect((v) => !v)} className="flex w-full items-center justify-between px-1 py-1 text-left" aria-expanded={showDirect}>
            <span className="font-display text-[15px] font-semibold tracking-tight text-white/85">One-to-one balances</span>
            <span className="text-[12.5px] text-white/45">{showDirect ? "Hide" : `Show ${rows.length}`}</span>
          </button>
          <p className="mt-0.5 px-1 text-[12.5px] leading-snug text-white/45">
            What you and each person owe each other from shared bills alone. The plan above settles the same totals in fewer payments, so a name can appear differently in each.
          </p>
          <AnimatePresence initial={false}>
            {showDirect && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                className="card-flat mt-2.5 divide-y divide-white/[0.06] overflow-hidden rounded-card">
                {rows.map(([id, v]) => {
                  const theyOwe = v > 0;
                  return (
                    <li key={id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar id={id} size={36} />
                      <p className="min-w-0 flex-1 truncate text-[14.5px] leading-tight">{person(id).name}</p>
                      <p className={`money text-[14px] ${theyOwe ? "text-mint" : "text-coral"}`}>
                        <span className="text-white/45">{theyOwe ? "owes you " : "you owe "}</span><span className="font-semibold">{inr(Math.abs(v))}</span>
                      </p>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </section>
      )}
    </div>
  );
}
