import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0F1C",
        amber: "#F5B942",
        mint: "#57D9A3",
        coral: "#FF7A6B",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(3, 8, 20, 0.45), inset 0 1px 0 rgba(255,255,255,0.14)",
        glow: "0 0 40px rgba(245,185,66,0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
