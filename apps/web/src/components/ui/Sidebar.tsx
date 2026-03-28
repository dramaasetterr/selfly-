"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const SELLER_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "\u2302" },
  { href: "/dashboard/prep", label: "Prep Your Home", icon: "\u2726" },
  { href: "/dashboard/pricing", label: "Price It", icon: "\u2736" },
  { href: "/dashboard/listing", label: "Create Listing", icon: "\u270E" },
  { href: "/dashboard/showings", label: "Showings", icon: "\u25A3" },
  { href: "/dashboard/offers", label: "Offers", icon: "\u2637" },
  { href: "/dashboard/closing", label: "Closing", icon: "\u2714" },
  { href: "/dashboard/documents", label: "Documents", icon: "\u25C6" },
];

const SECONDARY_NAV = [
  { href: "/dashboard/marketplace", label: "Marketplace", icon: "\u2616" },
  { href: "/dashboard/messages", label: "Messages", icon: "\u2709" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="w-64 bg-white border-r border-gold-muted/30 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gold-muted/20">
        <Link href="/dashboard">
          <Image src="/logo.png" alt="Chiavi" width={200} height={56} className="h-12 w-auto" />
        </Link>
      </div>

      {/* Seller Pipeline */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <p className="px-3 mb-2 text-xs font-semibold text-navy-light/50 uppercase tracking-wider">
          Selling Pipeline
        </p>
        {SELLER_NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition mb-0.5 ${
                active
                  ? "bg-gold-bg text-navy font-semibold"
                  : "text-navy-light hover:bg-cream hover:text-navy"
              }`}
            >
              <span className={`text-lg ${active ? "text-gold" : "text-navy-light/50"}`}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        <div className="my-4 border-t border-gold-muted/20" />

        <p className="px-3 mb-2 text-xs font-semibold text-navy-light/50 uppercase tracking-wider">
          Browse
        </p>
        {SECONDARY_NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition mb-0.5 ${
                active
                  ? "bg-gold-bg text-navy font-semibold"
                  : "text-navy-light hover:bg-cream hover:text-navy"
              }`}
            >
              <span className={`text-lg ${active ? "text-gold" : "text-navy-light/50"}`}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gold-muted/20 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gold-bg flex items-center justify-center text-sm font-semibold text-gold">
            {user?.email?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-navy truncate">
              {user?.user_metadata?.full_name || user?.email || "User"}
            </p>
            <div className="flex gap-3">
              <Link href="/dashboard/profile" className="text-xs text-navy-light hover:text-gold transition">
                Profile
              </Link>
              <button onClick={signOut} className="text-xs text-navy-light hover:text-error transition">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
