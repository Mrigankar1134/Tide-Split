"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Expense, Ledger, Settlement } from "@/lib/types";
import { categoryGlyph, person } from "@/lib/people";
import { inr } from "@/lib/split";
import { mapsUrl } from "@/lib/geo";
import type { Toast } from "./Dashboard";
import Avatar from "./Avatar";

type Item = { kind: "expense"; at: string; e: Expense } | { kind: "settlement"; at: string; s: Settlement };

const dayLabel = (iso: string) => {
  const d = new Date(iso), now = new Date();
  const diff = Math.round((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
};

export default function Activity({ me, ledger, onChanged, notify }: { me: string; ledger: Ledger | null; onChanged: () => void; notify: (t: Toast) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (!ledger) return <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="glass h-[76px] animate-pulse rounded-2xl" />)}</div>;

  const items: Item[] = [
    ...ledger.expenses.map((e) => ({ kind: "expense" as const, at: e.created_at, e })),
    ...ledger.settlements.map((s) => ({ kind: "settlement" as const, at: s.created_at, s })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  if (items.length === 0)
    return (
      <div className="glass rounded-[26px] p-6 text-center">
        <p className="font-display text-[18px] font-semibold">No activity yet</p>
        <p className="mt-1 text-[14px] text-white/60">Tap Add expense to log the first one.</p>
      </div>
    );

  const remove = async (item: Item) => {
    const id = item.kind === "expense" ? item.e.id : item.s.id;
    if (!confirm("Delete this? Balances will update for everyone.")) return;
    setBusy(id);
    try {
      const r = item.kind === "expense"
        ? await fetch(`/api/expenses/${id}`, { method: "DELETE" })
        : await fetch("/api/settlements", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!r.ok) throw new Error((await r.json()).error);
      notify({ text: "Deleted" }); onChanged();
    } catch (e: any) { notify({ text: e.message ?? "Couldn't delete", kind: "error" }); }
    finally { setBusy(null); }
  };

  let lastDay = "";
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const day = dayLabel(item.at);
        const header = day !== lastDay ? <li key={"h" + day} className="px-1 pt-2 text-[13px] font-medium text-white/55">{day}</li> : null;
        lastDay = day;
        const id = item.kind === "expense" ? item.e.id : item.s.id;
        const open = openId === id;

        if (item.kind === "settlement") {
          const { s } = item;
          return [header, (
            <motion.li key={id} layout className="glass flex items-center gap-3 rounded-2xl px-4 py-3 opacity-90" onClick={() => setOpenId(open ? null : id)}>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-mint/15 text-lg">💸</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px]">{s.from_person === me ? "You" : person(s.from_person).short} paid {s.to_person === me ? "you" : person(s.to_person).short}</p>
                {(s.note || s.place) && <p className="truncate text-[12px] text-white/50">{[s.note, s.place && `📍 ${s.place}`].filter(Boolean).join(" · ")}</p>}
              </div>
              <span className="tabular text-[15px] font-semibold text-mint">{inr(s.amount)}</span>
              {open && <button disabled={busy === id} onClick={(ev) => { ev.stopPropagation(); remove(item); }} className="ml-1 rounded-full bg-coral/15 px-3 py-1.5 text-[12px] text-coral">Delete</button>}
            </motion.li>
          )];
        }

        const { e } = item;
        const mine = e.shares.find((s) => s.person_id === me)?.amount ?? 0;
        const paidByMe = e.payers.find((p) => p.person_id === me)?.amount ?? 0;
        const payerLabel = e.payers.length === 1 ? (e.payers[0].person_id === me ? "You paid" : `${person(e.payers[0].person_id).short} paid`) : `${e.payers.length} people paid`;
        return [header, (
          <motion.li key={id} layout className="glass overflow-hidden rounded-2xl">
            <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left" onClick={() => setOpenId(open ? null : id)} aria-expanded={open}>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-xl">{categoryGlyph(e.category)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{e.description}</p>
                <p className="truncate text-[12.5px] text-white/55">{payerLabel} {inr(e.amount)}{e.receipt_key ? " · 🧾" : ""}{e.place ? ` · 📍 ${e.place}` : ""}</p>
              </div>
              <div className="text-right">
                {mine > 0 || paidByMe > 0 ? (
                  <>
                    <p className={`tabular text-[14px] font-semibold ${paidByMe - mine >= 0 ? "text-mint" : "text-coral"}`}>{paidByMe - mine >= 0 ? "+" : "−"}{inr(Math.abs(paidByMe - mine))}</p>
                    <p className="text-[11px] text-white/45">{paidByMe - mine >= 0 ? "you lent" : "your share"}</p>
                  </>
                ) : <p className="text-[12px] text-white/40">not involved</p>}
              </div>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="border-t border-white/10">
                  <div className="space-y-3 px-4 py-3 text-[13px]">
                    <div>
                      <p className="mb-1.5 text-white/50">Paid by</p>
                      <div className="flex flex-wrap gap-1.5">{e.payers.map((p) => <span key={p.person_id} className="glass-pill flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5"><Avatar id={p.person_id} size={20} />{person(p.person_id).short} <b className="tabular">{inr(p.amount)}</b></span>)}</div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-white/50">Split between</p>
                      <div className="flex flex-wrap gap-1.5">{e.shares.map((s) => <span key={s.person_id} className="glass-pill flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5"><Avatar id={s.person_id} size={20} />{person(s.person_id).short} <b className="tabular">{inr(s.amount)}</b></span>)}</div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-white/45">Added by {person(e.created_by).short} · {new Date(e.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p>
                      <div className="flex gap-2">
                        {e.lat != null && e.lng != null && <a href={mapsUrl(e.lat, e.lng)} target="_blank" rel="noreferrer" className="rounded-full bg-white/10 px-3 py-1.5">Map</a>}
                        {e.receipt_url && <a href={e.receipt_url} target="_blank" rel="noreferrer" className="rounded-full bg-amber/15 px-3 py-1.5 text-amber">View bill</a>}
                        <button disabled={busy === id} onClick={() => remove(item)} className="rounded-full bg-coral/15 px-3 py-1.5 text-coral">Delete</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.li>
        )];
      })}
    </ul>
  );
}
