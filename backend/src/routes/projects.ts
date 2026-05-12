import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getDb } from '../db/database';

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

interface DbProject {
  id: number; user_id: number; name: string;
  original_image: string; latest_image: string;
  preferences: string | null; created_at: number; updated_at: number;
}

interface DbHistoryItem {
  id: number; project_id: number; image_url: string;
  type: string; label: string; created_at: number;
}

// List projects (omit original_image for lightweight listing)
projectsRouter.get('/', (req: Request, res: Response): void => {
  const db = getDb();
  const rows = db.prepare(
    'SELECT id, user_id, name, latest_image, preferences, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC'
  ).all(req.user!.userId) as Omit<DbProject, 'original_image'>[];
  res.json({ projects: rows });
});

// Create project
projectsRouter.post('/', (req: Request, res: Response): void => {
  const { name, original_image, latest_image, preferences } = req.body as {
    name: string; original_image: string; latest_image: string; preferences?: unknown;
  };
  if (!original_image || !latest_image) {
    res.status(400).json({ error: 'original_image and latest_image are required' }); return;
  }
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO projects (user_id, name, original_image, latest_image, preferences) VALUES (?,?,?,?,?)'
  ).run(req.user!.userId, name || 'My Garden', original_image, latest_image, preferences ? JSON.stringify(preferences) : null);
  const project = db.prepare(
    'SELECT id, user_id, name, latest_image, preferences, created_at, updated_at FROM projects WHERE id = ?'
  ).get(result.lastInsertRowid) as Omit<DbProject, 'original_image'>;
  res.json({ project });
});

// Get project with history
projectsRouter.get('/:id', (req: Request, res: Response): void => {
  const db = getDb();
  const project = db.prepare(
    'SELECT * FROM projects WHERE id = ? AND user_id = ?'
  ).get(Number(req.params.id), req.user!.userId) as DbProject | undefined;
  if (!project) { res.status(404).json({ error: 'Not found' }); return; }
  const history = db.prepare(
    'SELECT * FROM project_history WHERE project_id = ? ORDER BY created_at ASC'
  ).all(project.id) as DbHistoryItem[];
  res.json({ project: { ...project, history } });
});

// Update project (latest_image, preferences, name)
projectsRouter.patch('/:id', (req: Request, res: Response): void => {
  const db = getDb();
  const project = db.prepare(
    'SELECT id FROM projects WHERE id = ? AND user_id = ?'
  ).get(Number(req.params.id), req.user!.userId) as { id: number } | undefined;
  if (!project) { res.status(404).json({ error: 'Not found' }); return; }

  const { latest_image, preferences, name } = req.body as {
    latest_image?: string; preferences?: unknown; name?: string;
  };
  const now = Math.floor(Date.now() / 1000);
  if (latest_image) {
    db.prepare('UPDATE projects SET latest_image = ?, updated_at = ? WHERE id = ?')
      .run(latest_image, now, project.id);
  }
  if (preferences !== undefined) {
    db.prepare('UPDATE projects SET preferences = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(preferences), now, project.id);
  }
  if (name) {
    db.prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?')
      .run(name, now, project.id);
  }
  const updated = db.prepare(
    'SELECT id, user_id, name, latest_image, preferences, created_at, updated_at FROM projects WHERE id = ?'
  ).get(project.id) as Omit<DbProject, 'original_image'>;
  res.json({ project: updated });
});

// Add history entry
projectsRouter.post('/:id/history', (req: Request, res: Response): void => {
  const db = getDb();
  const project = db.prepare(
    'SELECT id FROM projects WHERE id = ? AND user_id = ?'
  ).get(Number(req.params.id), req.user!.userId) as { id: number } | undefined;
  if (!project) { res.status(404).json({ error: 'Not found' }); return; }

  const { image_url, type, label } = req.body as { image_url: string; type: string; label: string };
  if (!image_url || !type || !label) { res.status(400).json({ error: 'image_url, type, label required' }); return; }

  db.prepare(
    'INSERT INTO project_history (project_id, image_url, type, label) VALUES (?,?,?,?)'
  ).run(project.id, image_url, type, label);

  // Update project's updated_at and latest_image
  const now = Math.floor(Date.now() / 1000);
  db.prepare('UPDATE projects SET latest_image = ?, updated_at = ? WHERE id = ?')
    .run(image_url, now, project.id);

  res.json({ ok: true });
});

// Delete project
projectsRouter.delete('/:id', (req: Request, res: Response): void => {
  const db = getDb();
  db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.user!.userId);
  res.json({ ok: true });
});
