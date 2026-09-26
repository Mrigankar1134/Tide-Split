"use client";
import { motion } from "framer-motion";
import { person } from "@/lib/people";
import { inr, type Transfer } from "@/lib/split";
import Avatar from "./Avatar";

type Props = {
  me: string;
  pair: Record<string, number>;
  transfers: Transfer[];
  loading: boolean;
  onSettle: (other: string, signedAmount: number) => void;
};

export default function Balances({ me, pair, transfers, loading, onSettle }: Props) {
  const rows = Object.entries(pair).filter(([, v]) => Math.abs(v) > 0.004).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  if (loading) return <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="glass h-[72px] animate-pulse rounded-2xl" />)}</div>;

  if (rows.length === 0)
    return (
      <div className="glass rounded-[26px] p-6 text-center">
        <p className="font-display text-[18px] font-semibold">Nothing owed either way</p>
        <p className="mt-1 text-[14px] text-white/60">Add an expense and balances show up here.</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 px-1 text-[13px] font-medium text-white/55">Between you and each person</h3>
        <ul className="space-y-2.5">
          {rows.map(([id, v], i) => {
            const theyOwe = v > 0;
            return (
              <motion.li key={id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="glass flex items-center gap-3 rounded-2xl p-3.5">
                <Avatar id={id} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{person(id).name}</p>
                  <p className={`text-[13px] ${theyOwe ? "text-mint" : "text-coral"}`}>{theyOwe ? "owes you" : "you owe"} <span className="tabular font-semibold">{inr(Math.abs(v))}</span></p>
                </div>
                <button onClick={() => onSettle(id, v)} className="glass-pill rounded-full px-3.5 py-2 text-[13px] font-medium whitespace-nowrap">
                  {theyOwe ? "They paid me" : "Pay"}
                </button>
              </motion.li>
            );
          })}
        </ul>
      </section>

      {transfers.length > 0 && (
        <section>
          <h3 className="mb-2 px-1 text-[13px] font-medium text-white/55">Fewest payments to clear the whole group</h3>
          <ul className="glass divide-y divide-white/10 rounded-2xl">
            {transfers.map((t, i) => {
              const involvesMe = t.from === me || t.to === me;
              return (
                <li key={i} className={`flex items-center gap-3 px-4 py-3 ${involvesMe ? "" : "opacity-60"}`}>
                  <Avatar id={t.from} size={30} />
                  <span className="text-[14px]">{t.from === me ? "You" : person(t.from).short}</span>
                  <span className="text-white/40">→</span>
                  <Avatar id={t.to} size={30} />
                  <span className="text-[14px]">{t.to === me ? "You" : person(t.to).short}</span>
                  <span className="tabular ml-auto text-[14px] font-semibold">{inr(t.amount)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
