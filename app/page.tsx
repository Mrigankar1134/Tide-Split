"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Onboarding from "@/components/Onboarding";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [me, setMe] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" }).then((r) => r.json()).then((j) => setMe(j.me ?? null)).catch(() => setMe(null));
  }, []);

  const logout = useCallback(async () => {
    try { await fetch("/api/logout", { method: "POST" }); } catch {}
    setMe(null);
  }, []);

  if (me === undefined) return <div className="grid min-h-[100dvh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-amber" /></div>;

  return (
    <AnimatePresence mode="wait">
      {me ? (
        <motion.div key="dash" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
          <Dashboard me={me} onLogout={logout} />
        </motion.div>
      ) : (
        <motion.div key="onb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.3 }}>
          <Onboarding onLogin={setMe} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
