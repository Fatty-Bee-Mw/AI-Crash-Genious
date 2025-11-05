// Simple in-memory store for payment requests (reset on restart)
// Each item: { id, createdAt, provider, msisdn, imageBase64, deviceId, status }
import crypto from "crypto";

const store = {
  requests: [],
  // codes: codeId (sha256 of plaintext code) -> { deviceId, expiresAt }
  codes: {},
  recipients: [],
};

export function addRequest({ provider, msisdn, imageBase64, deviceId }) {
  const id = Math.random().toString(36).slice(2, 10).toUpperCase();
  const item = {
    id,
    createdAt: Date.now(),
    provider: provider || null,
    msisdn: msisdn || null,
    imageBase64,
    deviceId,
    status: "pending",
    notes: "",
  };
  store.requests.unshift(item);
  return item;
}

export function listRequests() {
  return store.requests;
}

export function approveRequest(id) {
  const idx = store.requests.findIndex(r => r.id === id);
  if (idx === -1) return null;
  store.requests[idx].status = "approved";
  return store.requests[idx];
}

function randomCode(len = 16) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

export function issueCodeForDevice({ deviceId, ttlMs }) {
  const code = randomCode(16);
  const codeId = sha256Hex(code);
  const expiresAt = Date.now() + ttlMs;
  store.codes[codeId] = { deviceId, expiresAt };
  // Return plaintext once (for user) and the codeId (for admin ops)
  return { code, codeId, expiresAt };
}

export function verifyCode({ code, deviceId }) {
  const codeId = sha256Hex(String(code || ""));
  const rec = store.codes[codeId];
  if (!rec) return { ok:false, reason:"Code not found" };
  if (rec.deviceId !== deviceId) return { ok:false, reason:"Different device" };
  if (rec.expiresAt < Date.now()) return { ok:false, reason:"Expired" };
  return { ok:true };
}

export function listCodes() {
  // Do not expose plaintext codes; return codeId instead
  return Object.entries(store.codes).map(([codeId, v])=> ({ codeId, ...v }));
}

export function revokeCode(codeOrId) {
  const key = store.codes[codeOrId] ? codeOrId : sha256Hex(String(codeOrId || ""));
  if (store.codes[key]) { delete store.codes[key]; return true; }
  return false;
}

export function getSnapshot() {
  return {
    requests: store.requests,
    codes: store.codes,
    recipients: store.recipients,
    exportedAt: Date.now(),
    version: 1,
  };
}

export function loadSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const { requests, codes, recipients } = snapshot;
  if (!Array.isArray(requests) || typeof codes !== 'object') return false;
  store.requests = requests;
  store.codes = codes;
  store.recipients = Array.isArray(recipients) ? recipients : [];
  return true;
}

export function updateRequestNotes(id, notes) {
  const r = store.requests.find(x=> x.id === id);
  if (!r) return null;
  r.notes = String(notes || "").slice(0, 2000);
  return r;
}

export function listRecipients() {
  return store.recipients;
}

export function addRecipient(phone) {
  const id = Math.random().toString(36).slice(2, 10);
  const item = { id, phone: String(phone||'').trim(), enabled: true, createdAt: Date.now() };
  store.recipients.unshift(item);
  return item;
}

export function updateRecipient(id, patch) {
  const idx = store.recipients.findIndex(x=> x.id === id);
  if (idx === -1) return null;
  const cur = store.recipients[idx];
  const next = { ...cur };
  if (patch && typeof patch === 'object') {
    if (patch.phone != null) next.phone = String(patch.phone).trim();
    if (patch.enabled != null) next.enabled = !!patch.enabled;
  }
  store.recipients[idx] = next;
  return next;
}

export function deleteRecipient(id) {
  const idx = store.recipients.findIndex(x=> x.id === id);
  if (idx === -1) return false;
  store.recipients.splice(idx,1);
  return true;
}
