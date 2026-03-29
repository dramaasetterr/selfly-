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
  down_payment_pct: number;
  contingencies: string[];
  closing_date: string;
  status: string;
  listing_id: string;
};

type Analysis = {
  offer_id: string;
  overall_score: number;
};

type Listing = {
  id: string;
  address: string;
};

export default function CompareOffersPage() {
  const { user, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch listings
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchListings() {
      const { data } = await supabase
        .from("listings")
        .select("id, address")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      setListings(data ?? []);
      if (data && data.length > 0) {
        setSelectedListing(data[0].id);
      }
      setLoading(false);
    }

    fetchListings();
  }, [user]);

  // Fetch offers for selected listing
  useEffect(() => {
    if (!selectedListing) return;
    const supabase = createClient();

    async function fetchOffers() {
      setLoading(true);
      setError(null);

      const { data: offersData, error: offersErr } = await supabase
        .from("offers")
        .select("*")
        .eq("listing_id", selectedListing)
        .order("created_at", { ascending: false });

      if (offersErr) {
        setError(offersErr.message);
        setLoading(false);
        return;
      }

      setOffers(offersData ?? []);
      const ids = (offersData ?? []).map((o: Offer) => o.id);
      setSelectedIds(new Set(ids));

      if (ids.length > 0) {
        const { data: analysesData } = await supabase
          .from("offer_analyses")
          .select("offer_id, overall_score")
          .in("offer_id", ids);

        const map: Record<string, Analysis> = {};
        (analysesData ?? []).forEach((a: Analysis) => {
          map[a.offer_id] = a;
        });
        setAnalyses(map);
      }

      setLoading(false);
    }

    fetchOffers();
  }, [selectedListing]);

  function toggleOffer(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const compared = offers.filter((o) => selectedIds.has(o.id));

  // Find best values for highlighting
  function isBest(field: string, value: number | string, offers: Offer[]) {
    if (offers.length < 2) return false;
    if (field === "price") {
      const max = Math.max(...offers.map((o) => o.offer_price));
      return value === max;
    }
    if (field === "down_payment") {
      const max = Math.max(...offers.map((o) => o.down_payment_pct));
      return value === max;
    }
    if (field === "score") {
      const scores = offers.map((o) => analyses[o.id]?.overall_score ?? 0);
      const max = Math.max(...scores);
      return value === max && max > 0;
    }
    if (field === "contingencies") {
      const min = Math.min(...offers.map((o) => o.contingencies?.length ?? 0));
      return value === min;
    }
    return false;
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 bg-gold-bg rounded-xl animate-pulse" />
        <div className="h-96 bg-white rounded-2xl border border-gold-muted/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/offers" className="text-gold-dark hover:text-gold text-sm">
          &larr; Back to Offers
        </Link>
        <h1 className="font-heading font-bold text-navy text-2xl mt-2">Compare Offers</h1>
        <p className="text-navy-light text-sm mt-1">
          Side-by-side comparison of offers on a listing
        </p>
      </div>

      {/* Listing selector */}
      <div>
        <label className="block text-sm font-medium text-navy mb-1.5">Select Listing</label>
        <select
          value={selectedListing}
          onChange={(e) => setSelectedListing(e.target.value)}
          className="border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 px-4 py-2.5 text-navy bg-white outline-none"
        >
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.address}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {offers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gold-muted/30 p-12 text-center">
          <p className="text-navy-light text-lg">No offers on this listing</p>
        </div>
      ) : (
        <>
          {/* Select offers */}
          <div className="bg-white rounded-2xl border border-gold-muted/30 p-4">
            <p className="text-sm font-medium text-navy mb-3">Select Offers to Compare</p>
            <div className="flex flex-wrap gap-3">
              {offers.map((o) => (
                <label
                  key={o.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer border transition text-sm ${
                    selectedIds.has(o.id)
                      ? "border-gold bg-gold-bg text-navy font-medium"
                      : "border-gold-muted/30 text-navy-light hover:border-gold/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(o.id)}
                    onChange={() => toggleOffer(o.id)}
                    className="w-4 h-4 rounded border-gold-muted/50 text-gold focus:ring-gold/40"
                  />
                  {o.buyer_name} &mdash; ${o.offer_price?.toLocaleString()}
                </label>
              ))}
            </div>
          </div>

          {/* Comparison table */}
          {compared.length >= 2 ? (
            <div className="bg-white rounded-2xl border border-gold-muted/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gold-muted/20">
                      <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-navy-light/60 font-medium min-w-[100px] sm:w-40">
                        Criteria
                      </th>
                      {compared.map((o) => (
                        <th key={o.id} className="text-left px-3 sm:px-6 py-3 sm:py-4 text-navy font-semibold text-sm sm:text-base">
                          {o.buyer_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Price */}
                    <tr className="border-b border-gold-muted/10">
                      <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-navy-light/60 font-medium text-xs sm:text-sm">Offer Price</td>
                      {compared.map((o) => (
                        <td
                          key={o.id}
                          className={`px-3 sm:px-6 py-2.5 sm:py-3 font-semibold text-sm ${
                            isBest("price", o.offer_price, compared)
                              ? "text-gold-dark bg-gold-bg/50"
                              : "text-navy"
                          }`}
                        >
                          ${o.offer_price?.toLocaleString()}
                        </td>
                      ))}
                    </tr>

                    {/* Financing */}
                    <tr className="border-b border-gold-muted/10">
                      <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-navy-light/60 font-medium text-xs sm:text-sm">Financing</td>
                      {compared.map((o) => (
                        <td key={o.id} className="px-3 sm:px-6 py-2.5 sm:py-3 text-navy capitalize text-sm">
                          {o.financing_type}
                        </td>
                      ))}
                    </tr>

                    {/* Down Payment */}
                    <tr className="border-b border-gold-muted/10">
                      <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-navy-light/60 font-medium text-xs sm:text-sm">Down Payment</td>
                      {compared.map((o) => (
                        <td
                          key={o.id}
                          className={`px-6 py-3 ${
                            isBest("down_payment", o.down_payment_pct, compared)
                              ? "text-gold-dark font-semibold bg-gold-bg/50"
                              : "text-navy"
                          }`}
                        >
                          {o.down_payment_pct}%
                        </td>
                      ))}
                    </tr>

                    {/* Contingencies */}
                    <tr className="border-b border-gold-muted/10">
                      <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-navy-light/60 font-medium text-xs sm:text-sm">Contingencies</td>
                      {compared.map((o) => (
                        <td
                          key={o.id}
                          className={`px-6 py-3 capitalize ${
                            isBest("contingencies", o.contingencies?.length ?? 0, compared)
                              ? "text-gold-dark font-semibold bg-gold-bg/50"
                              : "text-navy"
                          }`}
                        >
                          {o.contingencies?.length > 0
                            ? o.contingencies.join(", ")
                            : "None"}
                        </td>
                      ))}
                    </tr>

                    {/* Closing Date */}
                    <tr className="border-b border-gold-muted/10">
                      <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-navy-light/60 font-medium text-xs sm:text-sm">Closing Date</td>
                      {compared.map((o) => (
                        <td key={o.id} className="px-3 sm:px-6 py-2.5 sm:py-3 text-navy text-sm">
                          {o.closing_date
                            ? new Date(o.closing_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "TBD"}
                        </td>
                      ))}
                    </tr>

                    {/* AI Score */}
                    <tr>
                      <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-navy-light/60 font-medium text-xs sm:text-sm">AI Score</td>
                      {compared.map((o) => {
                        const score = analyses[o.id]?.overall_score;
                        return (
                          <td
                            key={o.id}
                            className={`px-6 py-3 font-bold text-lg ${
                              score && isBest("score", score, compared)
                                ? "text-gold-dark bg-gold-bg/50"
                                : "text-navy"
                            }`}
                          >
                            {score ? `${score}/10` : "N/A"}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Status */}
                    <tr className="border-t border-gold-muted/20">
                      <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-navy-light/60 font-medium text-xs sm:text-sm">Status</td>
                      {compared.map((o) => (
                        <td key={o.id} className="px-6 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              o.status === "accepted"
                                ? "bg-green-100 text-green-800"
                                : o.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : o.status === "countered"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-cream-light rounded-2xl p-8 text-center">
              <p className="text-navy-light">Select at least 2 offers to compare</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
