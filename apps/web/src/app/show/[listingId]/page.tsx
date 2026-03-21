"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ShowingAvailability, BookShowingInput } from "@selfly/shared";

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

function formatPrice(price: number): string {
  return "$" + price.toLocaleString();
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

export default function BookShowingPage() {
  const params = useParams();
  const listingId = params.listingId as string;

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
        // Fetch availability
        const availRes = await fetch(`/api/showings/availability/${listingId}`);
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
            }
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

  const groupedSlots: GroupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as GroupedSlots);

  const handleBook = async () => {
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

      const res = await fetch("/api/showings/book", {
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
  };

  if (loading) {
    return (
      <div style={pageStyles.container}>
        <div style={pageStyles.card}>
          <div style={pageStyles.loadingSpinner}>Loading...</div>
        </div>
      </div>
    );
  }

  if (booked) {
    return (
      <div style={pageStyles.container}>
        <div style={pageStyles.card}>
          <div style={pageStyles.confirmationIcon}>&#10003;</div>
          <h1 style={pageStyles.confirmTitle}>Showing Confirmed!</h1>
          <p style={pageStyles.confirmText}>
            Your showing has been booked. The seller has been notified and will
            expect you at the scheduled time.
          </p>
          <p style={pageStyles.confirmDetail}>
            A confirmation has been sent to <strong>{buyerEmail}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyles.container}>
      <div style={pageStyles.card}>
        {/* Header */}
        <div style={pageStyles.brandHeader}>
          <span style={pageStyles.brandName}>Selfly</span>
          <span style={pageStyles.brandTag}>Book a Showing</span>
        </div>

        {/* Property Summary */}
        {listing && (
          <div style={pageStyles.propertySummary}>
            {listing.photos && listing.photos.length > 0 && (
              <img
                src={listing.photos[0]}
                alt={listing.address}
                style={pageStyles.propertyImage}
              />
            )}
            <div style={pageStyles.propertyInfo}>
              <h2 style={pageStyles.propertyAddress}>{listing.address}</h2>
              <p style={pageStyles.propertyPrice}>{formatPrice(listing.price)}</p>
              <p style={pageStyles.propertyDetails}>
                {listing.bedrooms} bed &middot; {listing.bathrooms} bath &middot;{" "}
                {listing.sqft.toLocaleString()} sqft
              </p>
            </div>
          </div>
        )}

        {/* Available Time Slots */}
        <h3 style={pageStyles.sectionTitle}>Select a Time</h3>

        {Object.keys(groupedSlots).length === 0 ? (
          <p style={pageStyles.noSlots}>
            No available time slots at the moment. Please check back later.
          </p>
        ) : (
          Object.entries(groupedSlots).map(([date, dateSlots]) => (
            <div key={date} style={pageStyles.dateGroup}>
              <p style={pageStyles.dateLabel}>{formatDateLabel(date)}</p>
              <div style={pageStyles.slotsGrid}>
                {dateSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot.id)}
                    style={{
                      ...pageStyles.slotButton,
                      ...(selectedSlot === slot.id
                        ? pageStyles.slotButtonSelected
                        : {}),
                    }}
                  >
                    {formatTime(slot.start_time)} — {formatTime(slot.end_time)}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Buyer Form */}
        <h3 style={pageStyles.sectionTitle}>Your Information</h3>

        <div style={pageStyles.formGroup}>
          <label style={pageStyles.label}>Name *</label>
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="Full name"
            style={pageStyles.input}
          />
        </div>

        <div style={pageStyles.formGroup}>
          <label style={pageStyles.label}>Email *</label>
          <input
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            placeholder="your@email.com"
            style={pageStyles.input}
          />
        </div>

        <div style={pageStyles.formGroup}>
          <label style={pageStyles.label}>Phone</label>
          <input
            type="tel"
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
            placeholder="(555) 123-4567"
            style={pageStyles.input}
          />
        </div>

        {error && <p style={pageStyles.error}>{error}</p>}

        <button
          onClick={handleBook}
          disabled={booking || !selectedSlot}
          style={{
            ...pageStyles.bookButton,
            ...(!selectedSlot || booking ? pageStyles.bookButtonDisabled : {}),
          }}
        >
          {booking ? "Booking..." : "Book Showing"}
        </button>

        <p style={pageStyles.footer}>
          Powered by <strong>Selfly</strong> — For Sale By Owner
        </p>
      </div>
    </div>
  );
}

const pageStyles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#F3F4F6",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "24px 16px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    margin: "0 auto",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
  },
  brandHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  brandName: {
    fontSize: 22,
    fontWeight: 700,
    color: "#2563EB",
  },
  brandTag: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: 500,
  },
  propertySummary: {
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #E5E7EB",
    marginBottom: 24,
  },
  propertyImage: {
    width: "100%",
    height: 200,
    objectFit: "cover" as const,
    display: "block",
  },
  propertyInfo: {
    padding: 16,
  },
  propertyAddress: {
    fontSize: 18,
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 4px",
  },
  propertyPrice: {
    fontSize: 22,
    fontWeight: 700,
    color: "#2563EB",
    margin: "0 0 4px",
  },
  propertyDetails: {
    fontSize: 14,
    color: "#6B7280",
    margin: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 12px",
  },
  noSlots: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center" as const,
    padding: "16px 0",
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    margin: "0 0 8px",
  },
  slotsGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 8,
  },
  slotButton: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    fontSize: 14,
    color: "#374151",
    transition: "all 0.15s",
  },
  slotButtonSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
    color: "#FFFFFF",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    fontSize: 15,
    color: "#111827",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  error: {
    color: "#DC2626",
    fontSize: 14,
    marginBottom: 12,
  },
  bookButton: {
    width: "100%",
    padding: "14px 0",
    borderRadius: 10,
    backgroundColor: "#2563EB",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    marginTop: 8,
  },
  bookButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  footer: {
    textAlign: "center" as const,
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 20,
    marginBottom: 0,
  },
  loadingSpinner: {
    textAlign: "center" as const,
    padding: 40,
    color: "#6B7280",
    fontSize: 16,
  },
  confirmationIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DCFCE7",
    color: "#16A34A",
    fontSize: 28,
    fontWeight: 700,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "0 auto 16px",
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    textAlign: "center" as const,
    margin: "0 0 8px",
  },
  confirmText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center" as const,
    margin: "0 0 8px",
    lineHeight: 1.5,
  },
  confirmDetail: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center" as const,
    margin: 0,
  },
};
