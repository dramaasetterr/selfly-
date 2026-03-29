"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Listing {
  id: string;
  title: string;
  price: number;
  address: string;
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  property_type: string;
  photos: string[];
}

const PROPERTY_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "single_family", label: "Single Family" },
  { value: "condo", label: "Condo / Townhouse" },
  { value: "multi_family", label: "Multi-Family" },
  { value: "land", label: "Land" },
  { value: "mobile", label: "Mobile Home" },
];

const PRICE_RANGES = [
  { value: "", label: "Any Price" },
  { value: "0-200000", label: "Under $200K" },
  { value: "200000-400000", label: "$200K - $400K" },
  { value: "400000-600000", label: "$400K - $600K" },
  { value: "600000-1000000", label: "$600K - $1M" },
  { value: "1000000-999999999", label: "$1M+" },
];

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export default function MarketplacePage() {
  const { user, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [priceRange, setPriceRange] = useState("");

  useEffect(() => {
    async function fetchListings() {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("listings")
          .select("id, title, price, address, city, state, bedrooms, bathrooms, sqft, property_type, photos")
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        setListings(data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load listings.");
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, []);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase.from("favorites").select("listing_id").eq("user_id", user.id).then(({ data }) => {
      if (data) setSavedIds(new Set(data.map((f: any) => f.listing_id)));
    });
  }, [user]);

  const toggleSave = async (e: React.MouseEvent, listingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    const supabase = createClient();
    const isSaved = savedIds.has(listingId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(listingId); else next.add(listingId);
      return next;
    });
    if (isSaved) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", listingId);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, listing_id: listingId });
    }
  };

  const filtered = useMemo(() => {
    let result = listings;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title?.toLowerCase().includes(q) ||
          l.address?.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q)
      );
    }

    if (propertyType) {
      result = result.filter((l) => l.property_type === propertyType);
    }

    if (priceRange) {
      const [min, max] = priceRange.split("-").map(Number);
      result = result.filter((l) => l.price >= min && l.price <= max);
    }

    return result;
  }, [listings, search, propertyType, priceRange]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-navy-light">Loading marketplace...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-navy text-2xl sm:text-3xl">Marketplace</h1>
        <p className="text-navy-light mt-1">Browse active listings from sellers in your area.</p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by address, city, or title..."
          className="w-full px-5 py-3 bg-white border border-gold-muted/40 rounded-2xl focus:ring-2 focus:ring-gold/40 focus:outline-none text-navy placeholder:text-navy-light/40 text-sm shadow-sm"
        />
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PROPERTY_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPropertyType(propertyType === opt.value ? "" : opt.value)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                  propertyType === opt.value
                    ? "bg-navy text-cream shadow-md"
                    : "bg-white text-navy border border-gold-muted/40 hover:border-gold hover:shadow-sm"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {PRICE_RANGES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPriceRange(priceRange === opt.value ? "" : opt.value)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                  priceRange === opt.value
                    ? "bg-navy text-cream shadow-md"
                    : "bg-white text-navy border border-gold-muted/40 hover:border-gold hover:shadow-sm"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-error rounded-2xl p-4 border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Results Count */}
      <p className="text-sm text-navy-light">
        {filtered.length} {filtered.length === 1 ? "listing" : "listings"} found
      </p>

      {/* Listings Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gold-muted/30 p-12 text-center">
          <p className="text-navy-light">No listings match your criteria. Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((listing) => {
            const photo = listing.photos?.[0];
            return (
              <Link
                key={listing.id}
                href={`/marketplace/${listing.id}`}
                className="bg-white rounded-2xl border border-gold-muted/30 overflow-hidden hover:shadow-lg transition group"
              >
                {/* Photo */}
                <div className="relative w-full h-48 bg-cream-light">
                  {photo ? (
                    <Image
                      src={photo}
                      alt={listing.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-4xl text-navy-light/20">{"\u2302"}</span>
                    </div>
                  )}
                  {/* Save heart */}
                  <button
                    onClick={(e) => toggleSave(e, listing.id)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow hover:scale-110 transition z-10"
                  >
                    <span className="text-sm">{savedIds.has(listing.id) ? "❤️" : "🤍"}</span>
                  </button>
                  {listing.photos?.length > 1 && (
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                      📷 {listing.photos.length}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <p className="text-xl font-bold text-navy">{formatCurrency(listing.price)}</p>
                  <p className="text-sm font-medium text-navy mt-1 truncate">{listing.title}</p>
                  <p className="text-xs text-navy-light mt-0.5 truncate">
                    {listing.address}
                    {listing.city ? `, ${listing.city}` : ""}
                    {listing.state ? `, ${listing.state}` : ""}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-navy-light">
                    {listing.bedrooms != null && (
                      <span>{listing.bedrooms} bd</span>
                    )}
                    {listing.bathrooms != null && (
                      <span>{listing.bathrooms} ba</span>
                    )}
                    {listing.sqft != null && (
                      <span>{listing.sqft.toLocaleString()} sqft</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
