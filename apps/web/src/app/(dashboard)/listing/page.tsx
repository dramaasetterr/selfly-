"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const STEPS = [
  "Property Details",
  "Features & Condition",
  "Photos",
  "Description",
  "Review & Publish",
];

const PROPERTY_TYPES = [
  "Single Family",
  "Condo",
  "Townhouse",
  "Multi-Family",
  "Land",
  "Commercial",
];

const CONDITION_OPTIONS = [
  "Excellent",
  "Good",
  "Fair",
  "Needs Renovation",
  "Fixer-Upper",
];

const FEATURE_OPTIONS = [
  "Pool",
  "Garage",
  "Fireplace",
  "Central AC",
  "Hardwood Floors",
  "Updated Kitchen",
  "Finished Basement",
  "Solar Panels",
  "Smart Home",
  "Waterfront",
  "Mountain View",
  "Gated Community",
  "HOA",
  "New Roof",
  "EV Charger",
  "Home Office",
];

interface ListingData {
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: string;
  beds: number | "";
  baths: number | "";
  sqft: number | "";
  year_built: number | "";
  lot_size: string;
  price: number | "";
  features: string[];
  condition: string;
  photos: File[];
  photo_urls: string[];
  description: string;
}

const initialData: ListingData = {
  address: "",
  city: "",
  state: "",
  zip: "",
  property_type: "Single Family",
  beds: "",
  baths: "",
  sqft: "",
  year_built: "",
  lot_size: "",
  price: "",
  features: [],
  condition: "Good",
  photos: [],
  photo_urls: [],
  description: "",
};

