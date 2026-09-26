"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Props = { onComplete: (pin: string) => Promise<boolean> | boolean; disabled?: boolean; label?: string };

export default function PinPad({ onComplete, disabled, label }: Props) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (pin.length !== 4) return;
    let live = true;
    (async () => {
      setChecking(true);
      const ok = await onComplete(pin);
      if (!live) return;
      setChecking(false);
      if (!ok) { setShake((s) => s + 1); navigator.vibrate?.([40, 40, 40]); setTimeout(() => setPin(""), 350); }
    })();
    return () => { live = false; };
  }, [pin, onComplete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      if (e.key === "Backspace") press("⌫");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const press = (k: string) => {
    if (disabled || checking) return;
    navigator.vibrate?.(8);
    if (k === "⌫") setPin((p) => p.slice(0, -1));
    else if (pin.length < 4) setPin((p) => p + k);
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="flex flex-col items-center">
      {label && <p className="mb-4 text-[14px] text-white/60">{label}</p>}
      <motion.div key={shake} animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : {}} transition={{ duration: 0.45 }} className="flex gap-4">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            animate={{ scale: pin.length > i ? 1 : 0.6, backgroundColor: pin.length > i ? "#F5B942" : "rgba(255,255,255,0.18)", boxShadow: pin.length > i ? "0 0 18px rgba(245,185,66,0.7)" : "none" }}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
            className="h-4 w-4 rounded-full"
          />
        ))}
      </motion.div>

      <div className="mt-10 grid w-full max-w-[300px] grid-cols-3 gap-3">
        {keys.map((k, i) =>
          k === "" ? <span key={i} /> : (
            <motion.button
              key={k} type="button" onClick={() => press(k)} whileTap={{ scale: 0.88, backgroundColor: "rgba(255,255,255,0.22)" }}
              className={`glass aspect-[1.35] rounded-[22px] font-display text-[26px] font-semibold ${k === "⌫" ? "text-[20px] text-white/70" : ""}`}
              aria-label={k === "⌫" ? "Delete" : k}
            >{k}</motion.button>
          )
        )}
      </div>
      <p className={`mt-5 h-5 text-[13px] ${checking ? "text-white/60" : "text-transparent"}`}>Checking…</p>
    </div>
  );
}
