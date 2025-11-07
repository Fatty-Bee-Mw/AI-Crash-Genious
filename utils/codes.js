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

export function checkCodeExpiration() {
  try {
    const activeCode = localStorage.getItem('active_code');
    if (!activeCode) return { expired: true, reason: "No active code" };
    
    const deviceId = localStorage.getItem('device_id') || getOrCreateDeviceId();
    const result = verifyClientAccess({ code: activeCode, deviceId });
    
    return { 
      expired: !result.ok, 
      reason: result.reason || "Valid",
      expiresAt: getCodeExpiration(activeCode)
    };
  } catch {
    return { expired: true, reason: "Validation error" };
  }
}

export function getCodeExpiration(code) {
  try {
    const raw = localStorage.getItem(`code_${code}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data.expiresAt || null;
  } catch {
    return null;
  }
}

export function clearAccessData() {
  try {
    const activeCode = localStorage.getItem('active_code');
    if (activeCode) {
      localStorage.removeItem(`code_${activeCode}`);
    }
    localStorage.removeItem('active_code');
    localStorage.removeItem('admin_session');
    localStorage.removeItem('admin_code_plain');
  } catch {
    // Ignore errors
  }
}
