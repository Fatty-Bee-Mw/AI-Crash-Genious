import { verifyCode } from "../../../utils/memoryStore";

// In-memory rate limiting and lockouts (per-device+IP)
const attempts = new Map(); // key -> { count, ts, lockedUntil }
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes window
const MAX_ATTEMPTS = 10; // max failed attempts per window
const LOCK_MS = 30 * 60 * 1000; // 30 minutes lockout

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ctype = String(req.headers['content-type'] || '').toLowerCase();
  if (!ctype.includes('application/json')) return res.status(400).json({ error: 'invalid content-type' });

  // Basic same-origin check to reduce CSRF risks
  const origin = String(req.headers['origin'] || '');
  const referer = String(req.headers['referer'] || '');
  const host = String(req.headers['host'] || '');
  const allowedHttp = [`https://${host}`, `http://${host}`];
  if ((origin && !allowedHttp.some(p=> origin.startsWith(p))) || (referer && !allowedHttp.some(p=> referer.startsWith(p)))) {
    return res.status(400).json({ error: 'bad origin' });
  }
  const { code, deviceId } = req.body || {};
  if (!code || !deviceId) return res.status(400).json({ error: "code and deviceId required" });
  if (!/^[a-f0-9]{32}$/i.test(deviceId)) return res.status(400).json({ error: "invalid deviceId format" });
  // Normalize and validate code: only A-Z and 2-9, length 8-24
  const normalized = String(code).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const allowed = /^[A-Z2-9]{8,24}$/;
  if (!allowed.test(normalized)) return res.status(400).json({ error: "invalid code" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown";
  const key = `${deviceId}:${ip}`;
  const now = Date.now();
  const rec = attempts.get(key) || { count: 0, ts: now, lockedUntil: 0 };
  if (rec.lockedUntil && now < rec.lockedUntil) {
    return res.status(429).json({ error: "locked", retryAfterMs: rec.lockedUntil - now });
  }
  if (now - rec.ts > WINDOW_MS) { rec.count = 0; rec.ts = now; rec.lockedUntil = 0; }

  const out = verifyCode({ code: normalized, deviceId });
  if (!out.ok) {
    rec.count += 1; rec.ts = now;
    if (rec.count >= MAX_ATTEMPTS) { rec.lockedUntil = now + LOCK_MS; rec.count = 0; }
    attempts.set(key, rec);
    return res.status(400).json(out);
  }
  // success resets counters
  attempts.delete(key);
  return res.status(200).json({ ok: true });
}
