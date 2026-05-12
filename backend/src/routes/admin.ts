import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb, safeUser } from '../db/database';
import { requireAdmin } from '../middleware/auth';
import { sendPasswordSetupEmail } from '../services/emailService';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get('/users', (_req: Request, res: Response): void => {
  const db = getDb();
  const users = db.prepare(
    'SELECT * FROM users ORDER BY created_at DESC'
  ).all() as Record<string, unknown>[];
  res.json({ users: users.map(safeUser) });
});

adminRouter.post('/users', (req: Request, res: Response): void => {
  const { firstname, lastname, accountname, email, credits = 10 } = req.body;
  if (!firstname || !lastname || !accountname || !email) {
    res.status(400).json({ error: 'firstname, lastname, accountname and email are required' }); return;
  }

  const db = getDb();
  try {
    // Create user without password — they'll set it via email link
    const result = db.prepare(
      'INSERT INTO users (firstname, lastname, accountname, email, password_hash, credits) VALUES (?,?,?,?,NULL,?)'
    ).run(firstname, lastname, accountname, email, credits);

    const userId = result.lastInsertRowid as number;

    // Generate setup token (24h expiry)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + 86400;
    db.prepare('INSERT INTO password_tokens (user_id, token, type, expires_at) VALUES (?,?,?,?)').run(userId, token, 'setup', expiresAt);

    sendPasswordSetupEmail(email, firstname, token).catch(console.error);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
    res.status(201).json({ user: safeUser(user) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('UNIQUE')) {
      res.status(409).json({ error: 'accountname or email already exists' }); return;
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

adminRouter.patch('/users/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const { firstname, lastname, email, credits, password } = req.body;

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const updates: string[] = [];
  const values: unknown[] = [];
  if (firstname !== undefined) { updates.push('firstname = ?'); values.push(firstname); }
  if (lastname !== undefined)  { updates.push('lastname = ?');  values.push(lastname); }
  if (email !== undefined)     { updates.push('email = ?');     values.push(email); }
  if (credits !== undefined)   { updates.push('credits = ?');   values.push(Number(credits)); }
  if (password)                { updates.push('password_hash = ?'); values.push(bcrypt.hashSync(password, 10)); }

  if (updates.length === 0) { res.status(400).json({ error: 'Nothing to update' }); return; }

  values.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown>;
  res.json({ user: safeUser(updated) });
});

adminRouter.post('/users/:id/credits', (req: Request, res: Response): void => {
  const { id } = req.params;
  const { amount } = req.body;
  if (typeof amount !== 'number' || amount === 0) {
    res.status(400).json({ error: 'amount (non-zero number) required' }); return;
  }

  const db = getDb();
  db.prepare('UPDATE users SET credits = MAX(0, credits + ?) WHERE id = ?').run(amount, id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({ user: safeUser(user) });
});

adminRouter.post('/users/:id/resend-invite', (req: Request, res: Response): void => {
  const { id } = req.params;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + 86400;
  db.prepare('INSERT INTO password_tokens (user_id, token, type, expires_at) VALUES (?,?,?,?)').run(id, token, 'setup', expiresAt);

  sendPasswordSetupEmail(user.email as string, user.firstname as string, token).catch(console.error);
  res.json({ ok: true });
});

adminRouter.delete('/users/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (user.is_admin) { res.status(403).json({ error: 'Cannot delete admin user' }); return; }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});
