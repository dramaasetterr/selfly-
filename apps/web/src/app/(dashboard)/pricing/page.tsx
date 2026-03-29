"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const PROPERTY_TYPES = [
  { value: "single_family", label: "Single Family Home" },
  { value: "condo", label: "Condo / Townhouse" },
  { value: "multi_family", label: "Multi-Family" },
  { value: "land", label: "Vacant Land" },
  { value: "mobile", label: "Mobile / Manufactured" },
  { value: "other", label: "Other" },
];

const CONDITIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "needs_work", label: "Needs Work" },
];

const FEATURES = [
  "Pool",
  "Garage",
  "Finished Basement",
  "Fireplace",
  "Updated Kitchen",
  "Updated Bathrooms",
  "Hardwood Floors",
  "Central AC",
  "Solar Panels",
  "Smart Home",
  "Large Lot",
  "Waterfront",
  "Corner Lot",
  "Open Floor Plan",
  "New Roof",
  "EV Charging",
];

interface FormData {
  address: string;
  property_type: string;
  bedrooms: string;
  bathrooms: string;
  sqft: string;
  year_built: string;
  condition: string;
  features: string[];
}

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    address: "",
    property_type: "single_family",
    bedrooms: "",
    bathrooms: "",
    sqft: "",
    year_built: "",
    condition: "good",
    features: [],
  });

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFeature = (feature: string) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.address.trim()) {
      setError("Please enter a property address.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form.address,
          property_type: form.property_type,
          bedrooms: parseInt(form.bedrooms) || 0,
          bathrooms: parseFloat(form.bathrooms) || 0,
          sqft: parseInt(form.sqft) || 0,
          year_built: parseInt(form.year_built) || 0,
          condition: form.condition,
          features: form.features,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Request failed with status ${res.status}`);
      }

      const data = await res.json();

      const params = new URLSearchParams({
        data: JSON.stringify(data),
      });

      router.push(`/dashboard/pricing/results?${params.toString()}`);
    } catch (err: any) {
      setError(err.message || "Failed to get pricing. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-navy-light">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-navy text-2xl sm:text-3xl">AI Pricing Analysis</h1>
        <p className="text-navy-light mt-1">
          Enter your property details and our AI will analyze market data to recommend the best price.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-error rounded-2xl p-4 border border-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Address */}
        <div className="bg-white rounded-2xl border border-gold-muted/30 p-6">
          <h2 className="font-heading font-bold text-navy text-lg mb-4">Property Address</h2>
          <input
            type="text"
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="Enter full address (e.g., 123 Main St, Austin, TX 78701)"
            className="w-full px-4 py-3 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none text-navy placeholder:text-navy-light/40"
          />
        </div>

        {/* Property Details */}
        <div className="bg-white rounded-2xl border border-gold-muted/30 p-6">
          <h2 className="font-heading font-bold text-navy text-lg mb-4">Property Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1.5">Property Type</label>
              <select
                value={form.property_type}
                onChange={(e) => updateField("property_type", e.target.value)}
                className="w-full px-4 py-3 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none text-navy bg-white"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-1.5">Condition</label>
              <select
                value={form.condition}
                onChange={(e) => updateField("condition", e.target.value)}
                className="w-full px-4 py-3 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none text-navy bg-white"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-1.5">Bedrooms</label>
              <input
                type="number"
                min="0"
                max="20"
                value={form.bedrooms}
                onChange={(e) => updateField("bedrooms", e.target.value)}
                placeholder="e.g., 3"
                className="w-full px-4 py-3 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none text-navy placeholder:text-navy-light/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-1.5">Bathrooms</label>
              <input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={form.bathrooms}
                onChange={(e) => updateField("bathrooms", e.target.value)}
                placeholder="e.g., 2.5"
                className="w-full px-4 py-3 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none text-navy placeholder:text-navy-light/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-1.5">Square Footage</label>
              <input
                type="number"
                min="0"
                value={form.sqft}
                onChange={(e) => updateField("sqft", e.target.value)}
                placeholder="e.g., 2000"
                className="w-full px-4 py-3 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none text-navy placeholder:text-navy-light/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-1.5">Year Built</label>
              <input
                type="number"
                min="1800"
                max="2026"
                value={form.year_built}
                onChange={(e) => updateField("year_built", e.target.value)}
                placeholder="e.g., 1995"
                className="w-full px-4 py-3 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none text-navy placeholder:text-navy-light/40"
              />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl border border-gold-muted/30 p-6">
          <h2 className="font-heading font-bold text-navy text-lg mb-4">Features</h2>
          <p className="text-sm text-navy-light mb-3">Select all that apply to your property.</p>
          <div className="flex flex-wrap gap-2">
            {FEATURES.map((feature) => {
              const selected = form.features.includes(feature);
              return (
                <button
                  key={feature}
                  type="button"
                  onClick={() => toggleFeature(feature)}
                  className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition border ${
                    selected
                      ? "bg-gold text-navy border-gold"
                      : "bg-cream-light text-navy-light border-gold-muted/30 hover:border-gold-muted/50"
                  }`}
                >
                  {selected && (
                    <span className="mr-1">{"\u2713"}</span>
                  )}
                  {feature}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Analyzing..." : "Get AI Price Recommendation"}
        </button>
      </form>
    </div>
  );
}
