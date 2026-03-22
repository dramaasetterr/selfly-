import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Selfly - Sell Your Home Without an Agent",
  description:
    "The AI-powered For Sale By Owner platform. Save thousands in commission with smart pricing, document generation, offer analysis, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased">{children}</body>
    </html>
  );
}
