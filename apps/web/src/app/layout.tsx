import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Selfly - For Sale By Owner",
  description: "List and sell your property directly, no agent needed.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
