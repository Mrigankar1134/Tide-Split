export default function Wave({ color }: { color: string }) {
  const d = "M0 40 C 60 10, 120 70, 180 40 S 300 10, 360 40 S 480 70, 540 40 S 660 10, 720 40 V 120 H 0 Z";
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[92px] overflow-hidden" aria-hidden>
      <svg className="tide absolute bottom-0 left-0 h-full w-[200%]" viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ color }}>
        <path d={d + " M720 40 C 780 10, 840 70, 900 40 S 1020 10, 1080 40 S 1200 70, 1260 40 S 1380 10, 1440 40 V 120 H 720 Z"} fill="currentColor" opacity="0.18" />
      </svg>
      <svg className="tide tide-slow absolute bottom-0 left-0 h-full w-[200%]" viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ color }}>
        <path d="M0 60 C 90 30, 180 90, 270 60 S 450 30, 540 60 S 720 90, 810 60 S 990 30, 1080 60 S 1260 90, 1350 60 S 1440 45, 1440 60 V 120 H 0 Z" fill="currentColor" opacity="0.28" />
      </svg>
    </div>
  );
}
