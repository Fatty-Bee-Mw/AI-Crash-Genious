import { NextResponse } from 'next/server';

function genNonce() {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
}

export function middleware(req) {
  const res = NextResponse.next();
  const nonce = genNonce();

  // Pass nonce to the server via request headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  const next = NextResponse.next({ request: { headers: requestHeaders } });

  // Build CSP using nonce (prod-safe). Allow dev eval/inline only in development.
  const dev = process.env.NODE_ENV !== 'production';
  const scriptSrc = dev ? "'self' 'unsafe-inline' 'unsafe-eval'" : `'self' 'nonce-${nonce}'`;
  const styleSrc = "'self' 'unsafe-inline'"; // Tailwind requires inline styles
  const connectSrc = dev
    ? "'self' ws: wss: https://crash.tgaproxy.online wss://crash.tgaproxy.online"
    : "'self' https://crash.tgaproxy.online wss://crash.tgaproxy.online";
  const frameSrc = dev
    ? "'self' https: data:"
    : "'self'"; // tighten in prod; consider allowing partner domain explicitly

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `connect-src ${connectSrc}`,
    `frame-src ${frameSrc}`,
    "img-src 'self' data:",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  next.headers.set('Content-Security-Policy', csp);
  next.headers.set('X-Frame-Options', 'DENY');
  next.headers.set('X-Content-Type-Options', 'nosniff');
  next.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  next.headers.set('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');
  next.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  next.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  return next;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
