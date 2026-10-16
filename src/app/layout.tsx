import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mahj Crew — Good company. Great hands.",
  description:
    "A little competition. A lot of connection. A Mahjong Crew design prototype with synthetic players and games.",
  robots: { index: false, follow: false },
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
