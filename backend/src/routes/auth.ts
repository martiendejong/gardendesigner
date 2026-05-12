import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb, safeUser } from '../db/database';
import { signToken, requireAuth } from '../middleware/auth';
import { sendPasswordResetEmail } from '../services/emailService';

export const authRouter = Router();

authRouter.post('/login', (req: Request, res: Response): void => {
  const { accountname, password } = req.body;
  if (!accountname || !password) { res.status(400).json({ error: 'accountname and password required' }); return; }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE accountname = ? OR email = ?').get(accountname, accountname) as Record<string, unknown> | undefined;

  if (!user || !user.password_hash) {
    res.status(401).json({ error: 'Invalid credentials' }); return;
  }
  if (!bcrypt.compareSync(password, user.password_hash as string)) {
    res.status(401).json({ error: 'Invalid credentials' }); return;
  }

  const safe = safeUser(user);
  const token = signToken({ userId: safe.id as number, accountname: safe.accountname as string, isAdmin: safe.isAdmin });
  res.json({ token, user: safe });
});

authRouter.get('/me', requireAuth, (req: Request, res: Response): void => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as Record<string, unknown> | undefined;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(safeUser(user));
});

authRouter.post('/forgot-password', (req: Request, res: Response): void => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: 'email required' }); return; }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as Record<string, unknown> | undefined;

  // Always return success to avoid email enumeration
  if (!user) { res.json({ ok: true }); return; }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  db.prepare('INSERT INTO password_tokens (user_id, token, type, expires_at) VALUES (?,?,?,?)').run(user.id, token, 'reset', expiresAt);

  sendPasswordResetEmail(user.email as string, user.firstname as string, token).catch(console.error);

  res.json({ ok: true });
});

authRouter.post('/set-password', (req: Request, res: Response): void => {
  const { token, password } = req.body;
  if (!token || !password) { res.status(400).json({ error: 'token and password required' }); return; }
  if (password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters' }); return; }

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const row = db.prepare(
    'SELECT pt.*, u.id as uid FROM password_tokens pt JOIN users u ON u.id = pt.user_id WHERE pt.token = ? AND pt.used = 0 AND pt.expires_at > ?'
  ).get(token, now) as Record<string, unknown> | undefined;

  if (!row) { res.status(400).json({ error: 'Invalid or expired link' }); return; }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.uid);
  db.prepare('UPDATE password_tokens SET used = 1 WHERE id = ?').run(row.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.uid) as Record<string, unknown>;
  const safe = safeUser(user);
  const jwtToken = signToken({ userId: safe.id as number, accountname: safe.accountname as string, isAdmin: safe.isAdmin });

  res.json({ token: jwtToken, user: safe });
});

authRouter.get('/verify-token', (req: Request, res: Response): void => {
  const { token } = req.query;
  if (!token) { res.status(400).json({ error: 'token required' }); return; }

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const row = db.prepare(
    'SELECT pt.type, u.firstname, u.email FROM password_tokens pt JOIN users u ON u.id = pt.user_id WHERE pt.token = ? AND pt.used = 0 AND pt.expires_at > ?'
  ).get(token as string, now) as Record<string, unknown> | undefined;

  if (!row) { res.status(400).json({ error: 'Invalid or expired link' }); return; }
  res.json({ valid: true, type: row.type, firstname: row.firstname });
});
