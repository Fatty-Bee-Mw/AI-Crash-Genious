import { loadSnapshot } from "../../../utils/memoryStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const providedHash = req.headers['x-admin-code-hash'];
  const legacy = req.headers['x-admin-code'];
  const expectedHash = process.env.ADMIN_CODE_HASH || "";
  const expectedLegacy = process.env.ADMIN_CODE || "";
  const ok = (expectedHash && providedHash && providedHash === expectedHash) || (expectedLegacy && legacy && legacy === expectedLegacy);
  if (!ok) return res.status(401).json({ error: 'unauthorized' });
  try {
    const snap = req.body;
    const valid = loadSnapshot(snap);
    if (!valid) return res.status(400).json({ error: "Invalid snapshot" });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON" });
  }
}
