"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Expense, Ledger, Settlement } from "@/lib/types";
import { categoryGlyph, person } from "@/lib/people";
import { inr } from "@/lib/split";
import { mapsUrl } from "@/lib/geo";
import type { Toast } from "./Dashboard";
import Avatar from "./Avatar";
import { Empty, Skeleton } from "./ui";

type Item = { kind: "expense"; at: string; e: Expense } | { kind: "settlement"; at: string; s: Settlement };

const dayLabel = (iso: string) => {
  const d = new Date(iso), now = new Date();
  const diff = Math.round((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
};
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

const Chip = ({ id, amount }: { id: string; amount: number }) => (
  <span className="pill flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[12.5px]">
    <Avatar id={id} size={20} />{person(id).short} <b className="money font-semibold">{inr(amount)}</b>
  </span>
);

export default function Activity({ me, ledger, onChanged, notify }: { me: string; ledger: Ledger | null; onChanged: () => void; notify: (t: Toast) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (!ledger) return <Skeleton rows={4} height={76} />;

  const items: Item[] = [
    ...ledger.expenses.map((e) => ({ kind: "expense" as const, at: e.created_at, e })),
    ...ledger.settlements.map((s) => ({ kind: "settlement" as const, at: s.created_at, s })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  if (items.length === 0) return <Empty glyph="🧾" title="No activity yet" body="Tap the plus button to log the first expense." />;

  const remove = async (item: Item) => {
    const id = item.kind === "expense" ? item.e.id : item.s.id;
    if (!confirm("Delete this? Balances will change for everyone.")) return;
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

  // Group by day so each day reads as one card.
  const days: { label: string; items: Item[] }[] = [];
  for (const it of items) {
    const label = dayLabel(it.at);
    if (days.length === 0 || days[days.length - 1].label !== label) days.push({ label, items: [] });
    days[days.length - 1].items.push(it);
  }

  return (
    <div className="space-y-5">
      {days.map((day) => (
        <section key={day.label}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h3 className="font-display text-[15px] font-semibold tracking-tight text-white/85">{day.label}</h3>
            <span className="money text-[12.5px] text-white/45">{inr(day.items.reduce((s, it) => s + (it.kind === "expense" ? it.e.amount : 0), 0))}</span>
          </div>
          <ul className="card divide-y divide-white/[0.07] overflow-hidden rounded-card">
            {day.items.map((item) => {
              const id = item.kind === "expense" ? item.e.id : item.s.id;
              const open = openId === id;

              if (item.kind === "settlement") {
                const { s } = item;
                const mine = s.from_person === me || s.to_person === me;
                return (
                  <li key={id}>
                    <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpenId(open ? null : id)} aria-expanded={open}>
                      <div className="relative flex shrink-0 items-center">
                        <Avatar id={s.from_person} size={34} />
                        <Avatar id={s.to_person} size={34} className="-ml-2.5 ring-2 ring-[#0E1527]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] leading-tight">
                          <span className={mine ? "font-semibold" : "font-medium"}>{s.from_person === me ? "You" : person(s.from_person).short}</span>
                          <span className="text-white/50"> paid </span>
                          <span className={mine ? "font-semibold" : "font-medium"}>{s.to_person === me ? "you" : person(s.to_person).short}</span>
                        </p>
                        <p className="truncate text-[12.5px] text-white/50">{[timeLabel(s.created_at), s.note, s.place].filter(Boolean).join(" — ")}</p>
                      </div>
                      <span className="money text-[15px] font-semibold text-tide">{inr(s.amount)}</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                          <div className="flex justify-end gap-2 px-4 pb-3 text-[13px]">
                            {s.lat != null && s.lng != null && <a href={mapsUrl(s.lat, s.lng)} target="_blank" rel="noreferrer" className="btn-ghost rounded-full px-3 py-1.5">Map</a>}
                            <button disabled={busy === id} onClick={() => remove(item)} className="rounded-full bg-coral/15 px-3 py-1.5 text-coral">Delete</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              }

              const { e } = item;
              const myShare = e.shares.find((x) => x.person_id === me)?.amount ?? 0;
              const paidByMe = e.payers.find((x) => x.person_id === me)?.amount ?? 0;
              const delta = paidByMe - myShare;
              const payerLabel = e.payers.length === 1 ? (e.payers[0].person_id === me ? "You paid" : `${person(e.payers[0].person_id).short} paid`) : `${e.payers.length} people paid`;
              return (
                <li key={id}>
                  <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left" onClick={() => setOpenId(open ? null : id)} aria-expanded={open}>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.08] text-xl">{categoryGlyph(e.category)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium leading-tight">{e.description}</p>
                      <p className="truncate text-[12.5px] text-white/50">{payerLabel} <span className="money">{inr(e.amount)}</span>{e.receipt_key ? " 🧾" : ""}{e.place ? ` — ${e.place}` : ""}</p>
                    </div>
                    <div className="text-right">
                      {myShare > 0 || paidByMe > 0 ? (
                        <>
                          <p className={`money text-[14.5px] font-semibold ${delta >= 0 ? "text-mint" : "text-coral"}`}>{delta >= 0 ? "+" : "−"}{inr(Math.abs(delta))}</p>
                          <p className="text-[11px] text-white/45">{delta >= 0 ? "you lent" : "your share"}</p>
                        </>
                      ) : <p className="text-[12px] text-white/40">not in this</p>}
                    </div>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                        <div className="space-y-3 border-t border-white/[0.07] px-4 py-3 text-[13px]">
                          <div>
                            <p className="mb-1.5 text-white/50">Paid by</p>
                            <div className="flex flex-wrap gap-1.5">{e.payers.map((x) => <Chip key={x.person_id} id={x.person_id} amount={x.amount} />)}</div>
                          </div>
                          <div>
                            <p className="mb-1.5 text-white/50">Split between</p>
                            <div className="flex flex-wrap gap-1.5">{e.shares.map((x) => <Chip key={x.person_id} id={x.person_id} amount={x.amount} />)}</div>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <p className="text-white/45">Added by {person(e.created_by).short} at {timeLabel(e.created_at)}</p>
                            <div className="flex gap-2">
                              {e.lat != null && e.lng != null && <a href={mapsUrl(e.lat, e.lng)} target="_blank" rel="noreferrer" className="btn-ghost rounded-full px-3 py-1.5">Map</a>}
                              {e.receipt_url && <a href={e.receipt_url} target="_blank" rel="noreferrer" className="rounded-full bg-amber/15 px-3 py-1.5 text-amber">Bill</a>}
                              <button disabled={busy === id} onClick={() => remove(item)} className="rounded-full bg-coral/15 px-3 py-1.5 text-coral">Delete</button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
