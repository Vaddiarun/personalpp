import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvestigateX",
  description: "Consent-based location request tool",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
