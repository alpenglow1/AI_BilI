import { Router, Request, Response } from 'express';
import { db } from '../db/client';
import { categories } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// ─── GET /categories?type=expense|income ──────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;

  if (type && type !== 'expense' && type !== 'income') {
    return res.status(400).json({ error: 'type 必须为 expense 或 income' });
  }

  const rows = type
    ? await db.select().from(categories).where(eq(categories.type, type)).orderBy(categories.sortOrder)
    : await db.select().from(categories).orderBy(categories.type, categories.sortOrder);

  return res.json(rows);
});

export default router;
