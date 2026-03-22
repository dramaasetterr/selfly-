"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem", color: "#0F172A" }}>Something went wrong</h1>
      <p style={{ color: "#475569", marginBottom: "2rem" }}>We're sorry for the inconvenience. Please try again.</p>
      <button
        onClick={() => reset()}
        style={{ padding: "0.75rem 2rem", backgroundColor: "#2563EB", color: "#fff", border: "none", borderRadius: "0.5rem", fontSize: "1rem", cursor: "pointer" }}
      >
        Try Again
      </button>
    </div>
  );
}
