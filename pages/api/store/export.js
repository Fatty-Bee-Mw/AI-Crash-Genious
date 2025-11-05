import { getSnapshot } from "../../../utils/memoryStore";

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const providedHash = req.headers['x-admin-code-hash'];
  const legacy = req.headers['x-admin-code'];
  const expectedHash = process.env.ADMIN_CODE_HASH || "";
  const expectedLegacy = process.env.ADMIN_CODE || "";
  const ok = (expectedHash && providedHash && providedHash === expectedHash) || (expectedLegacy && legacy && legacy === expectedLegacy);
  if (!ok) return res.status(401).json({ error: 'unauthorized' });
  const snap = getSnapshot();
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).send(JSON.stringify(snap, null, 2));
}
