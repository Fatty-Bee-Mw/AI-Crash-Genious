import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0d1117',
      color: '#e6edf3',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"'
    }}>
      <div style={{
        maxWidth: 560,
        width: '100%',
        padding: 24,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(13,17,23,0.7)',
        backdropFilter: 'blur(6px)'
      }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Page not found</h1>
        <p style={{ marginTop: 8, color: '#94a3b8' }}>
          The page you are looking for doesn’t exist.
        </p>
        <div style={{ marginTop: 16 }}>
          <Link href="/" style={{
            display: 'inline-block',
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.08)',
            color: '#e6edf3',
            textDecoration: 'none'
          }}>Go back home</Link>
        </div>
      </div>
    </main>
  );
}