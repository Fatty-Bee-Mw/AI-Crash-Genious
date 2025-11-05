import { createChallenge, verifyChallenge } from "../../utils/captchaStore";

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { id, question } = createChallenge();
    return res.status(200).json({ id, question });
  }
  if (req.method === 'PUT') {
    const { id, answer } = req.body || {};
    const ok = verifyChallenge(id, answer);
    return res.status(ok ? 200 : 400).json({ ok });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
