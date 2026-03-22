import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export type PlanType = "free" | "seller_pro" | "full_service";

export type Feature =
  | "ai_pricing_single"
  | "basic_listing"
  | "marketplace"
  | "unlimited_pricing"
  | "photos_25"
  | "documents"
  | "showings"
  | "offer_analyzer"
  | "syndication"
  | "closing_guide"
  | "priority_support";

const PLAN_HIERARCHY: PlanType[] = ["free", "seller_pro", "full_service"];

const FEATURE_PLAN_MAP: Record<Feature, PlanType> = {
  // Free tier
  ai_pricing_single: "free",
  basic_listing: "free",
  marketplace: "free",
  // Seller Pro tier
  unlimited_pricing: "seller_pro",
  photos_25: "seller_pro",
  documents: "seller_pro",
  showings: "seller_pro",
  offer_analyzer: "seller_pro",
  syndication: "seller_pro",
  // Full Service tier
  closing_guide: "full_service",
  priority_support: "full_service",
};

export const PLAN_LABELS: Record<PlanType, string> = {
  free: "Free",
  seller_pro: "Seller Pro",
  full_service: "Full Service",
};

function planLevel(plan: PlanType): number {
  return PLAN_HIERARCHY.indexOf(plan);
}

export function useTierAccess() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanType>("free");
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setPlan("free");
        setLoading(false);
        return;
      }

      let cancelled = false;

      const fetchPlan = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("plan")
            .eq("id", user.id)
            .single();

          if (!cancelled) {
            if (error || !data?.plan) {
              setPlan("free");
            } else {
              setPlan(data.plan as PlanType);
            }
          }
        } catch {
          if (!cancelled) {
            setPlan("free");
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      fetchPlan();

      return () => {
        cancelled = true;
      };
    }, [user])
  );

  const canAccess = useCallback(
    (feature: Feature): boolean => {
      const requiredLevel = planLevel(FEATURE_PLAN_MAP[feature]);
      const userLevel = planLevel(plan);
      return userLevel >= requiredLevel;
    },
    [plan]
  );

  const requiredPlan = useCallback((feature: Feature): PlanType => {
    return FEATURE_PLAN_MAP[feature];
  }, []);

  return { plan, loading, canAccess, requiredPlan };
}
