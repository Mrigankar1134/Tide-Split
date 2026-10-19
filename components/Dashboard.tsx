"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Ledger } from "@/lib/types";
import { PEOPLE, person } from "@/lib/people";
import { avoidKey, netBalances, pairwise, settlementPlans, inr } from "@/lib/split";
import Avatar from "./Avatar";
import AnimatedNumber from "./AnimatedNumber";
import Balances from "./Balances";
import Activity from "./Activity";
import AddExpense from "./AddExpense";
import SettlePlan, { type PaymentTarget } from "./SettlePlan";
import RecordPayment from "./RecordPayment";
import ChangePin from "./ChangePin";
import Sheet from "./Sheet";
import Wave from "./Wave";

type Tab = "home" | "settle" | "activity";
export type Toast = { text: string; kind?: "ok" | "error" };

const IDS = PEOPLE.map((p) => p.id);

const TabIcon = ({ tab }: { tab: Tab }) => {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (tab === "home") return <svg {...common}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /></svg>;
  if (tab === "settle") return <svg {...common}><path d="M4 8h13l-3-3" /><path d="M20 16H7l3 3" /></svg>;
  return <svg {...common}><path d="M4 6h16M4 12h10M4 18h13" /></svg>;
};

export default function Dashboard({ me, onLogout }: { me: string; onLogout: () => void }) {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [adding, setAdding] = useState(false);
  const [paying, setPaying] = useState<PaymentTarget | null>(null);
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

  const { mine, pair, plans, spent } = useMemo(() => {
    if (!ledger) return { mine: 0, pair: {}, plans: null, spent: 0 };
    const ex = ledger.expenses, st = ledger.settlements;
    const net = netBalances(ex, st);
    const avoid = new Set<string>((ledger.rules ?? []).map((r) => avoidKey(r.from_person, r.to_person)));
    return {
      mine: net[me] ?? 0,
      pair: pairwise(me, ex, st),
      plans: settlementPlans(IDS, ex, st, avoid),
      spent: ex.reduce((s, e) => s + e.amount, 0),
    };
  }, [ledger, me]);

  const p = person(me);
  const owed = mine > 0.004, owes = mine < -0.004;
  const tone = owed ? "#4ADE9A" : owes ? "#FF7B6B" : "#5EEAD4";
  const loading = !ledger && !error;
  const myPayments = plans ? plans.fewest.transfers.filter((t) => t.from === me || t.to === me).length : 0;

  const titles: Record<Tab, string> = { home: "", settle: "Settle up", activity: "Activity" };

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md px-5" style={{ paddingTop: "calc(var(--sat) + 18px)", paddingBottom: "calc(var(--sab) + 112px)" }}>
      <header className="flex items-center justify-between">
        <button onClick={() => setAccount(true)} className="flex items-center gap-3 text-left" aria-label="Your account">
          <Avatar id={me} size={42} ring />
          <div>
            <p className="font-display text-[17px] font-semibold leading-tight tracking-tight">{p.short}</p>
            <p className="text-[12.5px] text-white/50">{ledger ? `${ledger.expenses.length} expenses so far` : "Loading…"}</p>
          </div>
        </button>
        <span className="font-display text-[14px] font-semibold tracking-tight text-tide/80">Tide Split</span>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
          {tab === "home" ? (
            <>
              <section className="card relative mt-5 overflow-hidden rounded-[30px] px-6 pb-[92px] pt-6">
                <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full opacity-30 blur-3xl transition-colors duration-700" style={{ background: tone }} />
                <p className="text-[14px] text-white/60">{owed ? "The group owes you" : owes ? "You owe the group" : "You're all square"}</p>
                <div className="money mt-1 font-display text-[48px] font-bold leading-none tracking-tight transition-colors duration-700" style={{ color: tone }}>
                  {ledger ? <AnimatedNumber value={Math.abs(mine)} /> : <span className="skeleton inline-block h-11 w-44 rounded-xl" />}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[12.5px]">
                  {ledger && <span className="pill rounded-full px-2.5 py-1 text-white/70"><span className="money">{inr(spent)}</span> spent together</span>}
                  {ledger && myPayments > 0 && (
                    <button onClick={() => setTab("settle")} className="pill rounded-full px-2.5 py-1 text-white/85">
                      {myPayments} payment{myPayments === 1 ? "" : "s"} to settle ›
                    </button>
                  )}
                </div>
                <Wave color={tone} />
              </section>

              {error && (
                <div className="mt-4 rounded-row border border-coral/40 bg-coral/10 p-4 text-[14px]">
                  <p className="font-semibold text-coral">Couldn't reach the ledger</p>
                  <p className="mt-1 text-white/70">{error}</p>
                  <button onClick={load} className="btn-ghost mt-3 rounded-full px-4 py-2 text-[13px]">Try again</button>
                </div>
              )}

              <div className="mt-5">
                <Balances me={me} pair={pair} loading={loading} onRecord={setPaying} onGoSettle={() => setTab("settle")} />
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-6 mb-4 font-display text-[30px] font-bold leading-none tracking-tight">{titles[tab]}</h1>
              {tab === "settle"
                ? <SettlePlan me={me} plans={plans} loading={loading} onRecord={setPaying} />
                : <Activity me={me} ledger={ledger} onChanged={load} notify={notify} />}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom bar */}
      <nav className="fixed inset-x-0 z-30 mx-auto w-full max-w-md px-4" style={{ bottom: "calc(var(--sab) + 14px)" }} aria-label="Sections">
        <div className="bar grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-1 rounded-[28px] p-1.5">
          {(["home", "settle", "activity"] as Tab[]).map((t) => {
            const on = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)} aria-current={on ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 rounded-[22px] py-2 text-[11px] font-medium transition-colors ${on ? "text-white" : "text-white/45"}`}>
                {on && <motion.span layoutId="nav" className="absolute inset-0 rounded-[22px] bg-white/[0.1]" transition={{ type: "spring", stiffness: 480, damping: 40 }} />}
                <span className="relative"><TabIcon tab={t} /></span>
                <span className="relative capitalize">{t}</span>
                {t === "settle" && myPayments > 0 && <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-amber shadow-[0_0_0_3px_rgba(10,15,28,0.9)]" aria-hidden />}
              </button>
            );
          })}
          <motion.button onClick={() => setAdding(true)} whileTap={{ scale: 0.93 }} aria-label="Add expense"
            className="btn-primary ml-1 grid h-[52px] w-[52px] place-items-center rounded-[20px]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
          </motion.button>
        </div>
      </nav>

      <AddExpense me={me} open={adding} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); navigator.vibrate?.(20); notify({ text: "Expense added" }); }} notify={notify} />
      <RecordPayment me={me} target={paying} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); load(); navigator.vibrate?.(20); notify({ text: "Payment recorded" }); }} notify={notify} />
      <ChangePin open={changingPin} onClose={() => setChangingPin(false)} notify={notify} />

      <Sheet open={account} onClose={() => setAccount(false)} title="Your account">
        <div className="space-y-3 pt-3">
          <div className="flex items-center gap-3 px-1"><Avatar id={me} size={48} /><div><p className="font-medium">{p.name}</p><p className="text-[13px] text-white/55">Signed in on this phone</p></div></div>
          <button onClick={() => { setAccount(false); setChangingPin(true); }} className="card w-full rounded-row px-4 py-3.5 text-left text-[15px]">Change my PIN</button>
          <button onClick={() => { setAccount(false); onLogout(); }} className="card w-full rounded-row px-4 py-3.5 text-left text-[15px] text-coral">Sign out</button>
        </div>
      </Sheet>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}
            className={`bar fixed left-1/2 z-[60] -translate-x-1/2 rounded-full px-5 py-3 text-[14px] font-medium ${toast.kind === "error" ? "text-coral" : "text-mint"}`}
            style={{ top: "calc(var(--sat) + 16px)" }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
