"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>500</h1>
        <p style={{ fontSize: '18px', color: '#666' }}>Something went wrong</p>
        <button onClick={reset} style={{ color: '#2563EB', marginTop: '16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>Try Again</button>
      </div>
    </div>
  );
}
