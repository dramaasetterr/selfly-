"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface PriceRecommendation {
  label: string;
  price: number;
  reasoning: string;
}

interface Comparable {
  address: string;
  price: number;
  sqft: number;
  beds: number;
  baths: number;
  sold_date: string;
}

interface PricingData {
  address?: string;
  recommendations?: PriceRecommendation[];
  comparables?: Comparable[];
  market_insights?: string[];
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function PricingResultsContent() {
  const searchParams = useSearchParams();
  const rawData = searchParams.get("data");

  let data: PricingData | null = null;
  try {
    data = rawData ? JSON.parse(rawData) : null;
  } catch {
    data = null;
  }

  if (!data || !data.recommendations) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-heading font-bold text-navy text-3xl">Pricing Results</h1>
          <p className="text-navy-light mt-1">No pricing data found.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gold-muted/30 p-8 text-center">
          <p className="text-navy-light mb-4">
            It looks like there are no results to display. Run a new analysis to get started.
          </p>
          <Link
            href="/dashboard/pricing"
            className="inline-block px-6 py-3 bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl transition"
          >
            Run New Analysis
          </Link>
        </div>
      </div>
    );
  }

  const recommendations = data.recommendations;
  const comparables = data.comparables || [];
  const insights = data.market_insights || [];

  // Identify the three tiers
  const sellFast = recommendations.find((r) => r.label.toLowerCase().includes("fast")) || recommendations[0];
  const recommended = recommendations.find(
    (r) => r.label.toLowerCase().includes("recommend")
  ) || recommendations[1] || recommendations[0];
  const maximize = recommendations.find((r) => r.label.toLowerCase().includes("maxim")) || recommendations[2] || recommendations[0];

  const tiers = [
    { ...sellFast, tier: "Sell Fast", accent: "border-blue-300 bg-blue-50/30", highlighted: false },
    { ...recommended, tier: "Recommended", accent: "border-gold bg-gold-bg", highlighted: true },
    { ...maximize, tier: "Maximize", accent: "border-purple-300 bg-purple-50/30", highlighted: false },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-navy text-3xl">Pricing Results</h1>
        {data.address && <p className="text-navy-light mt-1">Analysis for: {data.address}</p>}
      </div>

      {/* Price Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tiers.map((tier, i) => (
          <div
            key={i}
            className={`rounded-2xl border-2 p-6 transition ${tier.accent} ${
              tier.highlighted ? "shadow-lg scale-[1.02]" : ""
            }`}
          >
            {tier.highlighted && (
              <span className="bg-gold-bg text-gold-dark text-xs font-semibold px-2.5 py-0.5 rounded-full mb-3 inline-block">
                Best Value
              </span>
            )}
            <p className="text-sm font-medium text-navy-light mb-1">{tier.tier}</p>
            <p className="text-3xl font-bold text-navy mb-3">{formatCurrency(tier.price)}</p>
            <p className="text-sm text-navy-light leading-relaxed">{tier.reasoning}</p>
          </div>
        ))}
      </div>

      {/* Comparable Properties */}
      {comparables.length > 0 && (
        <div className="bg-white rounded-2xl border border-gold-muted/30 p-6">
          <h2 className="font-heading font-bold text-navy text-lg mb-4">Comparable Properties</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold-muted/20 text-left">
                  <th className="pb-3 font-semibold text-navy">Address</th>
                  <th className="pb-3 font-semibold text-navy">Sale Price</th>
                  <th className="pb-3 font-semibold text-navy">Sqft</th>
                  <th className="pb-3 font-semibold text-navy">Beds/Baths</th>
                  <th className="pb-3 font-semibold text-navy">Sold Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-muted/10">
                {comparables.map((comp, i) => (
                  <tr key={i}>
                    <td className="py-3 text-navy">{comp.address}</td>
                    <td className="py-3 text-navy font-medium">{formatCurrency(comp.price)}</td>
                    <td className="py-3 text-navy-light">{comp.sqft.toLocaleString()}</td>
                    <td className="py-3 text-navy-light">
                      {comp.beds}bd / {comp.baths}ba
                    </td>
                    <td className="py-3 text-navy-light">{comp.sold_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Market Insights */}
      {insights.length > 0 && (
        <div className="bg-gold-bg rounded-2xl border border-gold-muted/30 p-6">
          <h2 className="font-heading font-bold text-navy text-lg mb-4">Market Insights</h2>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-navy-light">
                <span className="text-gold mt-0.5 flex-shrink-0">{"\u2736"}</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Link
          href="/dashboard/pricing"
          className="px-6 py-3 bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl transition"
        >
          Run Another Analysis
        </Link>
        <Link
          href="/dashboard/listing"
          className="px-6 py-3 bg-navy hover:bg-navy-light text-cream rounded-xl font-semibold transition"
        >
          Create Listing
        </Link>
      </div>
    </div>
  );
}

export default function PricingResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-navy-light">Loading results...</div>
        </div>
      }
    >
      <PricingResultsContent />
    </Suspense>
  );
}
