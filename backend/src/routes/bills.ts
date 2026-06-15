import { Router, Request, Response } from 'express';
import { db } from '../db/client';
import { bills } from '../db/schema';
import { and, eq } from 'drizzle-orm';

const router = Router();

// 通过 x-user-id header 读取当前用户 ID（按 Jerry 决策：不引入鉴权中间件）
function getUserId(req: Request): string | null {
  const raw = req.header('x-user-id');
  return raw && raw.trim() ? raw.trim() : null;
}

interface BillInput {
  type?: string;
  categoryId?: string;
  name?: string;
  amount?: string | number;
  date?: string;
}

function validateBill(body: BillInput, partial = false) {
  const errors: string[] = [];
  const need = (cond: boolean, msg: string) => { if (!cond) errors.push(msg); };

  if (!partial || body.type !== undefined) {
    need(body.type === 'expense' || body.type === 'income', 'type 必须为 expense 或 income');
  }
  if (!partial || body.categoryId !== undefined) need(!!body.categoryId, 'categoryId 不能为空');
  if (!partial || body.name !== undefined) {
    need(typeof body.name === 'string' && body.name.trim().length > 0, 'name 不能为空');
  }
  if (!partial || body.amount !== undefined) {
    const amt = Number(body.amount);
    need(!Number.isNaN(amt) && amt > 0, 'amount 必须为大于 0 的数字');
  }
  if (!partial || body.date !== undefined) {
    need(typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date), 'date 必须为 YYYY-MM-DD');
  }
  return errors;
}

// ─── GET /bills?date=YYYY-MM-DD ───────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: '缺少 x-user-id 请求头' });

  const date = req.query.date as string | undefined;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date 参数必须为 YYYY-MM-DD' });
  }

  try {
    const rows = await db.select().from(bills)
      .where(and(eq(bills.userId, userId), eq(bills.date, date)))
      .orderBy(bills.createdAt);

    return res.json(rows);
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; cause?: { message?: string; code?: string } };
    console.error('[GET /bills] query failed:', {
      message: e?.message,
      code: e?.code,
      cause: e?.cause,
    });
    return res.status(500).json({ error: '查询失败', detail: e?.cause?.message ?? e?.message });
  }
});

// ─── POST /bills ──────────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: '缺少 x-user-id 请求头' });

  const errors = validateBill(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const { type, categoryId, name, amount, date } = req.body as Required<BillInput>;
  const [created] = await db.insert(bills).values({
    userId,
    type,
    categoryId,
    name: name.trim(),
    amount: amount.toString(),
    date,
  }).returning();

  return res.status(201).json(created);
});

// ─── PUT /bills/:id ───────────────────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: '缺少 x-user-id 请求头' });

  const errors = validateBill(req.body, true);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const body = req.body as BillInput;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.type) patch.type = body.type;
  if (body.categoryId) patch.categoryId = body.categoryId;
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.amount !== undefined) patch.amount = body.amount.toString();
  if (body.date) patch.date = body.date;

  const [updated] = await db.update(bills)
    .set(patch)
    .where(and(eq(bills.id, req.params.id as string), eq(bills.userId, userId)))
    .returning();

  if (!updated) return res.status(404).json({ error: '账单不存在或无权修改' });
  return res.json(updated);
});

// ─── DELETE /bills/:id ────────────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: '缺少 x-user-id 请求头' });

  const [deleted] = await db.delete(bills)
    .where(and(eq(bills.id, req.params.id as string), eq(bills.userId, userId)))
    .returning();

  if (!deleted) return res.status(404).json({ error: '账单不存在或无权删除' });
  return res.json({ message: '已删除', id: deleted.id });
});

export default router;
