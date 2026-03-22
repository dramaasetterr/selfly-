export default function NotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "4rem", fontWeight: 800, color: "#2563EB", marginBottom: "0.5rem" }}>404</h1>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", color: "#0F172A" }}>Page Not Found</h2>
      <p style={{ color: "#475569", marginBottom: "2rem" }}>The page you're looking for doesn't exist.</p>
      <a href="/" style={{ padding: "0.75rem 2rem", backgroundColor: "#2563EB", color: "#fff", borderRadius: "0.5rem", textDecoration: "none", fontSize: "1rem" }}>
        Go Home
      </a>
    </div>
  );
}
