"use client";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { useEffect } from "react";

export default function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const drag = useDragControls();
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            aria-label="Close"
            className="fixed inset-0 z-40 bg-[#05080F]/60"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog" aria-modal aria-label={title}
            className="glass-strong fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[28px]"
            style={{ paddingBottom: "var(--sab)" }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y" dragControls={drag} dragListener={false} dragConstraints={{ top: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose(); }}
          >
            <div className="cursor-grab touch-none px-6 pt-3 pb-1" onPointerDown={(e) => drag.start(e)}>
              <div className="mx-auto h-1.5 w-12 rounded-full bg-white/25" />
              <h2 className="mt-3 font-display text-[22px] font-semibold tracking-tight">{title}</h2>
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
