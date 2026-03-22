"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import type { ShowingAvailability, BookShowingInput } from '@/shared';

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
  const [buyerMessage, setBuyerMessage] = useState("");
  const [activePhoto, setActivePhoto] = useState(0);
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
      <div className="min-h-screen bg-white">
        <Nav />
        <div className="max-w-4xl mx-auto px-6 py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-gray-500 animate-pulse">Loading property details...</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Success state ─────────────────────────────────────────────────── */

  if (booked) {
    return (
      <div className="min-h-screen bg-white">
        <Nav />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Showing Confirmed!
          </h1>
          <p className="mt-4 text-gray-500 max-w-md mx-auto leading-relaxed">
            Your showing has been booked successfully. The seller has been
            notified and will expect you at the scheduled time.
          </p>

          {selectedSlotInfo && (
            <div className="mt-8 bg-gray-50 rounded-2xl p-6 max-w-sm mx-auto border border-gray-100">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-500 font-medium">Date</span>
                <span className="text-sm text-gray-900 font-semibold">
                  {formatDateLabel(selectedSlotInfo.date)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500 font-medium">Time</span>
                <span className="text-sm text-gray-900 font-semibold">
                  {formatTime(selectedSlotInfo.start_time)} &ndash;{" "}
                  {formatTime(selectedSlotInfo.end_time)}
                </span>
              </div>
            </div>
          )}

          {listing && (
            <p className="mt-6 text-sm text-gray-600 flex items-center justify-center gap-1.5">
              <MapPinIcon /> {listing.address}
            </p>
          )}

          <p className="mt-4 text-sm text-gray-500">
            A confirmation email has been sent to{" "}
            <strong className="text-gray-700">{buyerEmail}</strong>.
          </p>

          <PoweredByFooter />
        </div>
      </div>
    );
  }

  /* ── Main booking page ───────────────────────────────────────────── */

  const isFormValid =
    !!selectedSlot && buyerName.trim().length > 0 && buyerEmail.trim().length > 0;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Nav />

      {/* Hero / Property Section */}
      {listing && (
        <section className="relative">
          {/* Photo gallery */}
          {listing.photos && listing.photos.length > 0 ? (
            <div className="relative bg-gray-100">
              <img
                src={listing.photos[activePhoto]}
                alt={listing.address}
                className="w-full h-[300px] sm:h-[400px] lg:h-[480px] object-cover"
              />
              {/* Photo count badge */}
              {listing.photos.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full">
                  {activePhoto + 1} / {listing.photos.length}
                </div>
              )}
              {/* Thumbnail strip */}
              {listing.photos.length > 1 && (
                <div className="absolute bottom-4 left-4 flex gap-2">
                  {listing.photos.slice(0, 5).map((photo, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePhoto(i)}
                      className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition ${
                        activePhoto === i
                          ? "border-white shadow-lg"
                          : "border-white/40 hover:border-white/70"
                      }`}
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-[240px] bg-gradient-to-br from-blue-50 via-white to-blue-50" />
          )}

          {/* Property info bar */}
          <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-10">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                    {formatPrice(listing.price)}
                  </h1>
                  <p className="mt-1 text-base text-gray-600 flex items-center gap-1.5">
                    <MapPinIcon /> {listing.address}
                  </p>
                  {listing.title && listing.title !== listing.address && (
                    <p className="mt-1 text-sm text-gray-400">{listing.title}</p>
                  )}
                </div>
                <span className="text-xs font-semibold text-primary bg-blue-50 px-4 py-2 rounded-full uppercase tracking-wide self-start">
                  Book a Showing
                </span>
              </div>

              {/* Property stats */}
              <div className="mt-6 flex flex-wrap gap-6 sm:gap-10">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary">
                    <BedIcon />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{listing.bedrooms}</p>
                    <p className="text-xs text-gray-500">Beds</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary">
                    <BathIcon />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{listing.bathrooms}</p>
                    <p className="text-xs text-gray-500">Baths</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary">
                    <RulerIcon />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{listing.sqft.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Sq Ft</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Booking content */}
      <section className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">

          {/* Left: Time slots */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <h2 className="text-xl font-extrabold tracking-tight">Select a Time</h2>
            </div>

            {Object.keys(groupedSlots).length === 0 ? (
              <div className="text-center py-12 px-6 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                <CalendarIcon />
                <p className="text-lg font-bold text-gray-700 mt-4 mb-2">No available times</p>
                <p className="text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
                  There are no open time slots right now. Please check back
                  later or contact the seller directly.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedSlots).map(([date, dateSlots]) => (
                  <div key={date}>
                    <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <CalendarSmallIcon /> {formatDateLabel(date)}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {dateSlots.map((slot) => {
                        const isSelected = selectedSlot === slot.id;
                        return (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot.id)}
                            className={`relative flex flex-col items-center gap-0.5 px-4 py-4 rounded-xl border-2 text-sm font-medium transition-all ${
                              isSelected
                                ? "bg-primary border-primary text-white shadow-lg shadow-blue-200"
                                : "border-gray-200 bg-white text-gray-700 hover:border-primary/40 hover:shadow-md"
                            }`}
                          >
                            <span className="font-bold text-base">{formatTime(slot.start_time)}</span>
                            <span className={`text-xs ${isSelected ? "text-blue-200" : "text-gray-400"}`}>
                              to {formatTime(slot.end_time)}
                            </span>
                            {isSelected && (
                              <span className="absolute top-2 right-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Booking form */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <h2 className="text-xl font-extrabold tracking-tight">Your Information</h2>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Message <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={buyerMessage}
                    onChange={(e) => setBuyerMessage(e.target.value)}
                    placeholder="Any questions or special requests..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition resize-none"
                  />
                </div>
              </div>

              {/* Selected time summary */}
              {selectedSlotInfo && (
                <div className="mt-5 flex items-center gap-2 text-sm text-accent font-medium bg-accent/10 px-4 py-3 rounded-xl">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {formatDateLabel(selectedSlotInfo.date)}, {formatTime(selectedSlotInfo.start_time)} &ndash; {formatTime(selectedSlotInfo.end_time)}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleBook}
                disabled={booking || !isFormValid}
                className="w-full py-4 rounded-xl bg-primary hover:bg-blue-700 text-white text-base font-semibold mt-5 transition shadow-lg shadow-blue-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
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
            </div>
          </div>
        </div>
      </section>

      {/* Trust / Footer */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-4 text-gray-400 text-sm font-medium">
            <span className="flex items-center gap-1.5">
              <span className="text-accent">&#10003;</span> Verified Listing
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-accent">&#10003;</span> Secure Booking
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-accent">&#10003;</span> Instant Confirmation
            </span>
          </div>
          <p className="text-sm text-gray-400">
            Powered by{" "}
            <span className="font-semibold text-primary">Chiavo</span>{" "}
            &mdash; For Sale By Owner
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ─── tiny sub-components ───────────────────────────────────────────── */

function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <a href="/" className="text-2xl font-extrabold tracking-tight text-primary">
          Chiavo
        </a>
        <span className="text-sm font-medium text-gray-500">Schedule a Showing</span>
      </div>
    </nav>
  );
}

function PoweredByFooter() {
  return (
    <p className="text-center text-sm text-gray-400 mt-12">
      Powered by{" "}
      <span className="font-semibold text-primary">Chiavo</span>{" "}
      &mdash; For Sale By Owner
    </p>
  );
}

/* ─── inline SVG icons ──────────────────────────────────────────────── */

function BedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>
    </svg>
  );
}

function BathIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z"/><path d="M6 12V5a2 2 0 0 1 2-2h3v2.25"/>
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="align-[-2px] shrink-0">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

