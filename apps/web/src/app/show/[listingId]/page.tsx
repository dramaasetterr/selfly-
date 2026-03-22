"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import type { ShowingAvailability, BookShowingInput } from "@selfly/shared";

/* ─── types ─────────────────────────────────────────────────────────── */

interface ListingInfo {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  photos: string[];
  title: string;
}

interface GroupedSlots {
  [date: string]: ShowingAvailability[];
}

/* ─── helpers ───────────────────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || "";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/* ─── component ─────────────────────────────────────────────────────── */

export default function BookShowingPage() {
  const params = useParams();
  const listingId = (params?.listingId as string) ?? "";

  const [listing, setListing] = useState<ListingInfo | null>(null);
  const [slots, setSlots] = useState<ShowingAvailability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const availRes = await fetch(
          `${API_BASE}/api/showings/availability/${listingId}`,
        );
        const availData = await availRes.json();
        if (availData.slots) setSlots(availData.slots);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          const listingRes = await fetch(
            `${supabaseUrl}/rest/v1/listings?id=eq.${listingId}&select=id,address,price,bedrooms,bathrooms,sqft,photos,title`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            },
          );
          const listings = await listingRes.json();
          if (listings.length > 0) setListing(listings[0]);
        }
      } catch {
        setError("Failed to load listing information.");
      }
      setLoading(false);
    }
    fetchData();
  }, [listingId]);

  const groupedSlots: GroupedSlots = slots.reduce(
    (acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    },
    {} as GroupedSlots,
  );

  const selectedSlotInfo = slots.find((s) => s.id === selectedSlot);

  const handleBook = useCallback(async () => {
    if (!selectedSlot || !buyerName.trim() || !buyerEmail.trim()) {
      setError("Please fill in your name, email, and select a time slot.");
      return;
    }
    setBooking(true);
    setError("");

    try {
      const input: BookShowingInput = {
        listing_id: listingId,
        slot_id: selectedSlot,
        buyer_name: buyerName.trim(),
        buyer_email: buyerEmail.trim(),
        buyer_phone: buyerPhone.trim() || undefined,
      };

      const res = await fetch(`${API_BASE}/api/showings/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to book showing.");
        setBooking(false);
        return;
      }

      setBooked(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBooking(false);
  }, [selectedSlot, buyerName, buyerEmail, buyerPhone, listingId]);

  /* ── Loading state ─────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
        <div className="max-w-xl mx-auto px-4 py-8 pb-12">
          <div className="bg-white rounded-2xl p-7 shadow-sm border border-black/5">
            <div className="flex flex-col items-center py-12 gap-4">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-gray-500 animate-pulse">Loading property details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Success state ─────────────────────────────────────────────────── */

  if (booked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
        <div className="max-w-xl mx-auto px-4 py-8 pb-12">
          <div className="bg-white rounded-2xl p-7 shadow-sm border border-black/5 animate-[fadeIn_0.4s_ease-out]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <Logo />
            </div>

            <div className="text-center pt-2">
              <div className="w-[72px] h-[72px] rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-5">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Showing Confirmed!</h1>
              <p className="text-sm text-gray-500 leading-relaxed max-w-[380px] mx-auto mb-5">
                Your showing has been booked successfully. The seller has been
                notified and will expect you at the scheduled time.
              </p>

              {selectedSlotInfo && (
                <div className="bg-gray-50 rounded-xl p-0.5 px-4 mx-auto mb-4 max-w-xs border border-gray-100">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-[13px] text-gray-500 font-medium">Date</span>
                    <span className="text-[13px] text-gray-900 font-semibold">
                      {formatDateLabel(selectedSlotInfo.date)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-[13px] text-gray-500 font-medium">Time</span>
                    <span className="text-[13px] text-gray-900 font-semibold">
                      {formatTime(selectedSlotInfo.start_time)} &ndash;{" "}
                      {formatTime(selectedSlotInfo.end_time)}
                    </span>
                  </div>
                </div>
              )}

              {listing && (
                <p className="text-[13px] text-gray-700 mb-4 flex items-center justify-center gap-1">
                  <MapPinIcon /> {listing.address}
                </p>
              )}

              <p className="text-[13px] text-gray-500">
                A confirmation email has been sent to{" "}
                <strong>{buyerEmail}</strong>.
              </p>
            </div>

            <Footer />
          </div>
        </div>
      </div>
    );
  }

  /* ── Main booking form ─────────────────────────────────────────────── */

  const isFormValid =
    !!selectedSlot && buyerName.trim().length > 0 && buyerEmail.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      <div className="max-w-xl mx-auto px-4 py-8 pb-12">
        <div className="bg-white rounded-2xl p-7 shadow-sm border border-black/5">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <Logo />
            <span className="text-xs font-semibold text-primary bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-wide">
              Book a Showing
            </span>
          </div>

          {/* Property card */}
          {listing && (
            <div className="rounded-xl overflow-hidden border border-gray-200 mb-0">
              {listing.photos && listing.photos.length > 0 && (
                <div className="relative overflow-hidden">
                  <img
                    src={listing.photos[0]}
                    alt={listing.address}
                    className="w-full h-[220px] object-cover block"
                  />
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white font-bold text-lg px-3.5 py-1.5 rounded-lg">
                    {formatPrice(listing.price)}
                  </div>
                </div>
              )}
              <div className="p-4 px-[18px] pb-[18px]">
                <h2 className="text-[17px] font-semibold text-gray-900 leading-tight mb-0.5">
                  {listing.address}
                </h2>
                {listing.title && listing.title !== listing.address && (
                  <p className="text-[13px] text-gray-500 mb-3">{listing.title}</p>
                )}
                <div className="flex gap-5 flex-wrap mt-3">
                  <Stat icon={<BedIcon />} value={listing.bedrooms} label="Beds" />
                  <Stat icon={<BathIcon />} value={listing.bathrooms} label="Baths" />
                  <Stat icon={<RulerIcon />} value={listing.sqft.toLocaleString()} label="Sq Ft" />
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-gray-100 my-6" />

          {/* Step 1 — Select time */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <h3 className="text-base font-semibold text-gray-900">Select a Time</h3>
            </div>

            {Object.keys(groupedSlots).length === 0 ? (
              <div className="text-center py-7 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <CalendarIcon />
                <p className="text-[15px] font-semibold text-gray-700 mt-3 mb-1">No available times</p>
                <p className="text-[13px] text-gray-400 leading-relaxed">
                  There are no open time slots right now. Please check back
                  later or contact the seller directly.
                </p>
              </div>
            ) : (
              Object.entries(groupedSlots).map(([date, dateSlots]) => (
                <div key={date} className="mb-[18px]">
                  <p className="text-[13px] font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <CalendarSmallIcon /> {formatDateLabel(date)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dateSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.id;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot.id)}
                          className={`relative flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] border-[1.5px] text-sm font-medium transition-all ${
                            isSelected
                              ? "bg-gradient-to-br from-primary to-blue-500 border-primary text-white shadow-md shadow-primary/25"
                              : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50"
                          }`}
                        >
                          <span className="font-semibold text-sm">{formatTime(slot.start_time)}</span>
                          <span className={`text-[11px] lowercase ${isSelected ? "text-white/70" : "text-gray-400"}`}>to</span>
                          <span className="font-semibold text-sm">{formatTime(slot.end_time)}</span>
                          {isSelected && (
                            <span className="ml-0.5 flex items-center">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 my-6" />

          {/* Step 2 — Your info */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <h3 className="text-base font-semibold text-gray-900">Your Information</h3>
            </div>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3.5 py-[11px] rounded-[10px] border-[1.5px] border-gray-200 text-[15px] text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-3.5 py-[11px] rounded-[10px] border-[1.5px] border-gray-200 text-[15px] text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-3.5 py-[11px] rounded-[10px] border-[1.5px] border-gray-200 text-[15px] text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] bg-red-50 border border-red-200 text-red-600 text-[13px] font-medium mt-5 mb-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{error}</span>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleBook}
            disabled={booking || !isFormValid}
            className="w-full py-[15px] rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white text-base font-semibold border-none cursor-pointer mt-5 tracking-tight transition-opacity shadow-md shadow-primary/20 disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {booking ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                Booking...
              </span>
            ) : (
              "Confirm & Book Showing"
            )}
          </button>

          <Footer />
        </div>
      </div>
    </div>
  );
}

/* ─── tiny sub-components ───────────────────────────────────────────── */

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-extrabold text-base -tracking-widest">
        S
      </div>
      <span className="text-xl font-bold text-gray-900 -tracking-wide">
        Selfly
      </span>
    </div>
  );
}

function Footer() {
  return (
    <p className="text-center text-xs text-gray-400 mt-7 mb-0 tracking-wide">
      Powered by{" "}
      <span className="font-semibold text-gray-500">Selfly</span>{" "}
      &mdash; For Sale By Owner
    </p>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-500 flex">{icon}</span>
      <span className="font-semibold text-sm text-gray-900">{value}</span>
      <span className="text-[13px] text-gray-500">{label}</span>
    </div>
  );
}

/* ─── inline SVG icons ──────────────────────────────────────────────── */

function BedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>
    </svg>
  );
}

function BathIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z"/><path d="M6 12V5a2 2 0 0 1 2-2h3v2.25"/>
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function CalendarSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="align-[-2px]">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="align-[-2px]">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
