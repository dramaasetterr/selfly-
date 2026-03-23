"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";

interface Listing {
  id: string;
  user_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  year_built: number | null;
  lot_size: string | null;
  price: number | null;
  features: string[];
  condition: string;
  photos: string[];
  description: string;
  status: string;
  created_at: string;
}

export default function ListingDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  // Contact form state
  const [contactMessage, setContactMessage] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  // Booking form state
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingSending, setBookingSending] = useState(false);
  const [bookingSent, setBookingSent] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchListing();
  }, [id]);

  const fetchListing = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error("Listing not found");

      setListing(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load listing";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const sendContactMessage = async () => {
    if (!listing || !contactMessage.trim()) return;
    setContactSending(true);
    try {
      await supabase.from("messages").insert({
        listing_id: listing.id,
        seller_id: listing.user_id,
        buyer_id: user?.id,
        content: contactMessage,
      });
      setContactSent(true);
      setContactMessage("");
    } catch {
      setError("Failed to send message");
    } finally {
      setContactSending(false);
    }
  };

  const bookShowing = async () => {
    if (!listing || !bookingDate || !bookingTime) return;
    setBookingSending(true);
    try {
      await supabase.from("showings").insert({
        listing_id: listing.id,
        listing_address: `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`,
        buyer_name: bookingName || user?.user_metadata?.full_name || "Buyer",
        buyer_email: bookingEmail || user?.email || "",
        buyer_phone: bookingPhone,
        date: bookingDate,
        time: bookingTime,
        status: "pending",
        message: bookingMessage,
      });
      setBookingSent(true);
    } catch {
      setError("Failed to book showing");
    } finally {
      setBookingSending(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold" />
      </div>
    );
  }

  if (error && !listing) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push("/marketplace")}
          className="flex items-center gap-2 text-navy-light hover:text-navy transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Marketplace
        </button>
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const photos = listing.photos?.length ? listing.photos : [];
  const fullAddress = `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push("/marketplace")}
        className="flex items-center gap-2 text-navy-light hover:text-navy transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Marketplace
      </button>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* Photo Gallery */}
      {photos.length > 0 ? (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-gold-muted/30 bg-cream-light">
            <img
              src={photos[selectedPhoto]}
              alt={`Photo ${selectedPhoto + 1}`}
              className="w-full h-[400px] object-cover"
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedPhoto((p) => (p === 0 ? photos.length - 1 : p - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                >
                  <svg className="w-5 h-5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setSelectedPhoto((p) => (p === photos.length - 1 ? 0 : p + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                >
                  <svg className="w-5 h-5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="absolute bottom-3 right-3 bg-navy/70 text-cream text-xs px-2.5 py-1 rounded-full">
                  {selectedPhoto + 1} / {photos.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((photo, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedPhoto(i)}
                  className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                    i === selectedPhoto ? "border-gold" : "border-gold-muted/30 hover:border-gold/50"
                  }`}
                >
                  <img src={photo} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="h-[300px] bg-cream-light rounded-2xl border border-gold-muted/30 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-gold-dark opacity-30 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-navy-light">No photos available</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Title & Price */}
          <div className="bg-white rounded-2xl border border-gold-muted/30 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="font-heading font-bold text-navy text-2xl">{fullAddress}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-navy-light">{listing.property_type}</span>
                  {listing.condition && (
                    <>
                      <span className="text-gold-muted">|</span>
                      <span className="text-sm text-navy-light">{listing.condition} condition</span>
                    </>
                  )}
                </div>
              </div>
              {listing.price && (
                <p className="font-heading font-bold text-gold-dark text-3xl">
                  {formatPrice(listing.price)}
                </p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gold-muted/20">
              {[
                { label: "Beds", value: listing.beds, icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
                { label: "Baths", value: listing.baths, icon: "M8 7h.01M12 7h.01M16 7h.01M3 12h18M3 16h18M3 20h18" },
                { label: "Sq Ft", value: listing.sqft?.toLocaleString(), icon: "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" },
                { label: "Year Built", value: listing.year_built, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-3 rounded-xl bg-gold-bg/50">
                  <p className="text-2xl font-bold text-navy">{stat.value || "--"}</p>
                  <p className="text-xs text-navy-light mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {listing.lot_size && (
              <p className="text-sm text-navy-light mt-3">
                <span className="font-medium text-navy">Lot Size:</span> {listing.lot_size}
              </p>
            )}
          </div>

          {/* Description */}
          {listing.description && (
            <div className="bg-white rounded-2xl border border-gold-muted/30 p-6">
              <h2 className="font-heading font-bold text-navy text-lg mb-3">Description</h2>
              <p className="text-navy-light leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}

          {/* Features */}
          {listing.features?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gold-muted/30 p-6">
              <h2 className="font-heading font-bold text-navy text-lg mb-3">Features</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {listing.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gold-dark flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-navy">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Actions */}
        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-3">
            <h2 className="font-heading font-bold text-navy text-lg">Interested?</h2>

            <button
              onClick={() => { setShowContact(true); setShowBooking(false); }}
              className="w-full bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-4 py-3 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Seller
            </button>

            <button
              onClick={() => { setShowBooking(true); setShowContact(false); }}
              className="w-full bg-navy hover:bg-navy-light text-cream rounded-xl px-4 py-3 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book a Showing
            </button>
          </div>

          {/* Contact Form */}
          {showContact && (
            <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-4">
              <h3 className="font-heading font-bold text-navy text-lg">Send a Message</h3>

              {contactSent ? (
                <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-200 text-sm">
                  Message sent successfully! The seller will get back to you soon.
                </div>
              ) : (
                <>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    rows={4}
                    placeholder="Hi, I'm interested in this property..."
                    className="w-full px-4 py-3 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy resize-y"
                  />
                  <button
                    onClick={sendContactMessage}
                    disabled={contactSending || !contactMessage.trim()}
                    className="w-full bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
                  >
                    {contactSending ? "Sending..." : "Send Message"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Booking Form */}
          {showBooking && (
            <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-4">
              <h3 className="font-heading font-bold text-navy text-lg">Book a Showing</h3>

              {bookingSent ? (
                <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-200 text-sm">
                  Showing request submitted! The seller will confirm your booking.
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">Your Name</label>
                    <input
                      type="text"
                      value={bookingName}
                      onChange={(e) => setBookingName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">Email</label>
                    <input
                      type="email"
                      value={bookingEmail}
                      onChange={(e) => setBookingEmail(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">Phone</label>
                    <input
                      type="tel"
                      value={bookingPhone}
                      onChange={(e) => setBookingPhone(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-1">Date</label>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy mb-1">Time</label>
                      <select
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
                      >
                        <option value="">Select time</option>
                        {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map((t) => {
                          const h = parseInt(t.split(":")[0]);
                          const label = `${h % 12 || 12}:00 ${h >= 12 ? "PM" : "AM"}`;
                          return <option key={t} value={t}>{label}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">Message (optional)</label>
                    <textarea
                      value={bookingMessage}
                      onChange={(e) => setBookingMessage(e.target.value)}
                      rows={3}
                      placeholder="Any questions or special requests..."
                      className="w-full px-4 py-3 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy resize-y"
                    />
                  </div>
                  <button
                    onClick={bookShowing}
                    disabled={bookingSending || !bookingDate || !bookingTime}
                    className="w-full bg-navy hover:bg-navy-light text-cream font-semibold rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
                  >
                    {bookingSending ? "Submitting..." : "Request Showing"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
