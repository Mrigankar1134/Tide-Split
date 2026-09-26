"use client";
import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sheet from "./Sheet";
import PinPad from "./PinPad";
import type { Toast } from "./Dashboard";

export default function ChangePin({ open, onClose, notify }: { open: boolean; onClose: () => void; notify: (t: Toast) => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const reset = () => { setStep(0); setCurrent(""); setNext(""); setErr(null); };
  const close = () => { reset(); onClose(); };

  const onPin = useCallback(async (pin: string) => {
    setErr(null);
    if (step === 0) { setCurrent(pin); setStep(1); return true; }
    if (step === 1) { setNext(pin); setStep(2); return true; }
    if (pin !== next) { setErr("PINs don't match — try again"); setStep(1); return false; }
    const r = await fetch("/api/pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, next }) });
    const j = await r.json();
    if (!r.ok) { setErr(j.error ?? "Couldn't change PIN"); reset(); return false; }
    notify({ text: "PIN changed" }); close();
    return true;
  }, [step, current, next, notify]);

  const labels = ["Enter your current PIN", "Choose a new 4-digit PIN", "Enter the new PIN again"];

  return (
    <Sheet open={open} onClose={close} title="Change PIN">
      <div className="pt-4">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <PinPad key={step} label={labels[step]} onComplete={onPin} />
          </motion.div>
        </AnimatePresence>
        <p className={`mt-1 text-center text-[13px] text-coral ${err ? "opacity-100" : "opacity-0"}`}>{err ?? "—"}</p>
      </div>
    </Sheet>
  );
}
