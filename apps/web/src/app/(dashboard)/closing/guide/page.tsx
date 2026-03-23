"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

const ALL_STEPS = [
  "Title search & insurance",
  "Home inspection resolution",
  "Appraisal review",
  "Disclosure documents",
  "Attorney review",
  "Final walkthrough",
  "Sign closing documents",
  "Fund transfer & recording",
  "Key handover",
];

type GuideResult = {
  timeline: string;
  steps: { title: string; instructions: string; tips: string; estimated_days: number }[];
  estimated_costs: { item: string; amount: string }[];
  state_notes: string;
};

export default function ClosingGuidePage() {
  const { loading: authLoading } = useAuth();
  const [selectedState, setSelectedState] = useState("NY");
  const [remainingSteps, setRemainingSteps] = useState<Set<string>>(new Set(ALL_STEPS));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guide, setGuide] = useState<GuideResult | null>(null);

  function toggleStep(step: string) {
    setRemainingSteps((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  }

  async function generateGuide() {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/closing/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: selectedState,
          remaining_steps: Array.from(remainingSteps),
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to generate guide (${res.status})`);
      }

      const data = await res.json();
      setGuide(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate guide");
    } finally {
      setGenerating(false);
    }
  }

  if (authLoading) {
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
        <Link href="/dashboard/closing" className="text-gold-dark hover:text-gold text-sm">
          &larr; Back to Closing
        </Link>
        <h1 className="font-heading font-bold text-navy text-2xl mt-2">AI Closing Guide</h1>
        <p className="text-navy-light text-sm mt-1">
          Get a personalized closing guide for your state with timeline and cost estimates
        </p>
      </div>

      {/* Configuration form */}
      <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-5">
        {/* State selector */}
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Your State</label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 px-4 py-2.5 text-navy bg-white outline-none w-full max-w-xs"
          >
            {Object.entries(US_STATES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Remaining steps */}
        <div>
          <label className="block text-sm font-medium text-navy mb-2">
            Select remaining steps in your closing process
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_STEPS.map((step) => (
              <label
                key={step}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer border transition text-sm ${
                  remainingSteps.has(step)
                    ? "border-gold bg-gold-bg text-navy font-medium"
                    : "border-gold-muted/20 text-navy-light hover:border-gold-muted/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={remainingSteps.has(step)}
                  onChange={() => toggleStep(step)}
                  className="w-4 h-4 rounded border-gold-muted/50 text-gold focus:ring-gold/40"
                />
                {step}
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={generateGuide}
          disabled={generating || remainingSteps.size === 0}
          className="bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-6 py-2.5 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? "Generating Guide..." : "Generate Guide"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {/* Guide result */}
      {guide && (
        <div className="space-y-6">
          {/* Timeline overview */}
          <div className="bg-gold-bg rounded-2xl border border-gold-muted/30 p-6">
            <h2 className="font-heading font-bold text-navy text-lg mb-2">Timeline Overview</h2>
            <p className="text-navy-light text-sm">{guide.timeline}</p>
          </div>

          {/* State-specific notes */}
          {guide.state_notes && (
            <div className="bg-cream-light rounded-2xl p-6">
              <h2 className="font-heading font-bold text-navy text-lg mb-2">
                {US_STATES[selectedState]} Specific Notes
              </h2>
              <p className="text-navy-light text-sm">{guide.state_notes}</p>
            </div>
          )}

          {/* Step-by-step instructions */}
          <div className="bg-white rounded-2xl border border-gold-muted/30 p-6">
            <h2 className="font-heading font-bold text-navy text-lg mb-5">
              Step-by-Step Instructions
            </h2>
            <div className="space-y-4">
              {guide.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="border-l-4 border-gold pl-5 py-2"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono bg-gold-bg text-gold-dark px-2 py-0.5 rounded-lg">
                      Step {idx + 1}
                    </span>
                    <span className="text-xs text-navy-light/50">
                      ~{step.estimated_days} day{step.estimated_days !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <h3 className="font-semibold text-navy text-sm">{step.title}</h3>
                  <p className="text-navy-light text-sm mt-1">{step.instructions}</p>
                  {step.tips && (
                    <div className="mt-2 bg-cream-light rounded-lg px-3 py-2">
                      <p className="text-xs text-navy-light">
                        <span className="font-semibold">Tip:</span> {step.tips}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Estimated costs */}
          {guide.estimated_costs && guide.estimated_costs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gold-muted/30 p-6">
              <h2 className="font-heading font-bold text-navy text-lg mb-4">
                Estimated Costs ({US_STATES[selectedState]})
              </h2>
              <div className="space-y-2">
                {guide.estimated_costs.map((cost, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-gold-muted/10 last:border-0"
                  >
                    <span className="text-sm text-navy">{cost.item}</span>
                    <span className="text-sm font-semibold text-navy">{cost.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
