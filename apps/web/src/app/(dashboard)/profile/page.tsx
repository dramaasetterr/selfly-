"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  full_name: string | null;
  phone: string | null;
  plan: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  seller_pro: "Seller Pro",
  full_service: "Full Service",
};

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!user) return;

    async function fetchProfile() {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("full_name, phone, plan")
          .eq("id", user!.id)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

        if (data) {
          setProfile(data);
          setFullName(data.full_name || "");
          setPhone(data.phone || "");
        } else {
          // No profile row yet, use auth metadata
          setFullName(user!.user_metadata?.full_name || "");
          setProfile({ full_name: null, phone: null, plan: "free" });
        }
      } catch (err: any) {
        setError(err.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            full_name: fullName.trim(),
            phone: phone.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (upsertError) throw upsertError;

      setProfile((prev) => prev ? { ...prev, full_name: fullName.trim(), phone: phone.trim() } : prev);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-navy-light">Loading profile...</div>
      </div>
    );
  }

  const plan = profile?.plan || "free";
  const planLabel = PLAN_LABELS[plan] || plan;
  const isFreeTier = plan === "free";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-navy text-2xl sm:text-3xl">Your Profile</h1>
        <p className="text-navy-light mt-1">Manage your account details and subscription plan.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-error rounded-2xl p-4 border border-red-200 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-success rounded-2xl p-4 border border-green-200 text-sm font-medium">
          Profile saved successfully.
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-5">
        <h2 className="font-heading font-bold text-navy text-lg">Personal Information</h2>

        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full px-4 py-3 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none text-navy placeholder:text-navy-light/40"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Email</label>
          <input
            type="email"
            value={user?.email || ""}
            readOnly
            className="w-full px-4 py-3 border border-gold-muted/30 rounded-xl bg-cream-light text-navy-light cursor-not-allowed"
          />
          <p className="text-xs text-navy-light/60 mt-1">Email cannot be changed here.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-3 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none text-navy placeholder:text-navy-light/40"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3 bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Plan */}
      <div className="bg-white rounded-2xl border border-gold-muted/30 p-6">
        <h2 className="font-heading font-bold text-navy text-lg mb-4">Current Plan</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-semibold px-3 py-1 rounded-full ${
                isFreeTier ? "bg-cream-light text-navy-light" : "bg-gold-bg text-gold-dark"
              }`}
            >
              {planLabel}
            </span>
            {isFreeTier && (
              <p className="text-sm text-navy-light">Upgrade for AI pricing, unlimited listings, and more.</p>
            )}
            {!isFreeTier && (
              <p className="text-sm text-navy-light">You have access to all {planLabel} features.</p>
            )}
          </div>
          {isFreeTier && (
            <Link
              href="/upgrade"
              className="px-5 py-2.5 bg-navy hover:bg-navy-light text-cream rounded-xl font-semibold text-sm transition"
            >
              Upgrade Plan
            </Link>
          )}
        </div>
      </div>

      {/* Sign Out */}
      <div className="bg-white rounded-2xl border border-gold-muted/30 p-6">
        <h2 className="font-heading font-bold text-navy text-lg mb-2">Account</h2>
        <p className="text-sm text-navy-light mb-4">
          Sign out of your Chiavi account on this device.
        </p>
        <button
          onClick={signOut}
          className="px-6 py-2.5 bg-red-50 hover:bg-red-100 text-error font-semibold rounded-xl text-sm transition border border-red-200"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
