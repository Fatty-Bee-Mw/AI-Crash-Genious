import { addRequest, listRequests } from "../../../utils/memoryStore";

// in-memory rate limits
const rlIp = new Map(); // ip -> { count, ts }
const rlDev = new Map(); // deviceId -> { count, ts }
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQ = 5; // per IP
const MAX_DEV = 3; // per deviceId

function limited(map, key, max) {
  const now = Date.now();
  const rec = map.get(key);
  if (!rec || now - rec.ts > WINDOW_MS) { map.set(key, { count: 1, ts: now }); return false; }
  rec.count += 1; rec.ts = now; map.set(key, rec);
  return rec.count > max;
}

function sanitizeText(s, max = 64) {
  const out = String(s || "").replace(/[<>]/g, "").trim();
  return out.slice(0, max);
}

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ items: listRequests() });
  }
  if (req.method === "POST") {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown";
    if (limited(rlIp, ip, MAX_REQ)) return res.status(429).json({ error: "Too many requests" });

    const { provider, msisdn, imageBase64, deviceId } = req.body || {};
    if (!imageBase64 || !deviceId) return res.status(400).json({ error: "imageBase64 and deviceId required" });
    // deviceId must be hex 32 chars (from our generator)
    if (!/^[a-f0-9]{32}$/i.test(deviceId)) return res.status(400).json({ error: "invalid deviceId format" });
    if (limited(rlDev, deviceId, MAX_DEV)) return res.status(429).json({ error: "Too many requests" });
    // validate data URL image and size <= 3MB
    const m = /^data:(image\/(png|jpeg|jpg));base64,([A-Za-z0-9+/=]+)$/.exec(imageBase64 || "");
    if (!m) return res.status(400).json({ error: "invalid image" });
    const b64 = m[3];
    const sizeBytes = Math.floor(b64.length * 3 / 4); // approx
    if (sizeBytes > 3 * 1024 * 1024) return res.status(400).json({ error: "image too large (max 3MB)" });
    const item = addRequest({ provider: sanitizeText(provider, 32), msisdn: sanitizeText(msisdn, 32), imageBase64, deviceId });
    return res.status(201).json({ item });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
