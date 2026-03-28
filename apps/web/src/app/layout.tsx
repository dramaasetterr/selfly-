export const dynamic = 'force-dynamic';
import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chiavi - Sell Your Home Without a Realtor",
  description:
    "The AI-powered For Sale By Owner platform. Save thousands in commission with smart pricing, document generation, offer analysis, and more.",
  openGraph: {
    title: "Chiavi - Sell Your Home Without a Realtor",
    description:
      "Save up to $21,000 on a $350K home. AI-powered FSBO tools: pricing, documents, offer analysis, showing management, and closing guidance.",
    type: "website",
    siteName: "Chiavi",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chiavi - Sell Your Home Without a Realtor",
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
    <html lang="en" className={`scroll-smooth ${playfair.variable} ${inter.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
