"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Segmented control with a sliding thumb. `layoutKey` must be unique per control on screen. */
export function Segmented<T extends string>({ value, options, onChange, layoutKey, size = "md" }: {
  value: T;
  options: { id: T; label: ReactNode }[];
  onChange: (v: T) => void;
  layoutKey: string;
  size?: "sm" | "md";
}) {
  return (
    <div className="pill grid rounded-full p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }} role="tablist">
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button key={o.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(o.id)}
            className={`relative rounded-full font-medium ${size === "sm" ? "py-1.5 text-[13px]" : "py-2.5 text-[14px]"}`}>
            {on && <motion.span layoutId={"seg-" + layoutKey} className="absolute inset-0 rounded-full bg-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" transition={{ type: "spring", stiffness: 480, damping: 40 }} />}
            <span className={`relative ${on ? "text-white" : "text-white/50"}`}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between px-1">
      <h3 className="font-display text-[15px] font-semibold tracking-tight text-white/85">{children}</h3>
      {aside && <span className="text-[12.5px] text-white/45">{aside}</span>}
    </div>
  );
}

export function Empty({ title, body, glyph }: { title: string; body: string; glyph?: string }) {
  return (
    <div className="card rounded-card px-6 py-8 text-center">
      {glyph && <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-white/[0.06] text-2xl">{glyph}</div>}
      <p className="font-display text-[18px] font-semibold tracking-tight">{title}</p>
      <p className="mx-auto mt-1 max-w-[28ch] text-[14px] leading-snug text-white/55">{body}</p>
    </div>
  );
}

export function Skeleton({ rows = 3, height = 72 }: { rows?: number; height?: number }) {
  return (
    <div className="space-y-2.5" aria-busy>
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton rounded-row" style={{ height }} />)}
    </div>
  );
}
