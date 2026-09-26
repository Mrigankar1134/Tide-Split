"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CATEGORIES, PEOPLE, person } from "@/lib/people";
import { inr, round2, splitEqual, splitPercent } from "@/lib/split";
import type { Portion } from "@/lib/types";
import type { Toast } from "./Dashboard";
import Sheet from "./Sheet";
import Avatar from "./Avatar";
import LocationChip, { useLocationCapture } from "./LocationChip";

type SplitMode = "equal" | "amount" | "percent";
type Props = { me: string; open: boolean; onClose: () => void; onSaved: () => void; notify: (t: Toast) => void };

const Seg = ({ value, options, onChange }: { value: string; options: { id: string; label: string }[]; onChange: (v: any) => void }) => (
  <div className="glass-pill grid rounded-full p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
    {options.map((o) => (
      <button key={o.id} type="button" onClick={() => onChange(o.id)} className="relative rounded-full py-2 text-[13px] font-medium" aria-pressed={value === o.id}>
        {value === o.id && <motion.span layoutId={"seg-" + options.map((x) => x.id).join()} className="absolute inset-0 rounded-full bg-white/15" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
        <span className={`relative ${value === o.id ? "text-white" : "text-white/55"}`}>{o.label}</span>
      </button>
    ))}
  </div>
);

const PersonChip = ({ id, on, onClick }: { id: string; on: boolean; onClick: () => void }) => (
  <motion.button type="button" onClick={onClick} whileTap={{ scale: 0.92 }} aria-pressed={on} className="flex shrink-0 flex-col items-center gap-1.5">
    <motion.div animate={{ opacity: on ? 1 : 0.4, scale: on ? 1 : 0.92 }}><Avatar id={id} size={46} ring={on} /></motion.div>
    <span className={`text-[11px] ${on ? "text-white" : "text-white/45"}`}>{person(id).short}</span>
  </motion.button>
);

const AmountRow = ({ id, value, onChange, suffix = "₹", hint }: { id: string; value: string; onChange: (v: string) => void; suffix?: string; hint?: string }) => (
  <label className="flex items-center gap-3 py-2">
    <Avatar id={id} size={34} />
    <span className="flex-1 text-[14px]">{person(id).short}{hint && <span className="ml-1.5 text-[12px] text-white/45">{hint}</span>}</span>
    <span className="glass-pill flex items-center gap-1 rounded-xl px-3 py-1.5">
      {suffix === "₹" && <span className="text-white/50">₹</span>}
      <input inputMode="decimal" type="number" step="0.01" min="0" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" className="tabular w-[76px] text-right text-[15px]" />
      {suffix === "%" && <span className="text-white/50">%</span>}
    </span>
  </label>
);

export default function AddExpense({ me, open, onClose, onSaved, notify }: Props) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("food");
  const [payMode, setPayMode] = useState<"one" | "many">("one");
  const [payer, setPayer] = useState(me);
  const [payMany, setPayMany] = useState<Record<string, string>>({});
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [inSplit, setInSplit] = useState<string[]>(PEOPLE.map((p) => p.id));
  const [splitAmt, setSplitAmt] = useState<Record<string, string>>({});
  const [splitPct, setSplitPct] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<{ key: string; name: string; preview?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const loc = useLocationCapture(open);

  useEffect(() => {
    if (!open) return;
    setAmount(""); setDescription(""); setCategory("food"); setPayMode("one"); setPayer(me); setPayMany({});
    setSplitMode("equal"); setInSplit(PEOPLE.map((p) => p.id)); setSplitAmt({}); setSplitPct({}); setReceipt(null);
    setTimeout(() => amountRef.current?.focus(), 350);
  }, [open, me]);

  const total = round2(Number(amount) || 0);
  const num = (r: Record<string, string>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v) || 0]));

  const payers: Portion[] = useMemo(() => payMode === "one"
    ? [{ person_id: payer, amount: total }]
    : Object.entries(num(payMany)).filter(([, v]) => v > 0).map(([person_id, v]) => ({ person_id, amount: round2(v) })), [payMode, payer, payMany, total]);
  const paidSum = round2(payers.reduce((s, p) => s + p.amount, 0));

  const shares: Portion[] = useMemo(() => {
    if (splitMode === "equal") return splitEqual(total, inSplit);
    if (splitMode === "amount") return Object.entries(num(splitAmt)).filter(([, v]) => v > 0).map(([person_id, v]) => ({ person_id, amount: round2(v) }));
    return splitPercent(total, num(splitPct));
  }, [splitMode, total, inSplit, splitAmt, splitPct]);
  const shareSum = round2(shares.reduce((s, p) => s + p.amount, 0));
  const pctSum = round2(Object.values(num(splitPct)).reduce((s, v) => s + v, 0));

  const problem =
    !(total > 0) ? "Enter an amount" :
    !description.trim() ? "Add a description" :
    payers.length === 0 ? "Choose who paid" :
    Math.abs(paidSum - total) > 0.011 ? `Paid amounts are ${inr(Math.abs(total - paidSum))} ${paidSum < total ? "short" : "over"}` :
    shares.length === 0 ? "Choose who shares this" :
    splitMode === "percent" && Math.abs(pctSum - 100) > 0.011 ? `Percentages total ${pctSum}%, need 100%` :
    Math.abs(shareSum - total) > 0.011 ? `Split is ${inr(Math.abs(total - shareSum))} ${shareSum < total ? "short" : "over"}` :
    null;

  const pickFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const r = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const put = await fetch(j.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error("Upload to S3 failed — check the bucket's CORS rules");
      setReceipt({ key: j.key, name: file.name, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined });
      notify({ text: "Bill attached" });
    } catch (e: any) { notify({ text: e.message ?? "Upload failed", kind: "error" }); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (problem) return;
    if (loc.state === "locating") { notify({ text: "Still finding your location…" }); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/expenses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), amount: total, category, created_by: me, receipt_key: receipt?.key ?? null, payers, shares, lat: loc.geo?.lat ?? null, lng: loc.geo?.lng ?? null, place: loc.geo?.place ?? null }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      onSaved();
    } catch (e: any) { notify({ text: e.message ?? "Couldn't save", kind: "error" }); }
    finally { setBusy(false); }
  };

  const toggleSplit = (id: string) => setInSplit((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const perHead = inSplit.length ? total / inSplit.length : 0;

  return (
    <Sheet open={open} onClose={onClose} title="Add expense">
      <div className="space-y-5 pt-2">
        {/* Amount + description */}
        <div className="glass rounded-[22px] px-4 py-3">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-3xl text-white/50">₹</span>
            <input ref={amountRef} inputMode="decimal" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="tabular w-full font-display text-[40px] font-bold leading-none" />
          </div>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was it for?" className="mt-2 w-full border-t border-white/10 pt-3 text-[16px]" />
        </div>

        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" data-on={category === c.id} onClick={() => setCategory(c.id)} className="glass-pill shrink-0 rounded-full px-3.5 py-2 text-[13px]">{c.glyph} {c.label}</button>
          ))}
        </div>

        {/* Paid by */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[14px] font-medium">Paid by</h3>
            <Seg value={payMode} onChange={setPayMode} options={[{ id: "one", label: "One person" }, { id: "many", label: "Several" }]} />
          </div>
          {payMode === "one" ? (
            <div className="no-scrollbar -mx-5 flex gap-3.5 overflow-x-auto px-5 py-1">
              {PEOPLE.map((p) => <PersonChip key={p.id} id={p.id} on={payer === p.id} onClick={() => setPayer(p.id)} />)}
            </div>
          ) : (
            <div className="glass divide-y divide-white/10 rounded-2xl px-4">
              {PEOPLE.map((p) => <AmountRow key={p.id} id={p.id} value={payMany[p.id] ?? ""} onChange={(v) => setPayMany((m) => ({ ...m, [p.id]: v }))} />)}
              <p className={`py-2.5 text-right text-[12px] ${Math.abs(paidSum - total) < 0.011 ? "text-mint" : "text-white/55"}`}>{inr(paidSum)} of {inr(total)}</p>
            </div>
          )}
        </section>

        {/* Split */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[14px] font-medium">Split</h3>
            <Seg value={splitMode} onChange={setSplitMode} options={[{ id: "equal", label: "Equally" }, { id: "amount", label: "Amounts" }, { id: "percent", label: "Percent" }]} />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={splitMode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              {splitMode === "equal" && (
                <>
                  <div className="grid grid-cols-5 gap-y-3 py-1">
                    {PEOPLE.map((p) => <PersonChip key={p.id} id={p.id} on={inSplit.includes(p.id)} onClick={() => toggleSplit(p.id)} />)}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[12.5px] text-white/55">
                    <button type="button" className="underline-offset-2 hover:underline" onClick={() => setInSplit(inSplit.length === PEOPLE.length ? [] : PEOPLE.map((p) => p.id))}>{inSplit.length === PEOPLE.length ? "Clear all" : "Select all"}</button>
                    <span>{inSplit.length} people · <b className="tabular text-white/80">{inr(perHead)}</b> each</span>
                  </div>
                </>
              )}
              {splitMode === "amount" && (
                <div className="glass divide-y divide-white/10 rounded-2xl px-4">
                  {PEOPLE.map((p) => <AmountRow key={p.id} id={p.id} value={splitAmt[p.id] ?? ""} onChange={(v) => setSplitAmt((m) => ({ ...m, [p.id]: v }))} />)}
                  <p className={`py-2.5 text-right text-[12px] ${Math.abs(shareSum - total) < 0.011 ? "text-mint" : "text-white/55"}`}>{inr(shareSum)} of {inr(total)}</p>
                </div>
              )}
              {splitMode === "percent" && (
                <div className="glass divide-y divide-white/10 rounded-2xl px-4">
                  {PEOPLE.map((p) => <AmountRow key={p.id} id={p.id} suffix="%" value={splitPct[p.id] ?? ""} onChange={(v) => setSplitPct((m) => ({ ...m, [p.id]: v }))} hint={splitPct[p.id] ? inr(total * (Number(splitPct[p.id]) || 0) / 100) : undefined} />)}
                  <p className={`py-2.5 text-right text-[12px] ${Math.abs(pctSum - 100) < 0.011 ? "text-mint" : "text-white/55"}`}>{pctSum}% of 100%</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Receipt */}
        <section>
          <h3 className="mb-2.5 text-[14px] font-medium">Bill or receipt</h3>
          {receipt ? (
            <div className="glass flex items-center gap-3 rounded-2xl p-3">
              {receipt.preview ? <img src={receipt.preview} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-xl">📄</div>}
              <p className="min-w-0 flex-1 truncate text-[14px]">{receipt.name}</p>
              <button type="button" onClick={() => setReceipt(null)} className="text-[13px] text-white/60">Remove</button>
            </div>
          ) : (
            <label className={`glass flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-dashed py-4 text-[14px] ${uploading ? "opacity-60" : ""}`}>
              <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploading} onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
              {uploading ? "Uploading…" : "📷 Snap or attach a bill"}
            </label>
          )}
        </section>

        <LocationChip geo={loc.geo} state={loc.state} onClear={loc.clear} />

        <button type="button" disabled={!!problem || busy || uploading} onClick={save} className="w-full rounded-full bg-amber py-4 font-display text-[16px] font-semibold text-[#1A1200] shadow-glow transition disabled:bg-white/10 disabled:text-white/50 disabled:shadow-none">
          {busy ? "Saving…" : problem ?? `Save ${inr(total)}`}
        </button>
      </div>
    </Sheet>
  );
}
