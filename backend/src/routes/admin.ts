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

// ─── User ↔ Product Group linking ────────────────────────────────────────────

adminRouter.get('/users/:id/product-groups', (req: Request, res: Response): void => {
  const db = getDb();
  const rows = db.prepare(
    'SELECT product_group_id FROM user_product_groups WHERE user_id = ?'
  ).all(req.params.id) as { product_group_id: number }[];
  res.json({ groupIds: rows.map(r => r.product_group_id) });
});

adminRouter.put('/users/:id/product-groups', (req: Request, res: Response): void => {
  const { groupIds } = req.body as { groupIds: number[] };
  if (!Array.isArray(groupIds)) { res.status(400).json({ error: 'groupIds array required' }); return; }
  const db = getDb();
  const setGroups = db.transaction((uid: string, ids: number[]) => {
    db.prepare('DELETE FROM user_product_groups WHERE user_id = ?').run(uid);
    for (const gid of ids) {
      db.prepare('INSERT OR IGNORE INTO user_product_groups (user_id, product_group_id) VALUES (?,?)').run(uid, gid);
    }
  });
  setGroups(String(req.params.id), groupIds);
  res.json({ ok: true });
});

// ─── Product Groups ───────────────────────────────────────────────────────────

function serializeGroup(g: Record<string, unknown>) {
  return { id: g.id, name: g.name, description: g.description, category: g.category, image: g.image, createdAt: g.created_at };
}

adminRouter.get('/product-groups', (_req: Request, res: Response): void => {
  const db = getDb();
  const groups = db.prepare('SELECT * FROM product_groups ORDER BY name').all() as Record<string, unknown>[];
  res.json({ groups: groups.map(serializeGroup) });
});

adminRouter.post('/product-groups', (req: Request, res: Response): void => {
  const { name, description = '', category, image = null } = req.body as Record<string, string | null>;
  if (!name || !category) { res.status(400).json({ error: 'name and category are required' }); return; }
  if (!['Plants', 'Hardscape', 'Structures'].includes(category as string)) {
    res.status(400).json({ error: 'category must be Plants, Hardscape, or Structures' }); return;
  }
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO product_groups (name, description, category, image) VALUES (?,?,?,?)'
  ).run(name, description, category, image);
  const group = db.prepare('SELECT * FROM product_groups WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
  res.status(201).json({ group: serializeGroup(group) });
});

adminRouter.get('/product-groups/:id', (req: Request, res: Response): void => {
  const db = getDb();
  const group = db.prepare('SELECT * FROM product_groups WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!group) { res.status(404).json({ error: 'Not found' }); return; }
  const products = db.prepare('SELECT * FROM products WHERE product_group_id = ? ORDER BY name').all(req.params.id) as Record<string, unknown>[];
  const withImages = products.map(p => {
    const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY id').all(p.id) as Record<string, unknown>[];
    return { id: p.id, productGroupId: p.product_group_id, name: p.name, description: p.description, images: images.map(i => ({ id: i.id, productId: i.product_id, image: i.image })) };
  });
  res.json({ group: { ...serializeGroup(group), products: withImages } });
});

adminRouter.patch('/product-groups/:id', (req: Request, res: Response): void => {
  const { name, description, category, image } = req.body as Record<string, string | null | undefined>;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM product_groups WHERE id = ?').get(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
  const updates: string[] = [];
  const values: unknown[] = [];
  if (name !== undefined)        { updates.push('name = ?');        values.push(name); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (category !== undefined)    { updates.push('category = ?');    values.push(category); }
  if (image !== undefined)       { updates.push('image = ?');       values.push(image); }
  if (updates.length === 0) { res.status(400).json({ error: 'Nothing to update' }); return; }
  values.push(req.params.id);
  db.prepare(`UPDATE product_groups SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const updated = db.prepare('SELECT * FROM product_groups WHERE id = ?').get(req.params.id) as Record<string, unknown>;
  res.json({ group: serializeGroup(updated) });
});

adminRouter.delete('/product-groups/:id', (req: Request, res: Response): void => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM product_groups WHERE id = ?').get(req.params.id)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  db.prepare('DELETE FROM product_groups WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Products ─────────────────────────────────────────────────────────────────

adminRouter.post('/product-groups/:groupId/products', (req: Request, res: Response): void => {
  const { name, description = '' } = req.body as Record<string, string>;
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }
  const db = getDb();
  if (!db.prepare('SELECT id FROM product_groups WHERE id = ?').get(req.params.groupId)) {
    res.status(404).json({ error: 'Group not found' }); return;
  }
  const result = db.prepare(
    'INSERT INTO products (product_group_id, name, description) VALUES (?,?,?)'
  ).run(req.params.groupId, name, description);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
  res.status(201).json({ product: { id: product.id, productGroupId: product.product_group_id, name: product.name, description: product.description, images: [] } });
});

adminRouter.patch('/products/:id', (req: Request, res: Response): void => {
  const { name, description } = req.body as Record<string, string | undefined>;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
  const updates: string[] = [];
  const values: unknown[] = [];
  if (name !== undefined)        { updates.push('name = ?');        values.push(name); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (updates.length === 0) { res.status(400).json({ error: 'Nothing to update' }); return; }
  values.push(req.params.id);
  db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as Record<string, unknown>;
  res.json({ product: { id: updated.id, productGroupId: updated.product_group_id, name: updated.name, description: updated.description } });
});

adminRouter.delete('/products/:id', (req: Request, res: Response): void => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Product Images ───────────────────────────────────────────────────────────

adminRouter.post('/products/:id/images', (req: Request, res: Response): void => {
  const { image } = req.body as { image: string };
  if (!image) { res.status(400).json({ error: 'image (base64) required' }); return; }
  const db = getDb();
  if (!db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id)) {
    res.status(404).json({ error: 'Product not found' }); return;
  }
  const result = db.prepare('INSERT INTO product_images (product_id, image) VALUES (?,?)').run(req.params.id, image);
  res.status(201).json({ image: { id: result.lastInsertRowid, productId: Number(req.params.id), image } });
});

adminRouter.delete('/product-images/:id', (req: Request, res: Response): void => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM product_images WHERE id = ?').get(req.params.id)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  db.prepare('DELETE FROM product_images WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
