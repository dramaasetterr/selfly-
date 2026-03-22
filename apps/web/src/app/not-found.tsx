export default function NotFound() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>404</h1>
        <p style={{ fontSize: '18px', color: '#666' }}>Page not found</p>
        <a href="/" style={{ color: '#2563EB', marginTop: '16px', display: 'inline-block' }}>Go Home</a>
      </div>
    </div>
  );
}
