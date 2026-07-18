import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CustomerPulse AI — AVO Retention Intelligence",
  description:
    "Explainable, governed customer retention and marketing intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
