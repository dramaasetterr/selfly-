"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Listing = {
  id: string;
  address: string;
};

const FINANCING_TYPES = ["cash", "conventional", "FHA", "VA"] as const;

export default function NewOfferPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    listing_id: "",
    offer_price: "",
    financing_type: "conventional",
    down_payment_pct: "",
    inspection_contingency: true,
    appraisal_contingency: true,
    closing_date: "",
    buyer_notes: "",
  });

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
      setLoading(false);
    }

    fetchListings();
  }, [user]);

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      const contingencies: string[] = [];
      if (form.inspection_contingency) contingencies.push("inspection");
      if (form.appraisal_contingency) contingencies.push("appraisal");

      const offerData = {
        listing_id: form.listing_id,
        seller_id: user.id,
        offer_price: parseFloat(form.offer_price),
        financing_type: form.financing_type,
        down_payment_pct: parseFloat(form.down_payment_pct) || 0,
        contingencies,
        closing_date: form.closing_date,
        buyer_notes: form.buyer_notes,
        status: "pending",
      };

      const { data: offer, error: insertErr } = await supabase
        .from("offers")
        .insert(offerData)
        .select()
        .single();

      if (insertErr) throw new Error(insertErr.message);

      // Call AI analysis API
      try {
        await fetch("/api/offers/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offer_id: offer.id }),
        });
      } catch {
        // Analysis failure is non-blocking
        console.warn("AI analysis request failed");
      }

      router.push(`/dashboard/offers/${offer.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit offer");
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-gold-bg rounded-xl animate-pulse" />
        <div className="h-96 bg-white rounded-2xl border border-gold-muted/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading font-bold text-navy text-2xl">Submit New Offer</h1>
        <p className="text-navy-light text-sm mt-1">
          Enter the offer details and get AI-powered analysis
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-5">
        {/* Listing selector */}
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Listing</label>
          <select
            required
            value={form.listing_id}
            onChange={(e) => updateField("listing_id", e.target.value)}
            className="w-full border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 px-4 py-2.5 text-navy bg-white outline-none"
          >
            <option value="">Select a listing...</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.address}
              </option>
            ))}
          </select>
        </div>

        {/* Offer price */}
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Offer Price ($)</label>
          <input
            type="number"
            required
            min="0"
            step="1000"
            placeholder="350000"
            value={form.offer_price}
            onChange={(e) => updateField("offer_price", e.target.value)}
            className="w-full border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 px-4 py-2.5 text-navy outline-none"
          />
        </div>

        {/* Financing type */}
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Financing Type</label>
          <select
            value={form.financing_type}
            onChange={(e) => updateField("financing_type", e.target.value)}
            className="w-full border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 px-4 py-2.5 text-navy bg-white outline-none"
          >
            {FINANCING_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Down payment */}
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Down Payment (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            placeholder="20"
            value={form.down_payment_pct}
            onChange={(e) => updateField("down_payment_pct", e.target.value)}
            className="w-full border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 px-4 py-2.5 text-navy outline-none"
          />
        </div>

        {/* Contingencies */}
        <div>
          <label className="block text-sm font-medium text-navy mb-2">Contingencies</label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-navy-light cursor-pointer">
              <input
                type="checkbox"
                checked={form.inspection_contingency}
                onChange={(e) => updateField("inspection_contingency", e.target.checked)}
                className="w-4 h-4 rounded border-gold-muted/50 text-gold focus:ring-gold/40"
              />
              Inspection
            </label>
            <label className="flex items-center gap-2 text-sm text-navy-light cursor-pointer">
              <input
                type="checkbox"
                checked={form.appraisal_contingency}
                onChange={(e) => updateField("appraisal_contingency", e.target.checked)}
                className="w-4 h-4 rounded border-gold-muted/50 text-gold focus:ring-gold/40"
              />
              Appraisal
            </label>
          </div>
        </div>

        {/* Closing date */}
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Closing Date</label>
          <input
            type="date"
            required
            value={form.closing_date}
            onChange={(e) => updateField("closing_date", e.target.value)}
            className="w-full border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 px-4 py-2.5 text-navy outline-none"
          />
        </div>

        {/* Buyer notes */}
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Buyer Notes</label>
          <textarea
            rows={3}
            placeholder="Any additional notes or terms..."
            value={form.buyer_notes}
            onChange={(e) => updateField("buyer_notes", e.target.value)}
            className="w-full border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 px-4 py-2.5 text-navy outline-none resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-6 py-2.5 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Offer & Analyze"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-cream hover:bg-cream-light text-navy-light rounded-xl px-6 py-2.5 text-sm transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
