"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CLOSING_STEPS = [
  { key: "accept_offer", label: "Accept Offer", description: "Formally accept the buyer's offer in writing" },
  { key: "hire_attorney", label: "Hire Attorney", description: "Retain a real estate attorney to review documents" },
  { key: "title_search", label: "Title Search", description: "Title company verifies clear title on the property" },
  { key: "inspection", label: "Home Inspection", description: "Buyer's inspection of the property" },
  { key: "appraisal", label: "Appraisal", description: "Lender-ordered appraisal to confirm property value" },
  { key: "review_disclosure", label: "Review Disclosures", description: "Review and sign all required disclosure documents" },
  { key: "walkthrough", label: "Final Walkthrough", description: "Buyer performs final walkthrough before closing" },
  { key: "sign_docs", label: "Sign Documents", description: "Sign closing documents at the title company" },
  { key: "transfer_keys", label: "Transfer Keys", description: "Hand over keys and complete the sale" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA",
  "RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

// Approximate state transfer tax rates (per $100 of sale price)
const TRANSFER_TAX_RATES: Record<string, number> = {
  NY: 0.004, NJ: 0.01, CT: 0.0075, PA: 0.01, CA: 0.0011, FL: 0.007,
  IL: 0.001, TX: 0, WA: 0.0178, MA: 0.00456, MD: 0.005, VA: 0.0025,
  GA: 0.001, NC: 0.002, OH: 0.001, MI: 0.0075, CO: 0.001, AZ: 0,
  DEFAULT: 0.002,
};

export default function ClosingPage() {
  const { user, loading: authLoading } = useAuth();
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Calculator state
  const [salePrice, setSalePrice] = useState("");
  const [mortgageBalance, setMortgageBalance] = useState("");
  const [state, setState] = useState("NY");
  const [costs, setCosts] = useState<{
    attorney: number;
    titleInsurance: number;
    transferTax: number;
    recordingFees: number;
    totalCosts: number;
    netProceeds: number;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchChecklist() {
      const { data } = await supabase
        .from("closing_checklist")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (data) {
        const steps: Record<string, boolean> = {};
        CLOSING_STEPS.forEach((s) => {
          steps[s.key] = data[s.key] ?? false;
        });
        setChecklist(steps);
      } else {
        const steps: Record<string, boolean> = {};
        CLOSING_STEPS.forEach((s) => {
          steps[s.key] = false;
        });
        setChecklist(steps);
      }
      setLoading(false);
    }

    fetchChecklist();
  }, [user]);

  const toggleStep = useCallback(
    async (key: string) => {
      if (!user) return;
      const newVal = !checklist[key];
      setChecklist((prev) => ({ ...prev, [key]: newVal }));
      setSaving(true);

      const supabase = createClient();
      await supabase
        .from("closing_checklist")
        .upsert(
          { user_id: user.id, [key]: newVal },
          { onConflict: "user_id" }
        );

      setSaving(false);
    },
    [user, checklist]
  );

  function calculateCosts() {
    const price = parseFloat(salePrice) || 0;
    const mortgage = parseFloat(mortgageBalance) || 0;
    const taxRate = TRANSFER_TAX_RATES[state] ?? TRANSFER_TAX_RATES.DEFAULT;

    const attorney = 1500;
    const titleInsurance = Math.round(price * 0.005);
    const transferTax = Math.round(price * taxRate);
    const recordingFees = 250;
    const totalCosts = attorney + titleInsurance + transferTax + recordingFees;
    const netProceeds = price - mortgage - totalCosts;

    setCosts({ attorney, titleInsurance, transferTax, recordingFees, totalCosts, netProceeds });
  }

  const completedCount = Object.values(checklist).filter(Boolean).length;

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-gold-bg rounded-xl animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white rounded-2xl border border-gold-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-navy text-2xl">Closing</h1>
          <p className="text-navy-light text-sm mt-1">
            Track your progress and estimate closing costs
          </p>
        </div>
        <Link
          href="/dashboard/closing/guide"
          className="bg-navy hover:bg-navy-light text-cream rounded-xl px-5 py-2.5 text-sm font-semibold transition"
        >
          AI Closing Guide
        </Link>
      </div>

      {/* Closing Checklist */}
      <div className="bg-white rounded-2xl border border-gold-muted/30 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-bold text-navy text-lg">Closing Checklist</h2>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-navy-light/50">Saving...</span>}
            <span className="text-sm font-medium text-navy">
              {completedCount}/{CLOSING_STEPS.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-cream-light rounded-full mb-5 overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / CLOSING_STEPS.length) * 100}%` }}
          />
        </div>

        <div className="space-y-1">
          {CLOSING_STEPS.map((step, idx) => (
            <button
              key={step.key}
              onClick={() => toggleStep(step.key)}
              className={`w-full flex items-start gap-4 p-3 rounded-xl text-left transition hover:bg-cream-light ${
                checklist[step.key] ? "opacity-70" : ""
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
                  checklist[step.key]
                    ? "bg-gold border-gold text-white"
                    : "border-gold-muted/40"
                }`}
              >
                {checklist[step.key] && <span className="text-xs font-bold">&#10003;</span>}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-navy-light/40 font-mono">{idx + 1}.</span>
                  <span
                    className={`text-sm font-medium ${
                      checklist[step.key] ? "text-navy-light line-through" : "text-navy"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                <p className="text-xs text-navy-light/60 ml-6">{step.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Closing Cost Calculator */}
      <div className="bg-white rounded-2xl border border-gold-muted/30 p-6">
        <h2 className="font-heading font-bold text-navy text-lg mb-5">
          Closing Cost Calculator
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">Sale Price ($)</label>
            <input
              type="number"
              min="0"
              step="1000"
              placeholder="350000"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className="w-full border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 px-4 py-2.5 text-navy outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">
              Mortgage Balance ($)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              placeholder="200000"
              value={mortgageBalance}
              onChange={(e) => setMortgageBalance(e.target.value)}
              className="w-full border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 px-4 py-2.5 text-navy outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 px-4 py-2.5 text-navy bg-white outline-none"
            >
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={calculateCosts}
          className="bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-6 py-2.5 text-sm transition"
        >
          Calculate
        </button>

        {costs && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-cream-light rounded-xl p-4">
              <p className="text-xs text-navy-light/60 mb-1">Attorney Fees</p>
              <p className="text-lg font-bold text-navy">${costs.attorney.toLocaleString()}</p>
            </div>
            <div className="bg-cream-light rounded-xl p-4">
              <p className="text-xs text-navy-light/60 mb-1">Title Insurance</p>
              <p className="text-lg font-bold text-navy">${costs.titleInsurance.toLocaleString()}</p>
            </div>
            <div className="bg-cream-light rounded-xl p-4">
              <p className="text-xs text-navy-light/60 mb-1">Transfer Tax ({state})</p>
              <p className="text-lg font-bold text-navy">${costs.transferTax.toLocaleString()}</p>
            </div>
            <div className="bg-cream-light rounded-xl p-4">
              <p className="text-xs text-navy-light/60 mb-1">Recording Fees</p>
              <p className="text-lg font-bold text-navy">${costs.recordingFees.toLocaleString()}</p>
            </div>
            <div className="bg-gold-bg rounded-xl p-4 border border-gold-muted/30">
              <p className="text-xs text-navy-light/60 mb-1">Total Costs</p>
              <p className="text-lg font-bold text-gold-dark">${costs.totalCosts.toLocaleString()}</p>
            </div>
            <div
              className={`rounded-xl p-4 border ${
                costs.netProceeds >= 0
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <p className="text-xs text-navy-light/60 mb-1">Estimated Net Proceeds</p>
              <p
                className={`text-xl font-bold ${
                  costs.netProceeds >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                ${costs.netProceeds.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
