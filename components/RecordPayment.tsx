"use client";
import { useEffect, useState } from "react";
import { person } from "@/lib/people";
import { inr, round2 } from "@/lib/split";
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

  const planned = target?.amount ?? 0;
  const n = round2(Number(amount) || 0);
  const partial = n > 0 && n < planned - 0.004;
  const remaining = round2(planned - n);
  const over = n > planned + 0.004;

  const save = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const r = await fetch("/api/settlements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_person: target.from, to_person: target.to, amount: n, note: note || null,
          planned: partial ? planned : null,
          lat: loc.geo?.lat ?? null, lng: loc.geo?.lng ?? null, place: loc.geo?.place ?? null,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      onSaved();
    } catch (e: any) { notify({ text: e.message ?? "Couldn't record the payment", kind: "error" }); }
    finally { setBusy(false); }
  };

  const preset = (v: number) => setAmount(String(round2(v)));

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
            <span className="flex items-baseline justify-between text-[12.5px] text-white/55">
              <span>Amount {iPay ? "paid" : "received"}</span>
              <span>of <span className="money">{inr(planned)}</span> due</span>
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-2xl text-white/50">₹</span>
              <input inputMode="decimal" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="money w-full font-display text-[32px] font-semibold" />
            </div>
            <div className="mt-2 flex gap-2">
              {[{ l: "Full", v: planned }, { l: "Half", v: planned / 2 }, { l: "Quarter", v: planned / 4 }].map((p) => (
                <button key={p.l} type="button" onClick={() => preset(p.v)} aria-pressed={Math.abs(n - round2(p.v)) < 0.005}
                  className="pill rounded-full px-3 py-1 text-[12.5px] text-white/75 aria-pressed:border-tide/60 aria-pressed:text-white">
                  {p.l}
                </button>
              ))}
            </div>
          </label>

          {partial && (
            <div className="rounded-row border border-amber/30 bg-amber/10 px-4 py-3 text-[13.5px] leading-snug">
              <p className="font-medium text-amber">Part payment</p>
              <p className="mt-0.5 text-white/75">
                <span className="money font-semibold text-white">{inr(remaining)}</span> stays due {iPay ? `to ${person(other).short} from you` : `from ${person(other).short} to you`}, and the plan keeps it between the two of you until it's cleared.
              </p>
            </div>
          )}
          {over && (
            <p className="px-1 text-[13px] text-white/55">That's {inr(round2(n - planned))} more than due — fine if it covers something else; balances will reflect it.</p>
          )}

          <label className="card block rounded-row px-4 py-3">
            <span className="text-[12.5px] text-white/55">Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="UPI, cash, dinner was on me…" className="w-full text-[16px]" />
          </label>

          <LocationChip geo={loc.geo} state={loc.state} onClear={loc.clear} />

          <button disabled={busy || !(n > 0)} onClick={save} className="btn-primary w-full rounded-full py-4 font-display text-[16px] font-semibold">
            {busy ? "Recording…" : `Record ${inr(n)} ${iPay ? "paid" : "received"}${partial ? ` · ${inr(remaining)} left` : ""}`}
          </button>
        </div>
      )}
    </Sheet>
  );
}
