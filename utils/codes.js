const ADMIN_CODE = "Fatty@9090....";

export function isAdmin(code) {
  return code === ADMIN_CODE;
}

export function now() { return Date.now(); }
export function inDays(days) { return days * 24 * 60 * 60 * 1000; }

export function saveClientAccess({ code, deviceId, ttlMs }) {
  const data = { deviceId, expiresAt: now() + ttlMs };
  localStorage.setItem(`code_${code}`, JSON.stringify(data));
}

export function verifyClientAccess({ code, deviceId }) {
  if (!code) return { ok:false, reason:"No code" };
  const raw = localStorage.getItem(`code_${code}`);
  if (!raw) return { ok:false, reason:"Code not found" };
  try {
    const data = JSON.parse(raw);
    if (data.deviceId && data.deviceId !== deviceId) return { ok:false, reason:"Different device" };
    if (data.expiresAt && data.expiresAt < now()) return { ok:false, reason:"Expired" };
    return { ok:true };
  } catch {
    return { ok:false, reason:"Invalid record" };
  }
}
