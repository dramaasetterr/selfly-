"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CHECKLIST_CATEGORIES = [
  {
    category: "Declutter & Organize",
    items: [
      { key: "declutter_closets", title: "Clean out closets", description: "Remove excess items so closets look spacious and organized." },
      { key: "declutter_counters", title: "Clear countertops", description: "Keep kitchen and bathroom counters minimal and clean." },
      { key: "declutter_personal", title: "Remove personal items", description: "Pack away family photos, trophies, and personal collections." },
      { key: "declutter_garage", title: "Organize garage/storage", description: "Tidy up storage areas to show usable space." },
    ],
  },
  {
    category: "Deep Clean",
    items: [
      { key: "clean_kitchen", title: "Deep clean kitchen", description: "Scrub appliances, cabinets, and floors until they shine." },
      { key: "clean_bathrooms", title: "Deep clean bathrooms", description: "Scrub tile, grout, fixtures, and mirrors." },
      { key: "clean_windows", title: "Clean all windows", description: "Wash inside and out for maximum natural light." },
      { key: "clean_carpets", title: "Clean carpets & floors", description: "Steam clean carpets and polish hardwood floors." },
    ],
  },
  {
    category: "Minor Repairs",
    items: [
      { key: "repair_holes", title: "Patch wall holes", description: "Fill nail holes and touch up any wall damage." },
      { key: "repair_fixtures", title: "Fix leaky faucets", description: "Repair dripping faucets and running toilets." },
      { key: "repair_doors", title: "Fix sticky doors/drawers", description: "Ensure all doors and drawers open and close smoothly." },
      { key: "repair_caulk", title: "Re-caulk where needed", description: "Refresh caulking around tubs, showers, and sinks." },
    ],
  },
  {
    category: "Fresh Paint",
    items: [
      { key: "paint_walls", title: "Paint main living areas", description: "Use neutral, warm tones that appeal to most buyers." },
      { key: "paint_trim", title: "Touch up trim & baseboards", description: "Fresh white trim makes rooms look clean and finished." },
      { key: "paint_doors", title: "Paint or stain front door", description: "First impression starts at the front door." },
    ],
  },
  {
    category: "Curb Appeal",
    items: [
      { key: "curb_lawn", title: "Mow and edge lawn", description: "Keep the lawn neatly manicured and green." },
      { key: "curb_plants", title: "Add fresh plants/flowers", description: "Colorful plants near the entrance create a welcoming feel." },
      { key: "curb_walkway", title: "Clean walkway & driveway", description: "Power wash concrete surfaces for a fresh look." },
      { key: "curb_mailbox", title: "Refresh mailbox & house numbers", description: "Ensure they are clean, visible, and modern." },
    ],
  },
  {
    category: "Staging",
    items: [
      { key: "stage_furniture", title: "Arrange furniture for flow", description: "Create open, inviting spaces that showcase room size." },
      { key: "stage_accessories", title: "Add decorative touches", description: "Fresh towels, throw pillows, and a few tasteful accessories." },
      { key: "stage_scent", title: "Ensure pleasant scent", description: "Light, clean scents or fresh flowers work best." },
    ],
  },
  {
    category: "Lighting",
    items: [
      { key: "light_bulbs", title: "Replace burnt-out bulbs", description: "Ensure every fixture has a working, bright bulb." },
      { key: "light_fixtures", title: "Update dated fixtures", description: "Modern light fixtures are an affordable upgrade with big impact." },
      { key: "light_natural", title: "Maximize natural light", description: "Open curtains and blinds for all showings." },
    ],
  },
  {
    category: "Photos Ready",
    items: [
      { key: "photos_tidy", title: "Final tidying for photos", description: "Do one last walkthrough before the photographer arrives." },
      { key: "photos_exterior", title: "Prep exterior for photos", description: "Park cars away, put bins out of sight, tidy yard." },
      { key: "photos_schedule", title: "Schedule photographer", description: "Book a professional real estate photographer." },
    ],
  },
];

const ALL_ITEMS = CHECKLIST_CATEGORIES.flatMap((cat) => cat.items);

export default function PrepPage() {
  const { user, loading: authLoading } = useAuth();
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchChecklist() {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("home_prep_checklist")
          .select("item_key, completed")
          .eq("user_id", user!.id);

        if (fetchError) throw fetchError;

        const map: Record<string, boolean> = {};
        data?.forEach((row) => {
          map[row.item_key] = row.completed;
        });
        setCompleted(map);
      } catch (err: any) {
        setError(err.message || "Failed to load checklist.");
      } finally {
        setLoading(false);
      }
    }

    fetchChecklist();
  }, [user]);

  const toggleItem = useCallback(
    async (itemKey: string) => {
      if (!user || saving) return;
      setSaving(itemKey);
      setError(null);

      const newValue = !completed[itemKey];
      setCompleted((prev) => ({ ...prev, [itemKey]: newValue }));

      try {
        const supabase = createClient();
        const { error: upsertError } = await supabase
          .from("home_prep_checklist")
          .upsert(
            {
              user_id: user.id,
              item_key: itemKey,
              completed: newValue,
              completed_at: newValue ? new Date().toISOString() : null,
            },
            { onConflict: "user_id,item_key" }
          );

        if (upsertError) throw upsertError;
      } catch (err: any) {
        // Revert on failure
        setCompleted((prev) => ({ ...prev, [itemKey]: !newValue }));
        setError(err.message || "Failed to save. Please try again.");
      } finally {
        setSaving(null);
      }
    },
    [user, completed, saving]
  );

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-navy-light">Loading your checklist...</div>
      </div>
    );
  }

  const completedCount = Object.values(completed).filter(Boolean).length;
  const totalCount = ALL_ITEMS.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-navy text-3xl">Prep Your Home</h1>
        <p className="text-navy-light mt-1">
          Complete these tasks to get your home show-ready and maximize your selling price.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl border border-gold-muted/30 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold text-navy text-lg">Overall Progress</h2>
          <span className="text-sm font-semibold text-gold-dark">
            {completedCount} / {totalCount} tasks ({progressPct}%)
          </span>
        </div>
        <div className="w-full h-3 bg-gold-muted/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-error rounded-2xl p-4 border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Categories */}
      <div className="space-y-6">
        {CHECKLIST_CATEGORIES.map((cat) => {
          const catCompleted = cat.items.filter((item) => completed[item.key]).length;
          const allDone = catCompleted === cat.items.length;

          return (
            <div key={cat.category} className="bg-white rounded-2xl border border-gold-muted/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-navy">{cat.category}</h3>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    allDone ? "bg-green-50 text-success" : "bg-gold-bg text-gold-dark"
                  }`}
                >
                  {catCompleted}/{cat.items.length}
                </span>
              </div>

              <div className="space-y-3">
                {cat.items.map((item) => {
                  const isChecked = !!completed[item.key];
                  const isSaving = saving === item.key;

                  return (
                    <button
                      key={item.key}
                      onClick={() => toggleItem(item.key)}
                      disabled={!!saving}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition ${
                        isChecked
                          ? "bg-green-50/50 border border-green-200"
                          : "bg-cream-light border border-gold-muted/20 hover:border-gold-muted/40"
                      } ${isSaving ? "opacity-60" : ""}`}
                    >
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                          isChecked
                            ? "bg-success border-success text-white"
                            : "border-gold-muted/50"
                        }`}
                      >
                        {isChecked && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            isChecked ? "text-success line-through" : "text-navy"
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className="text-xs text-navy-light mt-0.5">{item.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
