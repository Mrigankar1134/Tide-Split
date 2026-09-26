"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Ledger } from "@/lib/types";
import { person } from "@/lib/people";
import { netBalances, pairwise, simplify, inr } from "@/lib/split";
import Avatar from "./Avatar";
import AnimatedNumber from "./AnimatedNumber";
import Balances from "./Balances";
import Activity from "./Activity";
import AddExpense from "./AddExpense";
import Settle from "./Settle";
import ChangePin from "./ChangePin";
import Sheet from "./Sheet";
import Wave from "./Wave";

type Tab = "balances" | "activity";
export type Toast = { text: string; kind?: "ok" | "error" };

export default function Dashboard({ me, onLogout }: { me: string; onLogout: () => void }) {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("balances");
  const [adding, setAdding] = useState(false);
  const [settling, setSettling] = useState<{ to: string; amount: number } | null>(null);
  const [account, setAccount] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/ledger", { cache: "no-store" });
      if (r.status === 401) { onLogout(); return; }
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Couldn't load");
      setLedger(j); setError(null);
    } catch (e: any) { setError(e.message); }
  }, [onLogout]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  const notify = useCallback((t: Toast) => { setToast(t); setTimeout(() => setToast(null), 2600); }, []);

  const { mine, pair, transfers } = useMemo(() => {
    const ex = ledger?.expenses ?? [], st = ledger?.settlements ?? [];
    const net = netBalances(ex, st);
    return { mine: net[me] ?? 0, pair: pairwise(me, ex, st), transfers: simplify(net) };
  }, [ledger, me]);

  const p = person(me);
  const owed = mine > 0.004, owes = mine < -0.004;
  const tone = owed ? "#57D9A3" : owes ? "#FF7A6B" : "#F5B942";

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md px-5" style={{ paddingTop: "calc(var(--sat) + 20px)", paddingBottom: "calc(var(--sab) + 120px)" }}>
      <header className="flex items-center justify-between">
        <button onClick={() => setAccount(true)} className="flex items-center gap-3 text-left">
          <Avatar id={me} size={44} ring />
          <div>
            <p className="text-[13px] text-white/55">Good to see you</p>
            <p className="font-display text-[17px] font-semibold leading-tight">{p.name}</p>
          </div>
        </button>
        <span className="font-display text-[15px] font-semibold tracking-tight text-white/45">Tide Split</span>
      </header>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
        className="glass relative mt-6 overflow-hidden rounded-[30px] px-6 pb-16 pt-6"
      >
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40 blur-3xl transition-colors duration-700" style={{ background: tone }} />
        <p className="text-[14px] text-white/60">{owed ? "The group owes you" : owes ? "You owe the group" : "You're all square"}</p>
        <div className="mt-1 font-display text-[46px] font-bold leading-none tracking-tight transition-colors duration-700" style={{ color: tone }}>
          {ledger ? <AnimatedNumber value={Math.abs(mine)} /> : <span className="inline-block h-11 w-40 animate-pulse rounded-xl bg-white/10" />}
        </div>
        <p className="mt-4 text-[13px] text-white/55">
          {ledger ? `${ledger.expenses.length} expenses · ${inr(ledger.expenses.reduce((s, e) => s + e.amount, 0))} spent together` : "Loading the ledger…"}
        </p>
        <Wave color={tone} />
      </motion.section>

      {error && (
        <div className="mt-4 rounded-2xl border border-coral/40 bg-coral/10 p-4 text-[14px]">
          <p className="font-semibold text-coral">Couldn't reach the database</p>
          <p className="mt-1 text-white/70">{error}</p>
          <button onClick={load} className="mt-3 rounded-full bg-white/10 px-4 py-2 text-[13px]">Try again</button>
        </div>
      )}

      {/* Tabs */}
      <div className="glass-pill relative mt-6 grid grid-cols-2 rounded-full p-1">
        {(["balances", "activity"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="relative z-10 rounded-full py-2.5 text-[14px] font-medium capitalize" aria-pressed={tab === t}>
            {tab === t && <motion.span layoutId="tab" className="absolute inset-0 rounded-full bg-white/15" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
            <span className={`relative ${tab === t ? "text-white" : "text-white/55"}`}>{t}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="mt-4">
          {tab === "balances"
            ? <Balances me={me} pair={pair} transfers={transfers} loading={!ledger && !error} onSettle={(to, amount) => setSettling({ to, amount })} />
            : <Activity me={me} ledger={ledger} onChanged={load} notify={notify} />}
        </motion.div>
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        onClick={() => setAdding(true)}
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.5 }}
        whileTap={{ scale: 0.93 }}
        className="fixed left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber px-6 py-4 font-display text-[16px] font-semibold text-[#1A1200] shadow-glow"
        style={{ bottom: "calc(var(--sab) + 24px)" }}
      >
        <span className="text-[22px] leading-none">+</span> Add expense
      </motion.button>

      <AddExpense me={me} open={adding} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); navigator.vibrate?.(20); notify({ text: "Expense added" }); }} notify={notify} />
      <Settle me={me} target={settling} onClose={() => setSettling(null)} onSaved={() => { setSettling(null); load(); navigator.vibrate?.(20); notify({ text: "Payment recorded" }); }} notify={notify} />
      <ChangePin open={changingPin} onClose={() => setChangingPin(false)} notify={notify} />

      <Sheet open={account} onClose={() => setAccount(false)} title="Your account">
        <div className="space-y-3 pt-3">
          <div className="flex items-center gap-3 px-1"><Avatar id={me} size={48} /><div><p className="font-medium">{p.name}</p><p className="text-[13px] text-white/55">Logged in on this phone</p></div></div>
          <button onClick={() => { setAccount(false); setChangingPin(true); }} className="glass w-full rounded-2xl px-4 py-3.5 text-left text-[15px]">Change my PIN</button>
          <button onClick={() => { setAccount(false); onLogout(); }} className="glass w-full rounded-2xl px-4 py-3.5 text-left text-[15px] text-coral">Log out</button>
        </div>
      </Sheet>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}
            className={`glass-strong fixed left-1/2 z-[60] -translate-x-1/2 rounded-full px-5 py-3 text-[14px] font-medium ${toast.kind === "error" ? "text-coral" : "text-mint"}`}
            style={{ top: "calc(var(--sat) + 16px)" }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
