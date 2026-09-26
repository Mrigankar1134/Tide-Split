"use client";
import { useEffect, useState } from "react";
import { person } from "@/lib/people";
import { inr } from "@/lib/split";
import type { Toast } from "./Dashboard";
import Sheet from "./Sheet";
import Avatar from "./Avatar";
import LocationChip, { useLocationCapture } from "./LocationChip";

type Props = {
  me: string;
  target: { to: string; amount: number } | null;   // amount > 0: they owe me; < 0: I owe them
  onClose: () => void;
  onSaved: () => void;
  notify: (t: Toast) => void;
};

export default function Settle({ me, target, onClose, onSaved, notify }: Props) {
  const iPay = (target?.amount ?? 0) < 0;
  const other = target?.to ?? "";
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const loc = useLocationCapture(!!target);

  useEffect(() => { if (target) { setAmount(String(Math.abs(target.amount))); setNote(""); } }, [target]);

  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/settlements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_person: iPay ? me : other, to_person: iPay ? other : me, amount: Number(amount), note: note || null, lat: loc.geo?.lat ?? null, lng: loc.geo?.lng ?? null, place: loc.geo?.place ?? null }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      onSaved();
    } catch (e: any) { notify({ text: e.message ?? "Couldn't save", kind: "error" }); }
    finally { setBusy(false); }
  };

  return (
    <Sheet open={!!target} onClose={onClose} title={iPay ? "Record a payment" : "Record what you received"}>
      {target && (
        <div className="space-y-5 pt-2">
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="text-center"><Avatar id={iPay ? me : other} size={56} /><p className="mt-1.5 text-[12px] text-white/70">{iPay ? "You" : person(other).short}</p></div>
            <span className="font-display text-2xl text-amber">→</span>
            <div className="text-center"><Avatar id={iPay ? other : me} size={56} /><p className="mt-1.5 text-[12px] text-white/70">{iPay ? person(other).short : "You"}</p></div>
          </div>
          <label className="glass block rounded-2xl px-4 py-3">
            <span className="text-[12px] text-white/55">Amount</span>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-2xl text-white/60">₹</span>
              <input inputMode="decimal" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular w-full font-display text-[30px] font-semibold" />
            </div>
          </label>
          <label className="glass block rounded-2xl px-4 py-3">
            <span className="text-[12px] text-white/55">Note (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="UPI, cash…" className="w-full text-[16px]" />
          </label>
          <LocationChip geo={loc.geo} state={loc.state} onClear={loc.clear} />
          <button disabled={busy || !(Number(amount) > 0)} onClick={save} className="w-full rounded-full bg-amber py-4 font-display text-[16px] font-semibold text-[#1A1200] shadow-glow disabled:opacity-50">
            {busy ? "Saving…" : `Record ${inr(Number(amount) || 0)}`}
          </button>
        </div>
      )}
    </Sheet>
  );
}
