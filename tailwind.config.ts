import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#070B16",
        deep: "#0E1527",
        tide: "#5EEAD4",
        amber: "#F5B942",
        mint: "#4ADE9A",
        coral: "#FF7B6B",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "26px",
        row: "18px",
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 50px -20px rgba(0,0,0,0.6)",
        glow: "0 10px 30px -8px rgba(245,185,66,0.55)",
        nav: "0 -1px 0 rgba(255,255,255,0.06) inset, 0 -20px 50px -10px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
