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

/* ─── CSS-in-JS keyframes (injected once) ───────────────────────────── */

const KEYFRAMES = `
@keyframes selflyPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes selflyFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes selflyCheckPop {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes selflySpin {
  to { transform: rotate(360deg); }
}
`;

function useInjectKeyframes() {
  useEffect(() => {
    const id = "selfly-booking-keyframes";
    if (typeof document !== "undefined" && !document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = KEYFRAMES;
      document.head.appendChild(style);
    }
  }, []);
}

/* ─── component ─────────────────────────────────────────────────────── */

export default function BookShowingPage() {
  useInjectKeyframes();

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
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch availability
        const availRes = await fetch(
          `${API_BASE}/api/showings/availability/${listingId}`,
        );
        const availData = await availRes.json();
        if (availData.slots) setSlots(availData.slots);

        // Fetch listing info via Supabase REST (anon key from env)
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
      <div style={S.page}>
        <div style={S.wrapper}>
          <div style={S.card}>
            <div style={S.loadingContainer}>
              <div style={S.spinner} />
              <p style={S.loadingText}>Loading property details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Success state ─────────────────────────────────────────────────── */

  if (booked) {
    return (
      <div style={S.page}>
        <div style={S.wrapper}>
          <div style={S.card}>
            {/* Header */}
            <div style={S.header}>
              <Logo />
            </div>

            <div style={S.successContainer}>
              <div style={S.checkCircle}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 style={S.successTitle}>Showing Confirmed!</h1>
              <p style={S.successBody}>
                Your showing has been booked successfully. The seller has been
                notified and will expect you at the scheduled time.
              </p>

              {selectedSlotInfo && (
                <div style={S.confirmationCard}>
                  <div style={S.confirmRow}>
                    <span style={S.confirmLabel}>Date</span>
                    <span style={S.confirmValue}>
                      {formatDateLabel(selectedSlotInfo.date)}
                    </span>
                  </div>
                  <div style={{ ...S.confirmRow, border: "none" }}>
                    <span style={S.confirmLabel}>Time</span>
                    <span style={S.confirmValue}>
                      {formatTime(selectedSlotInfo.start_time)} &ndash;{" "}
                      {formatTime(selectedSlotInfo.end_time)}
                    </span>
                  </div>
                </div>
              )}

              {listing && (
                <p style={S.confirmAddress}>
                  <MapPinIcon /> {listing.address}
                </p>
              )}

              <p style={S.confirmEmail}>
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
    <div style={S.page}>
      <div style={S.wrapper}>
        <div style={S.card}>
          {/* Header */}
          <div style={S.header}>
            <Logo />
            <span style={S.headerBadge}>Book a Showing</span>
          </div>

          {/* Property card */}
          {listing && (
            <div style={S.propertyCard}>
              {listing.photos && listing.photos.length > 0 && (
                <div style={S.propertyImageWrap}>
                  <img
                    src={listing.photos[0]}
                    alt={listing.address}
                    style={S.propertyImage}
                  />
                  <div style={S.propertyPriceBadge}>
                    {formatPrice(listing.price)}
                  </div>
                </div>
              )}
              <div style={S.propertyBody}>
                <h2 style={S.propertyAddress}>{listing.address}</h2>
                {listing.title && listing.title !== listing.address && (
                  <p style={S.propertyTitle}>{listing.title}</p>
                )}
                <div style={S.propertyStats}>
                  <Stat
                    icon={<BedIcon />}
                    value={listing.bedrooms}
                    label="Beds"
                  />
                  <Stat
                    icon={<BathIcon />}
                    value={listing.bathrooms}
                    label="Baths"
                  />
                  <Stat
                    icon={<RulerIcon />}
                    value={listing.sqft.toLocaleString()}
                    label="Sq Ft"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div style={S.divider} />

          {/* Step 1 — Select time */}
          <div style={S.section}>
            <div style={S.sectionHeader}>
              <span style={S.stepBadge}>1</span>
              <h3 style={S.sectionTitle}>Select a Time</h3>
            </div>

            {Object.keys(groupedSlots).length === 0 ? (
              <div style={S.emptyState}>
                <CalendarIcon />
                <p style={S.emptyTitle}>No available times</p>
                <p style={S.emptyBody}>
                  There are no open time slots right now. Please check back
                  later or contact the seller directly.
                </p>
              </div>
            ) : (
              Object.entries(groupedSlots).map(([date, dateSlots]) => (
                <div key={date} style={S.dateGroup}>
                  <p style={S.dateLabel}>
                    <CalendarSmallIcon /> {formatDateLabel(date)}
                  </p>
                  <div style={S.slotsRow}>
                    {dateSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.id;
                      const isHovered = hoveredSlot === slot.id;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot.id)}
                          onMouseEnter={() => setHoveredSlot(slot.id)}
                          onMouseLeave={() => setHoveredSlot(null)}
                          style={{
                            ...S.slotBtn,
                            ...(isSelected
                              ? S.slotBtnSelected
                              : isHovered
                                ? S.slotBtnHover
                                : {}),
                          }}
                        >
                          <span style={S.slotTime}>
                            {formatTime(slot.start_time)}
                          </span>
                          <span
                            style={{
                              ...S.slotDash,
                              color: isSelected ? "rgba(255,255,255,0.7)" : "#9ca3af",
                            }}
                          >
                            to
                          </span>
                          <span style={S.slotTime}>
                            {formatTime(slot.end_time)}
                          </span>
                          {isSelected && (
                            <span style={S.slotCheck}>
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
          <div style={S.divider} />

          {/* Step 2 — Your info */}
          <div style={S.section}>
            <div style={S.sectionHeader}>
              <span style={S.stepBadge}>2</span>
              <h3 style={S.sectionTitle}>Your Information</h3>
            </div>

            <div style={S.formGrid}>
              <div style={S.field}>
                <label style={S.label}>
                  Full Name <span style={S.required}>*</span>
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Jane Smith"
                  style={S.input}
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>
                  Email Address <span style={S.required}>*</span>
                </label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="jane@example.com"
                  style={S.input}
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>Phone Number</label>
                <input
                  type="tel"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  style={S.input}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={S.errorBanner}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{error}</span>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleBook}
            disabled={booking || !isFormValid}
            style={{
              ...S.ctaButton,
              ...(booking || !isFormValid ? S.ctaButtonDisabled : {}),
            }}
          >
            {booking ? (
              <span style={S.ctaInner}>
                <span style={S.ctaSpinner} /> Booking...
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
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: -1,
        }}
      >
        S
      </div>
      <span style={{ fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
        Selfly
      </span>
    </div>
  );
}

function Footer() {
  return (
    <p
      style={{
        textAlign: "center",
        fontSize: 12,
        color: "#9ca3af",
        marginTop: 28,
        marginBottom: 0,
        letterSpacing: "0.01em",
      }}
    >
      Powered by{" "}
      <span style={{ fontWeight: 600, color: "#6b7280" }}>Selfly</span>{" "}
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
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "#6b7280", display: "flex" }}>{icon}</span>
      <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
        {value}
      </span>
      <span style={{ fontSize: 13, color: "#6b7280" }}>{label}</span>
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
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function CalendarSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px" }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px" }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

/* ─── styles ────────────────────────────────────────────────────────── */

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const S: { [key: string]: React.CSSProperties } = {
  /* layout */
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f0f4ff 0%, #f9fafb 50%)",
    fontFamily: FONT,
    WebkitFontSmoothing: "antialiased",
  },
  wrapper: {
    maxWidth: 560,
    margin: "0 auto",
    padding: "32px 16px 48px",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "28px 28px 24px",
    boxShadow:
      "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.04)",
    animation: "selflyFadeIn 0.4s ease-out",
  },

  /* header */
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerBadge: {
    fontSize: 12,
    fontWeight: 600,
    color: "#2563eb",
    background: "#eff6ff",
    padding: "5px 12px",
    borderRadius: 20,
    letterSpacing: "0.02em",
    textTransform: "uppercase" as const,
  },

  /* property card */
  propertyCard: {
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #e5e7eb",
    marginBottom: 0,
  },
  propertyImageWrap: {
    position: "relative" as const,
    overflow: "hidden",
  },
  propertyImage: {
    width: "100%",
    height: 220,
    objectFit: "cover" as const,
    display: "block",
  },
  propertyPriceBadge: {
    position: "absolute" as const,
    bottom: 12,
    left: 12,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(8px)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 18,
    padding: "6px 14px",
    borderRadius: 8,
    letterSpacing: "-0.01em",
  },
  propertyBody: {
    padding: "16px 18px 18px",
  },
  propertyAddress: {
    fontSize: 17,
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 2px",
    lineHeight: 1.3,
  },
  propertyTitle: {
    fontSize: 13,
    color: "#6b7280",
    margin: "0 0 12px",
  },
  propertyStats: {
    display: "flex",
    gap: 20,
    flexWrap: "wrap" as const,
    marginTop: 12,
  },

  /* divider */
  divider: {
    height: 1,
    background: "#f3f4f6",
    margin: "24px 0",
  },

  /* sections */
  section: {
    marginBottom: 0,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#111827",
    margin: 0,
  },

  /* empty state */
  emptyState: {
    textAlign: "center" as const,
    padding: "28px 16px",
    background: "#f9fafb",
    borderRadius: 12,
    border: "1px dashed #d1d5db",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#374151",
    margin: "12px 0 4px",
  },
  emptyBody: {
    fontSize: 13,
    color: "#9ca3af",
    margin: 0,
    lineHeight: 1.5,
  },

  /* date groups & slots */
  dateGroup: {
    marginBottom: 18,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    margin: "0 0 8px",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  slotsRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 8,
  },
  slotBtn: {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 16px",
    borderRadius: 10,
    border: "1.5px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    color: "#374151",
    fontFamily: FONT,
    transition: "all 0.15s ease",
  },
  slotBtnHover: {
    borderColor: "#93c5fd",
    background: "#f0f7ff",
  },
  slotBtnSelected: {
    background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
    borderColor: "#2563eb",
    color: "#fff",
    boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
  },
  slotTime: {
    fontWeight: 600,
    fontSize: 14,
  },
  slotDash: {
    fontSize: 11,
    textTransform: "lowercase" as const,
  },
  slotCheck: {
    marginLeft: 2,
    display: "flex",
    alignItems: "center",
  },

  /* form */
  formGrid: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 14,
  },
  field: {},
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 5,
  },
  required: {
    color: "#ef4444",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    border: "1.5px solid #e5e7eb",
    fontSize: 15,
    color: "#111827",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: FONT,
    transition: "border-color 0.15s ease",
  },

  /* error */
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 10,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    fontSize: 13,
    fontWeight: 500,
    marginTop: 20,
    marginBottom: 4,
  },

  /* CTA button */
  ctaButton: {
    width: "100%",
    padding: "15px 0",
    borderRadius: 12,
    background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    marginTop: 20,
    fontFamily: FONT,
    letterSpacing: "-0.01em",
    transition: "opacity 0.15s ease, transform 0.1s ease",
    boxShadow: "0 2px 8px rgba(37,99,235,0.2)",
  },
  ctaButtonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  ctaInner: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  ctaSpinner: {
    width: 16,
    height: 16,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "selflySpin 0.6s linear infinite",
    display: "inline-block",
  },

  /* loading */
  loadingContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    padding: "48px 0",
    gap: 16,
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #e5e7eb",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "selflySpin 0.7s linear infinite",
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
    margin: 0,
    animation: "selflyPulse 1.5s ease-in-out infinite",
  },

  /* success */
  successContainer: {
    textAlign: "center" as const,
    padding: "8px 0 0",
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    background: "#f0fdf4",
    border: "2px solid #bbf7d0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    animation: "selflyCheckPop 0.4s ease-out",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 8px",
    letterSpacing: "-0.02em",
  },
  successBody: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 1.6,
    margin: "0 0 20px",
    maxWidth: 380,
    marginLeft: "auto",
    marginRight: "auto",
  },
  confirmationCard: {
    background: "#f9fafb",
    borderRadius: 12,
    padding: "2px 16px",
    margin: "0 auto 16px",
    maxWidth: 320,
    border: "1px solid #f3f4f6",
  },
  confirmRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  confirmLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: 500,
  },
  confirmValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: 600,
  },
  confirmAddress: {
    fontSize: 13,
    color: "#374151",
    margin: "0 0 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  confirmEmail: {
    fontSize: 13,
    color: "#6b7280",
    margin: 0,
  },
};
