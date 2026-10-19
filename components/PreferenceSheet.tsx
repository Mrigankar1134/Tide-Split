"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PEOPLE, person } from "@/lib/people";
import type { PlanRule } from "@/lib/types";
import Sheet from "./Sheet";
import Avatar from "./Avatar";
import { Segmented } from "./ui";

type Direction = "from" | "to"; // from: they shouldn't pay me · to: I shouldn't pay them

export default function PreferenceSheet({ me, open, rules, busy, onClose, onAdd }: {
  me: string;
  open: boolean;
  rules: PlanRule[];
  busy: boolean;
  onClose: () => void;
  onAdd: (from: string, to: string) => Promise<void>;
}) {
  const [dir, setDir] = useState<Direction>("from");
  const [who, setWho] = useState<string | null>(null);
  useEffect(() => { if (open) { setDir("from"); setWho(null); } }, [open]);

  const exists = (id: string) => rules.some((r) => (dir === "from" ? r.from_person === id && r.to_person === me : r.from_person === me && r.to_person === id));

  return (
    <Sheet open={open} onClose={onClose} title="Add a preference">
      <div className="space-y-5 pt-1">
        <Segmented<Direction> layoutKey="prefdir" value={dir} onChange={(d) => { setDir(d); setWho(null); }}
          options={[{ id: "from", label: "Shouldn't pay me" }, { id: "to", label: "I shouldn't pay" }]} />

        <div>
          <p className="mb-3 px-1 text-[13.5px] leading-snug text-white/55">
            {dir === "from"
              ? "Pick who should not be the one paying you. The plan will route their share to someone else, and you'll collect the same amount from others."
              : "Pick who you'd rather not pay. The plan will send your payment to someone else you're square with."}
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {PEOPLE.filter((p) => p.id !== me).map((p) => {
              const on = who === p.id, already = exists(p.id);
              return (
                <motion.button key={p.id} type="button" whileTap={{ scale: 0.95 }} disabled={already} onClick={() => setWho(p.id)}
                  className={`card flex flex-col items-center gap-2 rounded-[20px] px-2 py-3 ${already ? "opacity-40" : ""}`}
                  style={on ? { borderColor: "rgba(94,234,212,0.7)", background: "rgba(94,234,212,0.1)" } : undefined}>
                  <Avatar id={p.id} size={40} ring={on} />
                  <span className="text-[12.5px] leading-tight text-white/85">{p.short}</span>
                  {already && <span className="text-[10.5px] text-white/50">already set</span>}
                </motion.button>
              );
            })}
          </div>
        </div>

        <button type="button" disabled={!who || busy} onClick={() => who && onAdd(dir === "from" ? who : me, dir === "from" ? me : who)}
          className="btn-primary w-full rounded-full py-4 font-display text-[16px] font-semibold">
          {busy ? "Saving…" : who ? (dir === "from" ? `${person(who).short} shouldn't pay me` : `I shouldn't pay ${person(who).short}`) : "Pick a person"}
        </button>
        <p className="px-1 text-center text-[12.5px] text-white/40">Shared with the whole group. Either of you can remove it later.</p>
      </div>
    </Sheet>
  );
}
