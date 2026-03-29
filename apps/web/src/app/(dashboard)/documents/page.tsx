"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Document {
  id: string;
  type: string;
  listing_id: string;
  listing_address: string;
  created_at: string;
  title: string;
  status: string;
}

interface Listing {
  id: string;
  address: string;
  city: string;
  state: string;
}

const DOC_TYPES = ["Disclosure", "Purchase Agreement", "Counter-Offer"];

const TYPE_COLORS: Record<string, string> = {
  Disclosure: "bg-blue-100 text-blue-800",
  "Purchase Agreement": "bg-emerald-100 text-emerald-800",
  "Counter-Offer": "bg-amber-100 text-amber-800",
};

export default function DocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState(DOC_TYPES[0]);
  const [selectedListing, setSelectedListing] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsResult, listingsResult] = await Promise.all([
        supabase
          .from("documents")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("listings")
          .select("id, address, city, state")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false }),
      ]);

      if (docsResult.error) throw docsResult.error;
      if (listingsResult.error) throw listingsResult.error;

      setDocuments(docsResult.data || []);
      setListings(listingsResult.data || []);
      if (listingsResult.data?.length) {
        setSelectedListing(listingsResult.data[0].id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const generateDocument = async () => {
    if (!selectedListing) {
      setError("Please select a listing first");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          listing_id: selectedListing,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate document");
      const result = await res.json();
      setDocuments((prev) => [result.document, ...prev]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate document";
      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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
        <h1 className="font-heading font-bold text-navy text-2xl sm:text-3xl">Documents</h1>
        <p className="text-navy-light mt-1">Generate and manage your real estate documents</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* Generate New Document */}
      <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 space-y-4">
        <h2 className="font-heading font-bold text-navy text-lg">Generate New Document</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Document Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy mb-1">Listing</label>
            <select
              value={selectedListing}
              onChange={(e) => setSelectedListing(e.target.value)}
              className="w-full px-4 py-2.5 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 focus:outline-none bg-white text-navy"
            >
              {listings.length === 0 && (
                <option value="">No listings available</option>
              )}
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.address}, {l.city}, {l.state}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={generateDocument}
              disabled={generating || !selectedListing}
              className="w-full bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-5 py-2.5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-navy" />
                  Generating...
                </>
              ) : (
                "Generate Document"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        <h2 className="font-heading font-bold text-navy text-lg">Your Documents</h2>

        {documents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gold-muted/30 p-10 text-center">
            <svg className="w-12 h-12 mx-auto text-gold-dark mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-navy-light">No documents yet. Generate your first document above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="block bg-white rounded-2xl border border-gold-muted/30 p-5 hover:border-gold/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gold-bg rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-gold-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-navy">{doc.title || `${doc.type} Document`}</p>
                      <p className="text-sm text-navy-light">{doc.listing_address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_COLORS[doc.type] || "bg-gray-100 text-gray-800"}`}>
                      {doc.type}
                    </span>
                    <span className="text-sm text-navy-light">{formatDate(doc.created_at)}</span>
                    <svg className="w-5 h-5 text-navy-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
