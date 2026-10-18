import { person } from "@/lib/people";

export default function Avatar({ id, size = 40, ring = false, className = "" }: { id: string; size?: number; ring?: boolean; className?: string }) {
  const p = person(id);
  return (
    <div
      className={`relative grid shrink-0 select-none place-items-center rounded-full font-display font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        letterSpacing: "-0.02em",
        background: `linear-gradient(145deg, hsl(${p.hue} 62% 56%), hsl(${p.hue + 28} 64% 38%))`,
        boxShadow: ring
          ? `0 0 0 2px #070B16, 0 0 0 4px hsl(${p.hue} 80% 65%), 0 8px 20px hsl(${p.hue} 70% 40% / 0.55)`
          : `inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 12px hsl(${p.hue} 70% 30% / 0.4)`,
      }}
      aria-label={p.name}
      title={p.name}
    >
      {p.initials}
    </div>
  );
}