export default function ListingBuilderPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [data, setData] = useState<ListingData>(initialData);
  const [publishing, setPublishing] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const updateField = (field: keyof ListingData, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFeature = (feature: string) => {
    setData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handlePhotos = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setData((prev) => ({ ...prev, photos: [...prev.photos, ...files] }));
    const previews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews((prev) => [...prev, ...previews]);
  }, []);

  const removePhoto = (index: number) => {
    setData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const generateDescription = async () => {
    setGeneratingDesc(true);
    setError(null);
    try {
      const res = await fetch("/api/listing-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: `${data.address}, ${data.city}, ${data.state} ${data.zip}`,
          property_type: data.property_type,
          beds: data.beds,
          baths: data.baths,
          sqft: data.sqft,
          year_built: data.year_built,
          lot_size: data.lot_size,
          features: data.features,
          condition: data.condition,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate description");
      const result = await res.json();
      updateField("description", result.description);
    } catch (err) {
      setError("Failed to generate description. Please try again or write your own.");
    } finally {
      setGeneratingDesc(false);
    }
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of data.photos) {
      const ext = file.name.split(".").pop();
      const path = `listings/${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("listing-photos")
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("listing-photos")
        .getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      let photoUrls = data.photo_urls;
      if (data.photos.length > 0) {
        photoUrls = await uploadPhotos();
      }

      const { error: insertError } = await supabase.from("listings").insert({
        user_id: user!.id,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        property_type: data.property_type,
        beds: data.beds || null,
        baths: data.baths || null,
        sqft: data.sqft || null,
        year_built: data.year_built || null,
        lot_size: data.lot_size || null,
        price: data.price || null,
        features: data.features,
        condition: data.condition,
        photos: photoUrls,
        description: data.description,
        status: "active",
      });

      if (insertError) throw insertError;
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to publish listing";
      setError(message);
    } finally {
      setPublishing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-navy text-3xl">Create New Listing</h1>
        <p className="text-navy-light mt-1">List your property in just a few steps</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                i === step
                  ? "bg-gold text-navy"
                  : i < step
                  ? "bg-gold/20 text-gold-dark cursor-pointer hover:bg-gold/30"
                  : "bg-cream-light text-navy-light"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i === step ? "bg-navy text-cream" : i < step ? "bg-gold-dark text-cream" : "bg-gold-muted/30 text-navy-light"
              }`}>
                {i < step ? "✓" : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-0.5 ${i < step ? "bg-gold" : "bg-gold-muted/30"}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* Step 1: Property Details */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-6">
          <h2 className="font-heading font-bold text-navy text-xl">Property Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Street Address</label>
              <input
                type="text"
                value={data.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="123 Main St"
                className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-1">City</label>
                <input
                  type="text"
                  value={data.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1">State</label>
                <input
                  type="text"
                  value={data.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1">ZIP</label>
                <input
                  type="text"
                  value={data.zip}
                  onChange={(e) => updateField("zip", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-1">Property Type</label>
              <select
                value={data.property_type}
                onChange={(e) => updateField("property_type", e.target.value)}
                className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Beds</label>
                <input
                  type="number"
                  value={data.beds}
                  onChange={(e) => updateField("beds", e.target.value ? Number(e.target.value) : "")}
                  min={0}
                  className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Baths</label>
                <input
                  type="number"
                  value={data.baths}
                  onChange={(e) => updateField("baths", e.target.value ? Number(e.target.value) : "")}
                  min={0}
                  step={0.5}
                  className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Sq Ft</label>
                <input
                  type="number"
                  value={data.sqft}
                  onChange={(e) => updateField("sqft", e.target.value ? Number(e.target.value) : "")}
                  min={0}
                  className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Year Built</label>
                <input
                  type="number"
                  value={data.year_built}
                  onChange={(e) => updateField("year_built", e.target.value ? Number(e.target.value) : "")}
                  min={1800}
                  max={2030}
                  className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Lot Size</label>
                <input
                  type="text"
                  value={data.lot_size}
                  onChange={(e) => updateField("lot_size", e.target.value)}
                  placeholder="e.g. 0.25 acres"
                  className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Asking Price ($)</label>
                <input
                  type="number"
                  value={data.price}
                  onChange={(e) => updateField("price", e.target.value ? Number(e.target.value) : "")}
                  min={0}
                  className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Features & Condition */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-6">
          <h2 className="font-heading font-bold text-navy text-xl">Features & Condition</h2>

          <div>
            <label className="block text-sm font-medium text-navy mb-3">Property Features</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {FEATURE_OPTIONS.map((feature) => (
                <label
                  key={feature}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                    data.features.includes(feature)
                      ? "bg-gold/10 border-gold text-navy"
                      : "border-gold-muted/30 text-navy-light hover:border-gold-muted/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={data.features.includes(feature)}
                    onChange={() => toggleFeature(feature)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    data.features.includes(feature)
                      ? "bg-gold border-gold"
                      : "border-gold-muted/50"
                  }`}>
                    {data.features.includes(feature) && (
                      <svg className="w-3 h-3 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm">{feature}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy mb-1">Property Condition</label>
            <select
              value={data.condition}
              onChange={(e) => updateField("condition", e.target.value)}
              className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
            >
              {CONDITION_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Step 3: Photos */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-6">
          <h2 className="font-heading font-bold text-navy text-xl">Photos</h2>

          <div
            className="border-2 border-dashed border-gold-muted/40 rounded-xl p-8 text-center cursor-pointer hover:border-gold/60 transition-colors"
            onClick={() => document.getElementById("photo-upload")?.click()}
          >
            <svg className="w-12 h-12 mx-auto text-gold-dark mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-navy font-medium">Click to upload photos</p>
            <p className="text-navy-light text-sm mt-1">JPG, PNG up to 10MB each</p>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotos}
              className="hidden"
            />
          </div>

          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photoPreviews.map((src, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-gold-muted/30">
                  <img src={src} alt={`Photo ${i + 1}`} className="w-full h-32 object-cover" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    X
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-2 left-2 bg-gold text-navy text-xs font-semibold px-2 py-0.5 rounded-full">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Description */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-6">
          <h2 className="font-heading font-bold text-navy text-xl">Description</h2>

          <div className="flex gap-3">
            <button
              onClick={generateDescription}
              disabled={generatingDesc}
              className="bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-5 py-2.5 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {generatingDesc ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-navy" />
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Description
                </>
              )}
            </button>
          </div>

          <textarea
            value={data.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={10}
            placeholder="Write a compelling description of your property..."
            className="w-full px-4 py-3 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy resize-y"
          />
        </div>
      )}

      {/* Step 5: Review & Publish */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-4">
            <h2 className="font-heading font-bold text-navy text-xl">Review Your Listing</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-navy">Property Details</h3>
                <div className="text-sm text-navy-light space-y-1">
                  <p><span className="font-medium text-navy">Address:</span> {data.address}, {data.city}, {data.state} {data.zip}</p>
                  <p><span className="font-medium text-navy">Type:</span> {data.property_type}</p>
                  <p><span className="font-medium text-navy">Price:</span> {data.price ? `$${Number(data.price).toLocaleString()}` : "Not set"}</p>
                  <p><span className="font-medium text-navy">Beds/Baths:</span> {data.beds || "-"} / {data.baths || "-"}</p>
                  <p><span className="font-medium text-navy">Sq Ft:</span> {data.sqft ? Number(data.sqft).toLocaleString() : "-"}</p>
                  <p><span className="font-medium text-navy">Year Built:</span> {data.year_built || "-"}</p>
                  <p><span className="font-medium text-navy">Lot Size:</span> {data.lot_size || "-"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-navy">Features & Condition</h3>
                <p className="text-sm text-navy-light">
                  <span className="font-medium text-navy">Condition:</span> {data.condition}
                </p>
                {data.features.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {data.features.map((f) => (
                      <span key={f} className="bg-gold/10 text-gold-dark text-xs px-2.5 py-1 rounded-full font-medium">
                        {f}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-navy-light">No features selected</p>
                )}
              </div>
            </div>

            {photoPreviews.length > 0 && (
              <div>
                <h3 className="font-semibold text-navy mb-2">Photos ({photoPreviews.length})</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {photoPreviews.map((src, i) => (
                    <img key={i} src={src} alt={`Photo ${i + 1}`} className="w-24 h-24 object-cover rounded-xl border border-gold-muted/30 flex-shrink-0" />
                  ))}
                </div>
              </div>
            )}

            {data.description && (
              <div>
                <h3 className="font-semibold text-navy mb-2">Description</h3>
                <p className="text-sm text-navy-light whitespace-pre-wrap">{data.description}</p>
              </div>
            )}
          </div>

          <button
            onClick={publish}
            disabled={publishing}
            className="w-full bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-6 py-3 text-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {publishing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-navy" />
                Publishing...
              </>
            ) : (
              "Publish Listing"
            )}
          </button>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="bg-navy hover:bg-navy-light text-cream rounded-xl px-6 py-2.5 font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Back
        </button>
        {step < 4 && (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-6 py-2.5 transition-colors"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
