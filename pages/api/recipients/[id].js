import { listRecipients, updateRecipient, deleteRecipient } from "../../../utils/memoryStore";

export default function handler(req, res) {
  const providedHash = req.headers['x-admin-code-hash'];
  const legacy = req.headers['x-admin-code'];
  const expectedHash = process.env.ADMIN_CODE_HASH || "";
  const expectedLegacy = process.env.ADMIN_CODE || "";
  const ok = (expectedHash && providedHash && providedHash === expectedHash) || (expectedLegacy && legacy && legacy === expectedLegacy);
  if (!ok) return res.status(401).json({ error: 'unauthorized' });

  const { id } = req.query || {};
  if (!id) return res.status(400).json({ error: 'missing id' });

  if (req.method === 'GET') {
    const item = (listRecipients() || []).find(r=> r.id === id);
    if (!item) return res.status(404).json({ error: 'not found' });
    return res.status(200).json({ item });
  }

  if (req.method === 'PATCH') {
    try {
      const patch = req.body || {};
      const updated = updateRecipient(id, patch);
      if (!updated) return res.status(404).json({ error: 'not found' });
      return res.status(200).json({ item: updated });
    } catch {
      return res.status(400).json({ error: 'bad request' });
    }
  }

  if (req.method === 'DELETE') {
    const okDel = deleteRecipient(id);
    if (!okDel) return res.status(404).json({ error: 'not found' });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
