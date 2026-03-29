"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with the basics",
    features: [
      "1 property listing",
      "Basic AI pricing",
      "Standard listing page",
      "Email support",
      "Marketplace access",
    ],
    cta: "Current Plan",
    highlighted: false,
  },
  {
    id: "seller_pro",
    name: "Seller Pro",
    price: "$299",
    period: "per listing",
    description: "Everything you need to sell smarter",
    features: [
      "Up to 5 property listings",
      "Advanced AI pricing with comps",
      "AI offer analysis & scoring",
      "Professional listing page",
      "Showing scheduler",
      "Offer comparison tools",
      "Closing checklist & calculator",
      "AI closing guide",
      "Priority email support",
      "Document management",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
  {
    id: "full_service",
    name: "Full Service",
    price: "$499",
    period: "per listing",
    description: "White-glove AI-powered selling",
    features: [
      "Unlimited property listings",
      "Everything in Seller Pro",
      "Professional photography coordination",
      "AI-powered marketing copy",
      "Social media listing promotion",
      "Dedicated support agent",
      "Contract review assistance",
      "Negotiation strategy AI",
      "Premium listing placement",
      "Post-sale transition support",
    ],
    cta: "Upgrade to Full Service",
    highlighted: false,
  },
];

export default function UpgradePage() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Show success/canceled messages from Stripe redirect
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setMessage({
        type: "success",
        text: "Payment successful! Your plan has been upgraded.",
      });
    } else if (searchParams.get("canceled") === "true") {
      setMessage({
        type: "error",
        text: "Payment was canceled. You have not been charged.",
      });
    }
  }, [searchParams]);

  // Fetch current plan from Supabase profiles
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.plan) {
          setCurrentPlan(data.plan);
        }
      });
  }, [user]);

  async function handleUpgrade(planId: string) {
    if (planId === "free" || planId === currentPlan) return;
    setUpgrading(planId);
    setMessage(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      setMessage({ type: "error", text: errorMessage });
      setUpgrading(null);
    }
  }

  if (authLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-gold-bg rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 bg-white rounded-2xl border border-gold-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="font-heading font-bold text-navy text-2xl">Upgrade Your Plan</h1>
        <p className="text-navy-light text-sm mt-1">
          Choose the plan that fits your home selling needs
        </p>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`mx-auto max-w-xl rounded-xl px-4 py-3 text-center text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 flex flex-col ${
                plan.highlighted
                  ? "bg-white border-2 border-gold shadow-lg scale-[1.02]"
                  : "bg-white border border-gold-muted/30"
              }`}
            >
              {/* Current plan badge */}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-navy text-cream text-xs font-semibold px-4 py-1 rounded-full">
                    Current Plan
                  </span>
                </div>
              )}

              {/* Most popular badge */}
              {plan.highlighted && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gold text-navy text-xs font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-5 pt-2">
                <h2 className="font-heading font-bold text-navy text-lg">{plan.name}</h2>
                <p className="text-navy-light/60 text-sm mt-0.5">{plan.description}</p>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-navy">{plan.price}</span>
                  <span className="text-sm text-navy-light/50 ml-1">/{plan.period}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <span className="text-gold mt-0.5 flex-shrink-0">&#10003;</span>
                    <span className="text-navy-light">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrent || upgrading === plan.id}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
                  isCurrent
                    ? "bg-cream text-navy-light cursor-default"
                    : plan.highlighted
                    ? "bg-gold hover:bg-gold-dark text-navy disabled:opacity-50"
                    : "bg-navy hover:bg-navy-light text-cream disabled:opacity-50"
                }`}
              >
                {upgrading === plan.id
                  ? "Processing..."
                  : isCurrent
                  ? "Current Plan"
                  : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ / note */}
      <div className="bg-cream-light rounded-2xl p-6 text-center max-w-xl mx-auto">
        <p className="text-sm text-navy-light">
          All plans include a 30-day money-back guarantee. No long-term contracts.
          Upgrade or downgrade at any time.
        </p>
        <p className="text-xs text-navy-light/50 mt-2">
          Questions? Contact us at support@chiavi.com
        </p>
      </div>
    </div>
  );
}
