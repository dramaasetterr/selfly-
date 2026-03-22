import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Selfly - Sell Your Home Without a Realtor",
  description:
    "The AI-powered For Sale By Owner platform. Save thousands in commission with smart pricing, document generation, offer analysis, and more.",
  openGraph: {
    title: "Selfly - Sell Your Home Without a Realtor",
    description:
      "Save up to $21,000 on a $350K home. AI-powered FSBO tools: pricing, documents, offer analysis, showing management, and closing guidance.",
    type: "website",
    siteName: "Selfly",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Selfly - Sell Your Home Without a Realtor",
    description:
      "Save up to $21,000 on a $350K home. AI-powered FSBO tools for pricing, documents, offers, and more.",
  },
  keywords: [
    "FSBO",
    "For Sale By Owner",
    "sell home without realtor",
    "AI real estate",
    "home selling app",
    "save commission",
    "listing tools",
  ],
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
