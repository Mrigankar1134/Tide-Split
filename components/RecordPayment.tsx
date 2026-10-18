"use client";
import { useEffect, useState } from "react";
import { person } from "@/lib/people";
import { inr } from "@/lib/split";
import type { Toast } from "./Dashboard";
import type { PaymentTarget } from "./SettlePlan";
import Sheet from "./Sheet";
import Avatar from "./Avatar";
import LocationChip, { useLocationCapture } from "./LocationChip";

type Props = {
  me: string;
  target: PaymentTarget | null;
  onClose: () => void;
  onSaved: () => void;
  notify: (t: Toast) => void;
};

export default function RecordPayment({ me, target, onClose, onSaved, notify }: Props) {
  const iPay = target?.from === me;
  const other = target ? (iPay ? target.to : target.from) : "";
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const loc = useLocationCapture(!!target);

  useEffect(() => { if (target) { setAmount(String(target.amount)); setNote(""); } }, [target]);

  const save = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const r = await fetch("/api/settlements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_person: target.from, to_person: target.to, amount: Number(amount), note: note || null, lat: loc.geo?.lat ?? null, lng: loc.geo?.lng ?? null, place: loc.geo?.place ?? null }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      onSaved();
    } catch (e: any) { notify({ text: e.message ?? "Couldn't record the payment", kind: "error" }); }
    finally { setBusy(false); }
  };

  const n = Number(amount) || 0;

  return (
    <Sheet open={!!target} onClose={onClose} title={iPay ? `Pay ${person(other).short}` : `Received from ${person(other).short}`}>
      {target && (
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-center gap-5 py-3">
            <div className="text-center">
              <Avatar id={target.from} size={60} />
              <p className="mt-2 text-[12.5px] text-white/70">{iPay ? "You" : person(target.from).short}</p>
            </div>
            <svg width="40" height="16" viewBox="0 0 40 16" fill="none" aria-hidden className="text-amber">
              <path d="M0 8h34M28 2l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-center">
              <Avatar id={target.to} size={60} />
              <p className="mt-2 text-[12.5px] text-white/70">{iPay ? person(target.to).short : "You"}</p>
            </div>
          </div>

          <label className="card block rounded-row px-4 py-3">
            <span className="text-[12.5px] text-white/55">Amount</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-2xl text-white/50">₹</span>
              <input inputMode="decimal" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="money w-full font-display text-[32px] font-semibold" />
            </div>
            {Math.abs(n - target.amount) > 0.005 && n > 0 && (
              <p className="mt-1 text-[12.5px] text-white/50">
                Plan suggests {inr(target.amount)}. <button type="button" className="text-tide" onClick={() => setAmount(String(target.amount))}>Use that</button>
              </p>
            )}
          </label>

          <label className="card block rounded-row px-4 py-3">
            <span className="text-[12.5px] text-white/55">Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="UPI, cash, dinner was on me…" className="w-full text-[16px]" />
          </label>

          <LocationChip geo={loc.geo} state={loc.state} onClear={loc.clear} />

          <button disabled={busy || !(n > 0)} onClick={save} className="btn-primary w-full rounded-full py-4 font-display text-[16px] font-semibold">
            {busy ? "Recording…" : iPay ? `Record ${inr(n)} paid` : `Record ${inr(n)} received`}
          </button>
        </div>
      )}
    </Sheet>
  );
}
