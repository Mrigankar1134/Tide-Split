"use client";
import { useEffect, useState } from "react";
import { captureLocation, type Geo } from "@/lib/geo";

/** Captures the device location when `active` turns true and reports it upward. */
export function useLocationCapture(active: boolean) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [state, setState] = useState<"idle" | "locating" | "done" | "off">("idle");
  useEffect(() => {
    if (!active) { setGeo(null); setState("idle"); return; }
    let live = true;
    setState("locating");
    captureLocation().then((g) => { if (!live) return; setGeo(g); setState(g ? "done" : "off"); });
    return () => { live = false; };
  }, [active]);
  return { geo, state, clear: () => { setGeo(null); setState("off"); } };
}

export default function LocationChip({ geo, state, onClear }: { geo: Geo | null; state: string; onClear: () => void }) {
  if (state === "idle") return null;
  const label = state === "locating" ? "Finding where you are…" : geo ? (geo.place ?? `${geo.lat}, ${geo.lng}`) : "Location off — saving without it";
  return (
    <div className={`glass-pill flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] text-white/75 ${state === "locating" ? "locating" : ""}`}>
      {state !== "locating" && <span>{geo ? "📍" : "🚫"}</span>}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {geo && <button type="button" onClick={onClear} className="text-white/45" aria-label="Don't save location">✕</button>}
    </div>
  );
}
