import { updateRequestNotes } from "../../../utils/memoryStore";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const providedHash = req.headers['x-admin-code-hash'];
  const legacy = req.headers['x-admin-code'];
  const expectedHash = process.env.ADMIN_CODE_HASH || "";
  const expectedLegacy = process.env.ADMIN_CODE || "";
  const ok = (expectedHash && providedHash && providedHash === expectedHash) || (expectedLegacy && legacy && legacy === expectedLegacy);
  if (!ok) return res.status(401).json({ error: 'unauthorized' });
  const { id, notes } = req.body || {};
  if (!id) return res.status(400).json({ error: "id required" });
  const r = updateRequestNotes(id, notes || "");
  if (!r) return res.status(404).json({ error: "request not found" });
  return res.status(200).json({ item: r });
}
