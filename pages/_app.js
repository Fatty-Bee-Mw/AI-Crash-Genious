import "../styles/globals.css";
import React from "react";
import { useRouter } from "next/router";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Optionally log to monitoring here
    // console.error("ErrorBoundary caught:", error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
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
          <div style={{ maxWidth: 560, width: '100%', padding: 24, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(13,17,23,0.7)' }}>
            <h1 style={{ fontSize: 24, margin: 0 }}>Something went wrong</h1>
            <p style={{ marginTop: 8, color: '#94a3b8' }}>
              An unexpected error occurred. You can refresh or go back home.
            </p>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button onClick={() => { this.reset(); location.reload(); }} style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.08)', color: '#e6edf3'
              }}>Refresh</button>
              <button onClick={() => { this.reset(); location.href = '/'; }} style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.08)', color: '#e6edf3'
              }}>Go back home</button>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const key = router.asPath; // Remount on route change to clear boundary state
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    return (
      <ErrorBoundary key={key}>
        <Component {...pageProps} />
      </ErrorBoundary>
    );
  }
  // In development, avoid wrapping with a custom boundary so Next's error overlay works
  return <Component {...pageProps} />;
}
