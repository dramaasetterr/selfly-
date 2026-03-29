"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const SELLER_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "\u2302" },
  { href: "/prep", label: "Prep Your Home", icon: "\u2726" },
  { href: "/pricing", label: "Price It", icon: "\u2736" },
  { href: "/listing", label: "Create Listing", icon: "\u270E" },
  { href: "/showings", label: "Showings", icon: "\u25A3" },
  { href: "/offers", label: "Offers", icon: "\u2637" },
  { href: "/closing", label: "Closing", icon: "\u2714" },
  { href: "/documents", label: "Documents", icon: "\u25C6" },
];

const SECONDARY_NAV = [
  { href: "/marketplace", label: "Marketplace", icon: "\u2616" },
  { href: "/messages", label: "Messages", icon: "\u2709" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
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
              onClick={() => setMobileOpen(false)}
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
              onClick={() => setMobileOpen(false)}
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
              <Link href="/profile" onClick={() => setMobileOpen(false)} className="text-xs text-navy-light hover:text-gold transition">
                Profile
              </Link>
              <button onClick={signOut} className="text-xs text-navy-light hover:text-error transition">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gold-muted/30 flex items-center justify-between px-4 py-3">
        <Link href="/dashboard">
          <Image src="/logo.png" alt="Chiavi" width={140} height={40} className="h-9 w-auto" />
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-cream transition"
        >
          {mobileOpen ? (
            <svg className="w-6 h-6 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 w-72 bg-white h-screen flex flex-col transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 py-5 border-b border-gold-muted/20 flex items-center justify-between">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
            <Image src="/logo.png" alt="Chiavi" width={160} height={44} className="h-10 w-auto" />
          </Link>
          <button onClick={() => setMobileOpen(false)} className="p-1">
            <svg className="w-5 h-5 text-navy-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gold-muted/30 flex-col h-screen sticky top-0">
        <div className="px-6 py-5 border-b border-gold-muted/20">
          <Link href="/dashboard">
            <Image src="/logo.png" alt="Chiavi" width={200} height={56} className="h-12 w-auto" />
          </Link>
        </div>
        {navContent}
      </aside>
    </>
  );
}
