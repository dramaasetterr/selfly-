"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";

interface DocumentData {
  id: string;
  title: string;
  type: string;
  content: string;
  listing_address: string;
  created_at: string;
  user_id: string;
  status: string;
}

export default function DocumentViewerPage() {
  const { user, loading: authLoading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const contentRef = useRef<HTMLDivElement>(null);

  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    fetchDocument();
  }, [user, id]);

  const fetchDocument = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error("Document not found");

      setDoc(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load document";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!doc) return;
    const blob = new Blob(
      [
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.title}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;color:#1a2332;}h1,h2,h3{color:#1a2332;}table{border-collapse:collapse;width:100%;}td,th{border:1px solid #ddd;padding:8px;}</style></head><body>${doc.content}</body></html>`,
      ],
      { type: "text/html" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title || doc.type}-${doc.id.slice(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
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

  if (error || !doc) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push("/documents")}
          className="flex items-center gap-2 text-navy-light hover:text-navy transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Documents
        </button>
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200">
          {error || "Document not found"}
        </div>
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    Disclosure: "bg-blue-100 text-blue-800",
    "Purchase Agreement": "bg-emerald-100 text-emerald-800",
    "Counter-Offer": "bg-amber-100 text-amber-800",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => router.push("/documents")}
          className="flex items-center gap-2 text-navy-light hover:text-navy transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Documents
        </button>

        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="bg-navy hover:bg-navy-light text-cream rounded-xl px-4 py-2 font-semibold transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <button
            onClick={handleDownload}
            className="bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-4 py-2 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>
      </div>

      {/* Document Info */}
      <div className="bg-white rounded-2xl border border-gold-muted/30 p-6 print:border-none print:shadow-none print:p-0">
        <div className="flex items-start justify-between mb-6 print:mb-4">
          <div>
            <h1 className="font-heading font-bold text-navy text-2xl">
              {doc.title || `${doc.type} Document`}
            </h1>
            <p className="text-navy-light mt-1">{doc.listing_address}</p>
            <p className="text-sm text-navy-light mt-0.5">
              Created {formatDate(doc.created_at)}
            </p>
          </div>
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full print:hidden ${
              typeColors[doc.type] || "bg-gray-100 text-gray-800"
            }`}
          >
            {doc.type}
          </span>
        </div>

        <div className="border-t border-gold-muted/20 pt-6">
          <div
            ref={contentRef}
            className="prose prose-navy max-w-none
              prose-headings:text-navy prose-headings:font-heading
              prose-p:text-navy-light prose-p:leading-relaxed
              prose-strong:text-navy
              prose-table:border-collapse
              prose-td:border prose-td:border-gold-muted/30 prose-td:p-2
              prose-th:border prose-th:border-gold-muted/30 prose-th:p-2 prose-th:bg-gold-bg"
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />
        </div>
      </div>
    </div>
  );
}
