"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PIPELINE_STAGES = [
  {
    key: "prep",
    title: "Prep Your Home",
    description: "Declutter, clean, and stage your home to make the best first impression.",
    href: "/prep",
    icon: "\u2726",
  },
  {
    key: "pricing",
    title: "Price It Right",
    description: "Get an AI-powered pricing recommendation based on market data.",
    href: "/pricing",
    icon: "\u2736",
  },
  {
    key: "listing",
    title: "Create Listing",
    description: "Build a professional listing with photos, description, and details.",
    href: "/listing",
    icon: "\u270E",
  },
  {
    key: "showings",
    title: "Manage Showings",
    description: "Schedule and track property showings with interested buyers.",
    href: "/showings",
    icon: "\u25A3",
  },
  {
    key: "offers",
    title: "Review Offers",
    description: "Compare and negotiate offers from potential buyers.",
    href: "/offers",
    icon: "\u2637",
  },
  {
    key: "closing",
    title: "Close the Deal",
    description: "Complete the final paperwork and hand over the keys.",
    href: "/closing",
    icon: "\u2714",
  },
];

const TIPS = [
  "Homes that are staged sell 73% faster than non-staged homes.",
  "The first two weeks on the market are the most critical for attracting buyers.",
  "Professional photos can increase your listing views by up to 118%.",
  "Pricing your home within 5% of market value leads to faster sales.",
  "Curb appeal improvements can yield a 100% return on investment.",
  "Decluttering makes rooms appear 30% larger to potential buyers.",
];

interface Profile {
  full_name: string | null;
  current_stage: string | null;
  plan: string | null;
}

interface Stats {
  listings: number;
  showings: number;
  offers: number;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ listings: 0, showings: 0, offers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tip = TIPS[new Date().getDate() % TIPS.length];

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const supabase = createClient();

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, current_stage, plan")
          .eq("id", user!.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") throw profileError;
        setProfile(profileData);

        const [listingsRes, showingsRes, offersRes] = await Promise.all([
          supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
          supabase.from("showings").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
          supabase.from("offers").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        ]);

        setStats({
          listings: listingsRes.count ?? 0,
          showings: showingsRes.count ?? 0,
          offers: offersRes.count ?? 0,
        });
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-navy-light">Loading your dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-error rounded-2xl p-6 border border-red-200">
        <p className="font-semibold">Something went wrong</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  const currentStage = profile?.current_stage || "prep";
  const currentStageIndex = PIPELINE_STAGES.findIndex((s) => s.key === currentStage);
  const firstName = profile?.full_name?.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-heading font-bold text-navy text-2xl sm:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="text-navy-light mt-1">
          Here&apos;s your selling journey at a glance.
        </p>
      </div>

      {/* Pipeline Progress */}
      <div className="bg-white rounded-2xl border border-gold-muted/30 p-4 sm:p-6">
        <h2 className="font-heading font-bold text-navy text-base sm:text-lg mb-4">Your Pipeline</h2>
        <div className="flex items-center gap-0.5 sm:gap-1 mb-6">
          {PIPELINE_STAGES.map((stage, i) => {
            const isComplete = i < currentStageIndex;
            const isCurrent = i === currentStageIndex;
            return (
              <div key={stage.key} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={`h-2 w-full rounded-full ${
                    isComplete
                      ? "bg-success"
                      : isCurrent
                      ? "bg-gold"
                      : "bg-gold-muted/20"
                  }`}
                />
                <span
                  className={`text-[9px] sm:text-[10px] font-medium text-center leading-tight hidden sm:block ${
                    isCurrent ? "text-gold-dark font-semibold" : isComplete ? "text-success" : "text-navy-light/50"
                  }`}
                >
                  {stage.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Stage Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {PIPELINE_STAGES.map((stage, i) => {
            const isComplete = i < currentStageIndex;
            const isCurrent = i === currentStageIndex;
            const isUpcoming = i > currentStageIndex;

            return (
              <Link
                key={stage.key}
                href={stage.href}
                className={`rounded-2xl border p-4 transition hover:shadow-md ${
                  isCurrent
                    ? "border-gold bg-gold-bg"
                    : isComplete
                    ? "border-green-200 bg-green-50/50"
                    : "border-gold-muted/20 bg-cream-light opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{stage.icon}</span>
                  {isComplete && (
                    <span className="bg-green-50 text-success text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      Complete
                    </span>
                  )}
                  {isCurrent && (
                    <span className="bg-gold-bg text-gold-dark text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                  {isUpcoming && (
                    <span className="text-xs text-navy-light/40 font-medium">Upcoming</span>
                  )}
                </div>
                <h3 className="font-heading font-bold text-navy text-sm">{stage.title}</h3>
                <p className="text-xs text-navy-light mt-1 leading-relaxed">{stage.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Stats + Tip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: "Listings", value: stats.listings, icon: "\u270E" },
            { label: "Showings", value: stats.showings, icon: "\u25A3" },
            { label: "Offers", value: stats.offers, icon: "\u2637" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gold-muted/30 p-4 sm:p-6 text-center">
              <span className="text-xl sm:text-2xl block mb-1 sm:mb-2">{stat.icon}</span>
              <p className="text-2xl sm:text-3xl font-bold text-navy">{stat.value}</p>
              <p className="text-xs sm:text-sm text-navy-light mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tip of the Day */}
        <div className="bg-gold-bg rounded-2xl border border-gold-muted/30 p-6">
          <h3 className="font-heading font-bold text-navy text-sm mb-2">Tip of the Day</h3>
          <p className="text-sm text-navy-light leading-relaxed">{tip}</p>
        </div>
      </div>
    </div>
  );
}
