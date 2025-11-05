const challenges = new Map(); // id -> { answer, exp }

export function createChallenge() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const id = Math.random().toString(36).slice(2, 10);
  challenges.set(id, { answer: String(a + b), exp: Date.now() + 5 * 60 * 1000 });
  return { id, question: `${a} + ${b} = ?` };
}

export function verifyChallenge(id, answer) {
  const rec = challenges.get(String(id || ''));
  if (!rec || rec.exp < Date.now()) { challenges.delete(id); return false; }
  const ok = String(answer || '').trim() === rec.answer;
  if (ok) challenges.delete(id);
  return ok;
}
