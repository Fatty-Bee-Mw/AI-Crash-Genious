import { listCodes, issueCodeForDevice, revokeCode } from "../../../utils/memoryStore";

export default function handler(req, res) {
  const providedHash = req.headers['x-admin-code-hash'];
  const legacy = req.headers['x-admin-code'];
  const expectedHash = process.env.ADMIN_CODE_HASH || "";
  const expectedLegacy = process.env.ADMIN_CODE || "";
  const ok = (expectedHash && providedHash && providedHash === expectedHash) || (expectedLegacy && legacy && legacy === expectedLegacy);
  if (!ok) return res.status(401).json({ error: 'unauthorized' });
  if (req.method === "GET") {
    return res.status(200).json({ items: listCodes() });
  }
  if (req.method === "POST") {
    const { deviceId, ttlMs } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: "deviceId required" });
    const issued = issueCodeForDevice({ deviceId, ttlMs: ttlMs || 1000*60*60*24*3 });
    return res.status(201).json(issued);
  }
  if (req.method === "DELETE") {
    const { code } = req.query || {};
    if (!code) return res.status(400).json({ error: "code required" });
    const ok = revokeCode(code);
    if (!ok) return res.status(404).json({ error: "code not found" });
    return res.status(204).end();
  }
  return res.status(405).json({ error: "Method not allowed" });
}
