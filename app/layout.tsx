import type { Metadata, Viewport } from "next";
import { Sora, DM_Sans } from "next/font/google";
import "./globals.css";
import Background from "@/components/Background";

const sora = Sora({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-display" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Tide Split",
  description: "Shared expenses for the nine of us.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Tide Split" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0F1C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable}`}>
      <body className="font-body text-white antialiased">
        <Background />
        {children}
      </body>
    </html>
  );
}
