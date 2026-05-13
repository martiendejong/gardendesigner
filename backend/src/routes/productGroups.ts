import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';
import { requireAuth } from '../middleware/auth';

export const productGroupsRouter = Router();
productGroupsRouter.use(requireAuth);

productGroupsRouter.get('/', (req: Request, res: Response): void => {
  const db = getDb();
  const userId = req.user!.userId;

  const groups = db.prepare(`
    SELECT pg.* FROM product_groups pg
    INNER JOIN user_product_groups upg ON upg.product_group_id = pg.id
    WHERE upg.user_id = ?
    ORDER BY pg.category, pg.name
  `).all(userId) as Record<string, unknown>[];

  const result = groups.map(g => {
    const products = db.prepare(
      'SELECT * FROM products WHERE product_group_id = ? ORDER BY name'
    ).all(g.id) as Record<string, unknown>[];
    const withImages = products.map(p => {
      const images = db.prepare(
        'SELECT id, product_id, image FROM product_images WHERE product_id = ? ORDER BY id'
      ).all(p.id) as Record<string, unknown>[];
      return {
        id: p.id,
        productGroupId: p.product_group_id,
        name: p.name,
        description: p.description,
        images: images.map(i => ({ id: i.id, productId: i.product_id, image: i.image })),
      };
    });
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      category: g.category,
      image: g.image,
      products: withImages,
    };
  });

  res.json({ groups: result });
});
