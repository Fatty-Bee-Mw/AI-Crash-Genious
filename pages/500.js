import { useRouter } from 'next/router';

export default function ServerError() {
  const router = useRouter();
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
        <h1 style={{ fontSize: 24, margin: 0 }}>Something went wrong</h1>
        <p style={{ marginTop: 8, color: '#94a3b8' }}>
          A server error occurred. Please try again or go back home.
        </p>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button onClick={() => router.reload()} style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.08)',
            color: '#e6edf3'
          }}>Refresh</button>
          <button onClick={() => router.push('/')} style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.08)',
            color: '#e6edf3'
          }}>Go back home</button>
        </div>
      </div>
    </main>
  );
}