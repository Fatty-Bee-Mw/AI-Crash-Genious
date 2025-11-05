import { listRecipients, addRecipient } from "../../../utils/memoryStore";

export default function handler(req, res) {
  const providedHash = req.headers['x-admin-code-hash'];
  const legacy = req.headers['x-admin-code'];
  const expectedHash = process.env.ADMIN_CODE_HASH || "";
  const expectedLegacy = process.env.ADMIN_CODE || "";
  const ok = (expectedHash && providedHash && providedHash === expectedHash) || (expectedLegacy && legacy && legacy === expectedLegacy);
  if (!ok) return res.status(401).json({ error: 'unauthorized' });

  if (req.method === 'GET') {
    return res.status(200).json({ items: listRecipients() });
  }

  if (req.method === 'POST') {
    try {
      const { phone } = req.body || {};
      const digits = String(phone || '').replace(/\D/g, '');
      if (!digits) return res.status(400).json({ error: 'invalid phone' });
      const item = addRecipient(digits);
      return res.status(200).json({ item });
    } catch {
      return res.status(400).json({ error: 'bad request' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
