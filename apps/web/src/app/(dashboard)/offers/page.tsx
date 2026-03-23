"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Offer = {
  id: string;
  buyer_name: string;
  offer_price: number;
  listing_address: string;
  financing_type: string;
  status: "pending" | "accepted" | "rejected" | "countered";
  created_at: string;
  listing_id: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  countered: "bg-blue-100 text-blue-800",
};

const TABS = ["All", "Pending", "Accepted", "Rejected"] as const;

export default function OffersPage() {
  const { user, loading: authLoading } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("All");

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchOffers() {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("offers")
        .select("*")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });

      if (err) {
        setError(err.message);
      } else {
        setOffers(data ?? []);
      }
      setLoading(false);
    }

    fetchOffers();
  }, [user]);

  const filtered =
    activeTab === "All"
      ? offers
      : offers.filter((o) => o.status === activeTab.toLowerCase());

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-gold-bg rounded-xl animate-pulse" />
        <div className="h-6 w-72 bg-gold-bg rounded-xl animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-white rounded-2xl border border-gold-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-navy text-2xl">Offers</h1>
          <p className="text-navy-light text-sm mt-1">
            Review and manage offers on your listings
          </p>
        </div>
        <Link
          href="/dashboard/offers/new"
          className="bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-5 py-2.5 text-sm transition"
        >
          + New Offer
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-cream-light rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === tab
                ? "bg-white text-navy shadow-sm"
                : "text-navy-light hover:text-navy"
            }`}
          >
            {tab}
            {tab !== "All" && (
              <span className="ml-1.5 text-xs opacity-60">
                ({offers.filter((o) => o.status === tab.toLowerCase()).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Offers list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gold-muted/30 p-12 text-center">
          <p className="text-navy-light text-lg">No offers yet</p>
          <p className="text-navy-light/60 text-sm mt-1">
            Offers on your listings will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((offer) => (
            <Link
              key={offer.id}
              href={`/dashboard/offers/${offer.id}`}
              className="block bg-white rounded-2xl border border-gold-muted/30 p-6 hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-heading font-bold text-navy text-lg group-hover:text-gold-dark transition">
                    ${offer.offer_price?.toLocaleString()}
                  </p>
                  <p className="text-navy-light text-sm">{offer.listing_address}</p>
                  <p className="text-navy-light/70 text-sm">
                    From: <span className="font-medium text-navy">{offer.buyer_name}</span>
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                      STATUS_STYLES[offer.status] || STATUS_STYLES.pending
                    }`}
                  >
                    {offer.status}
                  </span>
                  <p className="text-navy-light/50 text-xs">
                    {new Date(offer.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-navy-light/70">
                <span className="bg-cream-light px-2 py-1 rounded-lg capitalize">
                  {offer.financing_type}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Compare link */}
      {offers.length >= 2 && (
        <div className="text-center">
          <Link
            href="/dashboard/offers/compare"
            className="text-gold-dark hover:text-gold font-medium text-sm transition"
          >
            Compare Offers Side-by-Side &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
