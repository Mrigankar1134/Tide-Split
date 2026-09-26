"use client";
import { useEffect, useRef } from "react";
import { animate, useMotionValue } from "framer-motion";
import { inr } from "@/lib/split";

export default function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    const unsub = mv.on("change", (v) => { if (ref.current) ref.current.textContent = inr(Math.round(v)); });
    return () => { controls.stop(); unsub(); };
  }, [value, mv]);
  return <span ref={ref} className={`tabular ${className ?? ""}`}>{inr(0)}</span>;
}
