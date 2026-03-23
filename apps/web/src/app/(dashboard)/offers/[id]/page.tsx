"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  buyer_notes: string;
  status: string;
  created_at: string;
  listing_id: string;
};

type Analysis = {
  id: string;
  overall_score: number;
  strengths: string[];
  red_flags: string[];
  recommendation: string;
  suggested_counter_price: number | null;
  suggested_counter_terms: string | null;
};

function scoreColor(score: number) {
  if (score >= 8) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 5) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  return "text-red-600 bg-red-50 border-red-200";
}

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    const supabase = createClient();

    async function fetchData() {
      setLoading(true);
      const [offerRes, analysisRes] = await Promise.all([
        supabase.from("offers").select("*").eq("id", id).single(),
        supabase.from("offer_analyses").select("*").eq("offer_id", id).single(),
      ]);

      if (offerRes.error) {
        setError(offerRes.error.message);
      } else {
        setOffer(offerRes.data);
      }

      if (!analysisRes.error) {
        setAnalysis(analysisRes.data);
      }

      setLoading(false);
    }

    fetchData();
  }, [user, id]);

  async function handleAction(action: "accepted" | "rejected" | "countered") {
    if (!offer) return;
    setActionLoading(action);

    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("offers")
        .update({ status: action })
        .eq("id", offer.id);

      if (err) throw new Error(err.message);
      setOffer((prev) => (prev ? { ...prev, status: action } : prev));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-gold-bg rounded-xl animate-pulse" />
        <div className="h-64 bg-white rounded-2xl border border-gold-muted/30 animate-pulse" />
        <div className="h-48 bg-white rounded-2xl border border-gold-muted/30 animate-pulse" />
      </div>
    );
  }

  if (error && !offer) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/offers" className="text-gold-dark hover:text-gold text-sm">&larr; Back to Offers</Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">{error}</div>
      </div>
    );
  }

  if (!offer) return null;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/offers" className="text-gold-dark hover:text-gold text-sm inline-block">
        &larr; Back to Offers
      </Link>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {/* Offer Details Card */}
      <div className="bg-white rounded-2xl border border-gold-muted/30 p-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="font-heading font-bold text-navy text-2xl">
            ${offer.offer_price?.toLocaleString()}
          </h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
              offer.status === "accepted"
                ? "bg-green-100 text-green-800"
                : offer.status === "rejected"
                ? "bg-red-100 text-red-800"
                : offer.status === "countered"
                ? "bg-blue-100 text-blue-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {offer.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-navy-light/60 mb-0.5">Property</p>
            <p className="text-navy font-medium">{offer.listing_address}</p>
          </div>
          <div>
            <p className="text-navy-light/60 mb-0.5">Buyer</p>
            <p className="text-navy font-medium">{offer.buyer_name}</p>
          </div>
          <div>
            <p className="text-navy-light/60 mb-0.5">Financing</p>
            <p className="text-navy font-medium capitalize">{offer.financing_type}</p>
          </div>
          <div>
            <p className="text-navy-light/60 mb-0.5">Down Payment</p>
            <p className="text-navy font-medium">{offer.down_payment_pct}%</p>
          </div>
          <div>
            <p className="text-navy-light/60 mb-0.5">Contingencies</p>
            <p className="text-navy font-medium capitalize">
              {offer.contingencies?.length > 0
                ? offer.contingencies.join(", ")
                : "None"}
            </p>
          </div>
          <div>
            <p className="text-navy-light/60 mb-0.5">Closing Date</p>
            <p className="text-navy font-medium">
              {offer.closing_date
                ? new Date(offer.closing_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Not specified"}
            </p>
          </div>
        </div>

        {offer.buyer_notes && (
          <div className="mt-4 pt-4 border-t border-gold-muted/20">
            <p className="text-navy-light/60 text-sm mb-1">Buyer Notes</p>
            <p className="text-navy text-sm">{offer.buyer_notes}</p>
          </div>
        )}

        <p className="text-navy-light/40 text-xs mt-4">
          Submitted{" "}
          {new Date(offer.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>

      {/* AI Analysis Section */}
      {analysis ? (
        <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-navy text-lg">AI Analysis</h2>
            <div
              className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-xl font-bold ${scoreColor(
                analysis.overall_score
              )}`}
            >
              {analysis.overall_score}
            </div>
          </div>

          {/* Strengths */}
          {analysis.strengths?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-2">Strengths</h3>
              <ul className="space-y-1.5">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-navy">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Red Flags */}
          {analysis.red_flags?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-2">Red Flags</h3>
              <ul className="space-y-1.5">
                {analysis.red_flags.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-navy">
                    <span className="text-red-500 mt-0.5">&#9888;</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendation */}
          <div className="bg-cream-light rounded-xl p-4">
            <h3 className="text-sm font-semibold text-navy mb-1">Recommendation</h3>
            <p className="text-sm text-navy-light">{analysis.recommendation}</p>
          </div>

          {/* Suggested Counter */}
          {analysis.suggested_counter_price && (
            <div className="bg-gold-bg rounded-xl p-4">
              <h3 className="text-sm font-semibold text-navy mb-1">Suggested Counter-Offer</h3>
              <p className="text-lg font-bold text-gold-dark">
                ${analysis.suggested_counter_price.toLocaleString()}
              </p>
              {analysis.suggested_counter_terms && (
                <p className="text-sm text-navy-light mt-1">{analysis.suggested_counter_terms}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gold-muted/30 p-8 text-center">
          <p className="text-navy-light">AI analysis is being generated...</p>
          <p className="text-navy-light/50 text-sm mt-1">
            Refresh the page in a moment to see results
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {offer.status === "pending" && (
        <div className="flex gap-3">
          <button
            onClick={() => handleAction("accepted")}
            disabled={!!actionLoading}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl px-6 py-2.5 text-sm transition disabled:opacity-50"
          >
            {actionLoading === "accepted" ? "Accepting..." : "Accept Offer"}
          </button>
          <button
            onClick={() => handleAction("countered")}
            disabled={!!actionLoading}
            className="bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-6 py-2.5 text-sm transition disabled:opacity-50"
          >
            {actionLoading === "countered" ? "Countering..." : "Counter Offer"}
          </button>
          <button
            onClick={() => handleAction("rejected")}
            disabled={!!actionLoading}
            className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl px-6 py-2.5 text-sm transition disabled:opacity-50"
          >
            {actionLoading === "rejected" ? "Rejecting..." : "Reject Offer"}
          </button>
        </div>
      )}
    </div>
  );
}
