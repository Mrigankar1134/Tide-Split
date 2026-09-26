"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PEOPLE, person } from "@/lib/people";
import Avatar from "./Avatar";
import PinPad from "./PinPad";

const LAST = "tidesplit:last";

export default function Onboarding({ onLogin }: { onLogin: (id: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { try { const l = localStorage.getItem(LAST); if (l && PEOPLE.some((p) => p.id === l)) setPicked(l); } catch {} }, []);

  const tryPin = useCallback(async (pin: string) => {
    if (!picked) return false;
    setError(null);
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ person_id: picked, pin }) });
      const j = await r.json();
      if (!r.ok) { setError(j.error ?? "Wrong PIN"); return false; }
      try { localStorage.setItem(LAST, picked); } catch {}
      navigator.vibrate?.(20);
      onLogin(picked);
      return true;
    } catch { setError("Can't reach the server"); return false; }
  }, [picked, onLogin]);

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5" style={{ paddingTop: "calc(var(--sat) + 48px)", paddingBottom: "calc(var(--sab) + 24px)" }}>
      <AnimatePresence mode="wait">
        {!picked ? (
          <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="font-display text-sm text-white/55">Tide Split</p>
              <h1 className="mt-2 font-display text-[40px] font-bold leading-[1.05] tracking-tight">Who are you?</h1>
              <p className="mt-3 max-w-[30ch] text-[15px] text-white/60">Tap your name, then enter your 4-digit PIN.</p>
            </motion.div>
            <motion.ul className="mt-8 grid grid-cols-3 gap-3" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.2 } } }}>
              {PEOPLE.map((p) => (
                <motion.li key={p.id} variants={{ hidden: { opacity: 0, y: 18, scale: 0.94 }, show: { opacity: 1, y: 0, scale: 1 } }} transition={{ type: "spring", stiffness: 320, damping: 26 }}>
                  <motion.button type="button" onClick={() => setPicked(p.id)} whileTap={{ scale: 0.94 }} className="glass flex aspect-[0.9] w-full flex-col items-center justify-center gap-2.5 rounded-[22px] px-2">
                    <Avatar id={p.id} size={48} />
                    <span className="text-center text-[13px] leading-tight text-white/80">{p.short}</span>
                  </motion.button>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        ) : (
          <motion.div key="pin" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.3 }} className="flex flex-1 flex-col">
            <button onClick={() => { setPicked(null); setError(null); }} className="self-start text-[14px] text-white/60">‹ Not you?</button>
            <div className="mt-8 flex flex-col items-center">
              <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <Avatar id={picked} size={84} ring />
              </motion.div>
              <h1 className="mt-4 font-display text-[26px] font-bold tracking-tight">{person(picked).name}</h1>
              <p className="mt-1 text-[14px] text-white/55">Enter your PIN</p>
            </div>
            <div className="mt-8">
              <PinPad onComplete={tryPin} />
            </div>
            <p className={`mt-1 text-center text-[13px] text-coral transition-opacity ${error ? "opacity-100" : "opacity-0"}`}>{error ?? "—"}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
