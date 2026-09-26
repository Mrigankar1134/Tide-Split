import { person } from "@/lib/people";

export default function Avatar({ id, size = 40, ring = false }: { id: string; size?: number; ring?: boolean }) {
  const p = person(id);
  return (
    <div
      className="relative shrink-0 rounded-full grid place-items-center font-display font-semibold text-white select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(145deg, hsl(${p.hue} 70% 58%), hsl(${p.hue + 28} 70% 40%))`,
        boxShadow: ring
          ? `0 0 0 2px #0A0F1C, 0 0 0 4px hsl(${p.hue} 80% 65%), 0 6px 18px hsl(${p.hue} 70% 40% / 0.6)`
          : `inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 12px hsl(${p.hue} 70% 30% / 0.45)`,
      }}
      aria-label={p.name}
    >
      {p.initials}
    </div>
  );
}
