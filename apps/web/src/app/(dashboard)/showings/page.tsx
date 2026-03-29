"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Showing {
  id: string;
  listing_id: string;
  listing_address: string;
  buyer_name: string;
  buyer_email: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  message: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function ShowingsPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [showings, setShowings] = useState<Showing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    if (!user) return;
    fetchShowings();
  }, [user]);

  const fetchShowings = async () => {
    setLoading(true);
    try {
      const { data: listings } = await supabase
        .from("listings")
        .select("id")
        .eq("user_id", user!.id);

      if (!listings?.length) {
        setShowings([]);
        setLoading(false);
        return;
      }

      const listingIds = listings.map((l) => l.id);
      const { data, error: fetchError } = await supabase
        .from("showings")
        .select("*")
        .in("listing_id", listingIds)
        .order("date", { ascending: true });

      if (fetchError) throw fetchError;
      setShowings(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load showings";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const updateShowingStatus = async (showingId: string, status: string) => {
    try {
      const { error: updateError } = await supabase
        .from("showings")
        .update({ status })
        .eq("id", showingId);

      if (updateError) throw updateError;
      setShowings((prev) =>
        prev.map((s) => (s.id === showingId ? { ...s, status: status as Showing["status"] } : s))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update showing";
      setError(message);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  // Calendar logic
  const calendarDays = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startPad = firstDay.getDay();
    const days: { date: string; day: number; isCurrentMonth: boolean; showings: Showing[] }[] = [];

    // Pad with previous month days
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, -i);
      days.push({
        date: d.toISOString().split("T")[0],
        day: d.getDate(),
        isCurrentMonth: false,
        showings: [],
      });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        date: dateStr,
        day: d,
        isCurrentMonth: true,
        showings: showings.filter((s) => s.date === dateStr),
      });
    }

    // Pad to fill last week
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month, i);
        days.push({
          date: d.toISOString().split("T")[0],
          day: d.getDate(),
          isCurrentMonth: false,
          showings: [],
        });
      }
    }

    return days;
  }, [selectedMonth, showings]);

  const navigateMonth = (dir: number) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const d = new Date(year, month - 1 + dir, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  const upcomingShowings = showings.filter(
    (s) => s.status !== "cancelled" && s.status !== "completed" && s.date >= new Date().toISOString().split("T")[0]
  );

  const pendingShowings = showings.filter((s) => s.status === "pending");

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-navy text-2xl sm:text-3xl">Showings</h1>
        <p className="text-navy-light mt-1">Manage property showing requests and schedule</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          { label: "Total Showings", value: showings.length, color: "text-navy" },
          { label: "Pending", value: pendingShowings.length, color: "text-amber-600" },
          { label: "Upcoming", value: upcomingShowings.length, color: "text-emerald-600" },
          { label: "Completed", value: showings.filter((s) => s.status === "completed").length, color: "text-blue-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gold-muted/30 p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-navy-light">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-gold-muted/30 p-3 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-navy text-base sm:text-lg">Calendar</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => navigateMonth(-1)} className="p-1.5 rounded-lg hover:bg-gold-bg transition-colors">
              <svg className="w-5 h-5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-navy font-semibold min-w-[160px] text-center">{monthLabel}</span>
            <button onClick={() => navigateMonth(1)} className="p-1.5 rounded-lg hover:bg-gold-bg transition-colors">
              <svg className="w-5 h-5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-gold-muted/20 rounded-xl overflow-hidden text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <div key={i} className="bg-gold-bg p-1.5 sm:p-2 text-[10px] sm:text-xs font-semibold text-navy-light">
              <span className="sm:hidden">{day}</span>
              <span className="hidden sm:inline">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}</span>
            </div>
          ))}
          {calendarDays.map((day, i) => (
            <div
              key={i}
              className={`bg-white p-1 sm:p-2 min-h-[48px] sm:min-h-[72px] ${
                !day.isCurrentMonth ? "opacity-40" : ""
              }`}
            >
              <span className="text-[10px] sm:text-xs text-navy-light">{day.day}</span>
              {day.showings.map((s) => (
                <Link
                  key={s.id}
                  href={`/showings/${s.id}`}
                  className={`block text-[10px] sm:text-xs mt-0.5 sm:mt-1 px-1 sm:px-1.5 py-0.5 rounded truncate ${STATUS_STYLES[s.status]}`}
                >
                  {formatTime(s.time)}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingShowings.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading font-bold text-navy text-lg">Pending Approval</h2>
          {pendingShowings.map((showing) => (
            <div key={showing.id} className="bg-white rounded-2xl border border-amber-200 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-navy">{showing.buyer_name}</p>
                    <p className="text-sm text-navy-light">{showing.listing_address}</p>
                    <p className="text-sm text-navy-light">
                      {formatDate(showing.date)} at {formatTime(showing.time)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => updateShowingStatus(showing.id, "confirmed")}
                    className="bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateShowingStatus(showing.id, "cancelled")}
                    className="bg-white hover:bg-red-50 text-red-600 border border-red-200 font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming Showings */}
      <div className="space-y-3">
        <h2 className="font-heading font-bold text-navy text-lg">Upcoming Showings</h2>

        {upcomingShowings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gold-muted/30 p-10 text-center">
            <svg className="w-12 h-12 mx-auto text-gold-dark mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-navy-light">No upcoming showings scheduled.</p>
          </div>
        ) : (
          upcomingShowings.map((showing) => (
            <Link
              key={showing.id}
              href={`/showings/${showing.id}`}
              className="block bg-white rounded-2xl border border-gold-muted/30 p-5 hover:border-gold/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gold-bg rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-gold-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-navy">{showing.buyer_name}</p>
                    <p className="text-sm text-navy-light">{showing.listing_address}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-navy">{formatDate(showing.date)}</p>
                    <p className="text-sm text-navy-light">{formatTime(showing.time)}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[showing.status]}`}>
                    {showing.status}
                  </span>
                  <svg className="w-5 h-5 text-navy-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Availability Management */}
      <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-4">
        <h2 className="font-heading font-bold text-navy text-lg">Availability</h2>
        <p className="text-navy-light text-sm">
          Set your available hours for property showings. Buyers will only be able to book during these times.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
            <div key={day} className="flex items-center justify-between p-3 rounded-xl border border-gold-muted/20">
              <span className="text-sm font-medium text-navy">{day}</span>
              <div className="flex items-center gap-2">
                <select className="text-sm px-2 py-1 border border-gold-muted/50 rounded-lg focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy">
                  <option>9:00 AM</option>
                  <option>10:00 AM</option>
                  <option>11:00 AM</option>
                  <option>12:00 PM</option>
                </select>
                <span className="text-navy-light text-sm">to</span>
                <select className="text-sm px-2 py-1 border border-gold-muted/50 rounded-lg focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy">
                  <option>5:00 PM</option>
                  <option>6:00 PM</option>
                  <option>7:00 PM</option>
                  <option>8:00 PM</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        <button className="bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-5 py-2.5 transition-colors">
          Save Availability
        </button>
      </div>
    </div>
  );
}
