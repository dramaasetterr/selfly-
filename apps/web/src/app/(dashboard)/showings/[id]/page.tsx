"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";

interface ShowingData {
  id: string;
  listing_id: string;
  listing_address: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  message: string;
  notes: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function ShowingDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [showing, setShowing] = useState<ShowingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    fetchShowing();
  }, [user, id]);

  const fetchShowing = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("showings")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error("Showing not found");

      setShowing(data);
      setNotes(data.notes || "");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load showing";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!showing) return;
    setUpdating(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("showings")
        .update({ status })
        .eq("id", showing.id);

      if (updateError) throw updateError;
      setShowing((prev) => prev ? { ...prev, status: status as ShowingData["status"] } : null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      setError(message);
    } finally {
      setUpdating(false);
    }
  };

  const saveNotes = async () => {
    if (!showing) return;
    setSavingNotes(true);
    try {
      const { error: updateError } = await supabase
        .from("showings")
        .update({ notes })
        .eq("id", showing.id);

      if (updateError) throw updateError;
      setShowing((prev) => prev ? { ...prev, notes } : null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save notes";
      setError(message);
    } finally {
      setSavingNotes(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold" />
      </div>
    );
  }

  if (error && !showing) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push("/showings")}
          className="flex items-center gap-2 text-navy-light hover:text-navy transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Showings
        </button>
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (!showing) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/showings")}
          className="flex items-center gap-2 text-navy-light hover:text-navy transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Showings
        </button>

        <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${STATUS_STYLES[showing.status]}`}>
          {showing.status.charAt(0).toUpperCase() + showing.status.slice(1)}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Showing Details */}
          <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-5">
            <h1 className="font-heading font-bold text-navy text-2xl">Showing Details</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-navy-light">Date</p>
                <p className="font-semibold text-navy">{formatDate(showing.date)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-navy-light">Time</p>
                <p className="font-semibold text-navy">{formatTime(showing.time)}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-navy-light">Listing</p>
              <p className="font-semibold text-navy">{showing.listing_address}</p>
            </div>

            {showing.message && (
              <div className="space-y-1">
                <p className="text-sm text-navy-light">Buyer&apos;s Message</p>
                <div className="bg-cream-light rounded-xl p-4 text-navy text-sm">
                  {showing.message}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-4">
            <h2 className="font-heading font-bold text-navy text-lg">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Add notes about this showing..."
              className="w-full px-4 py-3 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy resize-y"
            />
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-5 py-2.5 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {savingNotes ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-navy" />
                  Saving...
                </>
              ) : (
                "Save Notes"
              )}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Buyer Info */}
          <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-4">
            <h2 className="font-heading font-bold text-navy text-lg">Buyer Information</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-bg rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-gold-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-navy">{showing.buyer_name}</p>
                  <p className="text-sm text-navy-light">Buyer</p>
                </div>
              </div>

              <div className="border-t border-gold-muted/20 pt-3 space-y-2">
                {showing.buyer_email && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-navy-light flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${showing.buyer_email}`} className="text-sm text-gold-dark hover:underline">
                      {showing.buyer_email}
                    </a>
                  </div>
                )}
                {showing.buyer_phone && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-navy-light flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${showing.buyer_phone}`} className="text-sm text-gold-dark hover:underline">
                      {showing.buyer_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-3">
            <h2 className="font-heading font-bold text-navy text-lg">Actions</h2>

            {showing.status === "pending" && (
              <>
                <button
                  onClick={() => updateStatus("confirmed")}
                  disabled={updating}
                  className="w-full bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
                >
                  Confirm Showing
                </button>
                <button
                  onClick={() => updateStatus("cancelled")}
                  disabled={updating}
                  className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 font-semibold rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
                >
                  Decline Showing
                </button>
              </>
            )}

            {showing.status === "confirmed" && (
              <>
                <button
                  onClick={() => updateStatus("completed")}
                  disabled={updating}
                  className="w-full bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
                >
                  Mark as Completed
                </button>
                <button
                  onClick={() => updateStatus("cancelled")}
                  disabled={updating}
                  className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 font-semibold rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
                >
                  Cancel Showing
                </button>
              </>
            )}

            {(showing.status === "completed" || showing.status === "cancelled") && (
              <p className="text-sm text-navy-light text-center py-2">
                This showing is {showing.status}. No further actions available.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
