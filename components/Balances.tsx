"use client";
import { motion } from "framer-motion";
import { person } from "@/lib/people";
import { inr } from "@/lib/split";
import Avatar from "./Avatar";
import type { PaymentTarget } from "./SettlePlan";
import { Empty, SectionTitle, Skeleton } from "./ui";

type Props = {
  me: string;
  pair: Record<string, number>;   // + they owe me, − I owe them
  loading: boolean;
  onRecord: (t: PaymentTarget) => void;
  onGoSettle: () => void;
};

export default function Balances({ me, pair, loading, onRecord, onGoSettle }: Props) {
  if (loading) return <Skeleton rows={3} />;

  const rows = Object.entries(pair).filter(([, v]) => Math.abs(v) > 0.004).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  if (rows.length === 0)
    return <Empty glyph="🌊" title="Nothing owed either way" body="Add an expense and your balance with each person shows up here." />;

  const owedToMe = rows.filter(([, v]) => v > 0), iOwe = rows.filter(([, v]) => v < 0);

  const Row = ({ id, v, i }: { id: string; v: number; i: number }) => {
    const theyOwe = v > 0;
    return (
      <motion.li key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.035, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center gap-3 px-4 py-3">
        <Avatar id={id} size={42} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium leading-tight">{person(id).name}</p>
          <p className={`money mt-0.5 text-[13.5px] ${theyOwe ? "text-mint" : "text-coral"}`}>
            {theyOwe ? "owes you" : "you owe"} <span className="font-semibold">{inr(Math.abs(v))}</span>
          </p>
        </div>
        <button
          onClick={() => onRecord(theyOwe ? { from: id, to: me, amount: Math.abs(v) } : { from: me, to: id, amount: Math.abs(v) })}
          className="btn-ghost whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium">
          {theyOwe ? "Got paid" : "Pay"}
        </button>
      </motion.li>
    );
  };

  return (
    <div className="space-y-5">
      {iOwe.length > 0 && (
        <section>
          <SectionTitle aside={<span className="money">{inr(iOwe.reduce((s, [, v]) => s - v, 0))}</span>}>You owe</SectionTitle>
          <ul className="card divide-y divide-white/[0.07] overflow-hidden rounded-card">
            {iOwe.map(([id, v], i) => <Row key={id} id={id} v={v} i={i} />)}
          </ul>
        </section>
      )}
      {owedToMe.length > 0 && (
        <section>
          <SectionTitle aside={<span className="money">{inr(owedToMe.reduce((s, [, v]) => s + v, 0))}</span>}>Owed to you</SectionTitle>
          <ul className="card divide-y divide-white/[0.07] overflow-hidden rounded-card">
            {owedToMe.map(([id, v], i) => <Row key={id} id={id} v={v} i={i + iOwe.length} />)}
          </ul>
        </section>
      )}
      <button onClick={onGoSettle} className="card-flat flex w-full items-center justify-between rounded-row px-4 py-3.5 text-left">
        <span>
          <span className="block text-[14.5px] font-medium">Settle the whole group</span>
          <span className="block text-[12.5px] text-white/50">See the fewest payments that clear everyone</span>
        </span>
        <span className="text-white/40">›</span>
      </button>
    </div>
  );
}
