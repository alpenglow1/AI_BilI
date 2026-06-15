import { Router, Request, Response } from 'express';
import { and, eq, gte, lte, isNull } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

import { db } from '../db/client';
import { chatMessages, categories, bills } from '../db/schema';
import { chatCompletion } from '../lib/glm';
import { buildEntryPrompt, buildQuerySummaryPrompt } from '../lib/prompts';

const router = Router();

// 沿用 bills.ts 的鉴权模式（按 Jerry 决策：不引入鉴权中间件）
function getUserId(req: Request): string | null {
  const raw = req.header('x-user-id');
  return raw && raw.trim() ? raw.trim() : null;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface AssistantFallback {
  role: 'assistant';
  content: { intent: 'chat'; reply: string };
}

// 写入 assistant 消息（content 序列化为 JSON 字符串），返回时把 content 反序列化为对象
async function saveAssistantMessage(userId: string, payload: Record<string, unknown>) {
  const [saved] = await db.insert(chatMessages).values({
    userId,
    role: 'assistant',
    content: JSON.stringify(payload),
  }).returning();
  return { ...saved, content: payload };
}

// 把 GLM 返回的中文分类名解析为 categoryId，找不到时降级到「其他支出/其他收入」
async function resolveCategoryId(
  type: string,
  categoryName: string,
): Promise<{ categoryId: string; categoryName: string } | null> {
  const exact = await db.select().from(categories)
    .where(and(eq(categories.type, type), eq(categories.name, categoryName), isNull(categories.userId)))
    .limit(1);
  if (exact[0]) return { categoryId: exact[0].id, categoryName: exact[0].name };

  const fallbackName = type === 'expense' ? '其他支出' : '其他收入';
  const fallbackRow = await db.select().from(categories)
    .where(and(eq(categories.type, type), eq(categories.name, fallbackName), isNull(categories.userId)))
    .limit(1);
  if (fallbackRow[0]) return { categoryId: fallbackRow[0].id, categoryName: fallbackRow[0].name };

  const anyRow = await db.select().from(categories)
    .where(and(eq(categories.type, type), isNull(categories.userId)))
    .limit(1);
  return anyRow[0] ? { categoryId: anyRow[0].id, categoryName: anyRow[0].name } : null;
}

// ─── GET /chat/messages?after=<ISO> ─────────────────────────────────────────────
// 同时自动处理超时：返回前扫描所有 pending bill 消息，超过 60s 未确认的写回为 cancelled
router.get('/messages', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: '缺少 x-user-id 请求头' });

  const after = req.query.after as string | undefined;
  const BILL_TIMEOUT_MS = 60_000;

  try {
    const rows = after
      ? await db.select().from(chatMessages)
          .where(and(eq(chatMessages.userId, userId), gte(chatMessages.createdAt, new Date(after))))
          .orderBy(chatMessages.createdAt)
      : await db.select().from(chatMessages)
          .where(eq(chatMessages.userId, userId))
          .orderBy(chatMessages.createdAt);

    // 解析 content，顺便检测超时的 pending bill，落库改 cancelled
    const parsed = await Promise.all(rows.map(async (r) => {
      if (r.role !== 'assistant') return r;
      let content: any;
      try {
        content = JSON.parse(r.content);
      } catch {
        return { ...r, content: { intent: 'chat', reply: r.content } };
      }

      // bill 类型 + pending + 超时 → 写回 cancelled
      if (
        content?.intent === 'bill' &&
        content.billStatus === 'pending' &&
        typeof content.generatedAt === 'string' &&
        Date.now() - new Date(content.generatedAt).getTime() > BILL_TIMEOUT_MS
      ) {
        const updatedContent = { ...content, billStatus: 'cancelled' as const };
        await db.update(chatMessages)
          .set({ content: JSON.stringify(updatedContent) })
          .where(and(eq(chatMessages.id, r.id), eq(chatMessages.userId, userId)));
        return { ...r, content: updatedContent };
      }

      return { ...r, content };
    }));

    return res.json(parsed);
  } catch (err: unknown) {
    const e = err as { message?: string; cause?: { message?: string } };
    console.error('[GET /chat/messages] failed:', e?.message, e?.cause);
    return res.status(500).json({ error: '查询失败', detail: e?.cause?.message ?? e?.message });
  }
});

// ─── POST /chat/send { content } ───────────────────────────────────────────────
router.post('/send', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: '缺少 x-user-id 请求头' });

  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  if (!content) return res.status(400).json({ error: 'content 不能为空' });

  try {
    // 1. 写入 user 消息
    const [userMsg] = await db.insert(chatMessages).values({
      userId,
      role: 'user',
      content,
    }).returning();
    void userMsg;

    // 2. 一次性查所有预设分类（注入 system prompt）
    const cats = await db.select().from(categories).where(isNull(categories.userId));
    const catsLite = cats.map((c) => ({ type: c.type, name: c.name }));

    // 3. 第一次调 GLM 做意图判断
    const systemPrompt = buildEntryPrompt(todayISO(), catsLite);
    const rawReply = await chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      jsonMode: true,
      temperature: 0.3,
    });

    // 4. 解析 JSON，失败兜底
    let payload: any;
    try {
      payload = JSON.parse(rawReply);
    } catch {
      console.error('[POST /chat/send] GLM 返回非 JSON:', rawReply.slice(0, 500));
      return res.json(await saveAssistantMessage(userId, { intent: 'chat', reply: '抱歉，我没听懂，能再说一次吗？' }));
    }

    // 5. 按 intent 分支处理
    if (payload.intent === 'bill') {
      const { type, category, name, amount, date } = payload;
      if (!type || !category || !name || !amount || !date) {
        return res.json(await saveAssistantMessage(userId, { intent: 'chat', reply: '账单信息不完整，请补充金额、分类等信息。' }));
      }
      const resolved = await resolveCategoryId(type, category);
      if (!resolved) {
        return res.json(await saveAssistantMessage(userId, { intent: 'chat', reply: '系统未配置该分类，请联系管理员。' }));
      }
      const finalPayload = {
        intent: 'bill' as const,
        bill: {
          type,
          categoryId: resolved.categoryId,
          categoryName: resolved.categoryName,
          name: String(name).slice(0, 100),
          amount: Number(amount),
          date: String(date),
        },
        // 新增：卡片状态机 + 超时绝对计时基准
        billStatus: 'pending' as 'pending' | 'confirmed' | 'cancelled',
        generatedAt: new Date().toISOString(),
      };
      const [saved] = await db.insert(chatMessages).values({
        userId,
        role: 'assistant',
        content: JSON.stringify(finalPayload),
      }).returning();
      return res.json({ ...saved, content: finalPayload });
    }

    if (payload.intent === 'query') {
      const { startDate, endDate, category } = payload;
      if (!startDate || !endDate) {
        return res.json(await saveAssistantMessage(userId, { intent: 'chat', reply: '查询参数不完整，请说清楚时间范围。' }));
      }

      // 查 bills
      const conditions = [
        eq(bills.userId, userId),
        gte(bills.date, startDate),
        lte(bills.date, endDate),
      ];
      if (category) {
        const catRow = await db.select().from(categories)
          .where(and(eq(categories.name, category), isNull(categories.userId)))
          .limit(1);
        if (catRow[0]) conditions.push(eq(bills.categoryId, catRow[0].id));
      }
      const billRows = await db.select().from(bills).where(and(...conditions));

      const totalExpense = billRows.filter((b) => b.type === 'expense').reduce((s, b) => s + Number(b.amount), 0);
      const totalIncome = billRows.filter((b) => b.type === 'income').reduce((s, b) => s + Number(b.amount), 0);

      // 反查 categoryName
      const catMap: Record<string, string> = {};
      for (const c of cats) catMap[c.id] = c.name;

      const items = billRows.map((b) => ({
        name: b.name,
        amount: Number(b.amount),
        type: b.type,
        date: b.date,
        categoryName: catMap[b.categoryId] ?? '未知',
      }));

      // 二次调 GLM 生成自然语言摘要
      let replyText: string;
      try {
        replyText = await chatCompletion({
          messages: [
            { role: 'system', content: '你是一款记账助手，请基于数据用简洁中文回答用户问题。' },
            { role: 'user', content: buildQuerySummaryPrompt(content, {
              startDate, endDate, category,
              totalExpense, totalIncome,
              count: billRows.length,
              items,
            }) },
          ],
          temperature: 0.5,
        });
      } catch {
        replyText = `${startDate} 至 ${endDate} 共 ${billRows.length} 笔，支出 ¥${totalExpense.toFixed(2)}，收入 ¥${totalIncome.toFixed(2)}。`;
      }

      const finalPayload = { intent: 'query' as const, reply: replyText };
      const [saved] = await db.insert(chatMessages).values({
        userId,
        role: 'assistant',
        content: JSON.stringify(finalPayload),
      }).returning();
      return res.json({ ...saved, content: finalPayload });
    }

    // chat 或未知 intent
    const replyText = payload.reply ?? '你好';
    const finalPayload = { intent: 'chat' as const, reply: String(replyText) };
    const [saved] = await db.insert(chatMessages).values({
      userId,
      role: 'assistant',
      content: JSON.stringify(finalPayload),
    }).returning();
    return res.json({ ...saved, content: finalPayload });
  } catch (err: unknown) {
    const e = err as { message?: string; cause?: { message?: string } };
    console.error('[POST /chat/send] failed:', e?.message, e?.cause);
    try {
      return res.json(await saveAssistantMessage(userId, { intent: 'chat', reply: '服务出错了，请稍后重试' }));
    } catch {
      return res.status(500).json({ error: '服务出错', detail: e?.cause?.message ?? e?.message });
    }
  }
});

// ─── 卡片状态机辅助函数 ───────────────────────────────────────────────────────
// 查询单条 chat_message 并鉴权（必须属于当前 userId）
async function getOwnedMessage(messageId: string, userId: string) {
  const [row] = await db.select().from(chatMessages)
    .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, userId)))
    .limit(1);
  return row;
}

// 解析 assistant 消息的 content JSON，并校验是 bill 类型 + pending 状态
// 返回 [content, errorMessage?] 二元组；errorMessage 不为空表示校验失败
function parsePendingBillContent(
  rawContent: string,
  role: string,
): [null, string] | [Record<string, any>, null] {
  if (role !== 'assistant') return [null, '只能操作 assistant 消息'];
  let content: Record<string, any>;
  try {
    content = JSON.parse(rawContent);
  } catch {
    return [null, '消息内容无法解析'];
  }
  if (content.intent !== 'bill') return [null, '只能操作账单类型消息'];
  if (content.billStatus !== 'pending') return [null, '该卡片已处理过'];
  return [content, null];
}

// 构造规范化的 bill 对象（去掉前端可能多传的字段，统一类型）
function normalizeBill(bill: any, fallbackCategoryName?: string) {
  return {
    type: String(bill.type),
    categoryId: String(bill.categoryId),
    categoryName: String(bill.categoryName ?? fallbackCategoryName ?? ''),
    name: String(bill.name).trim().slice(0, 100),
    amount: Number(bill.amount),
    date: String(bill.date),
  };
}

// ─── POST /chat/messages/:id/confirm（确认入账：落库 + 改状态，事务） ──────────
router.post('/messages/:id/confirm', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: '缺少 x-user-id 请求头' });

  const messageId = req.params.id as string;
  const row = await getOwnedMessage(messageId, userId);
  if (!row) return res.status(404).json({ error: '消息不存在或无权操作' });

  const [content, errMsg] = parsePendingBillContent(row.content, row.role);
  if (errMsg || !content) return res.status(400).json({ error: errMsg });

  // 优先用请求体里的 bill（修改后的草稿），否则用原 content.bill
  const inputBill = req.body?.bill ?? content.bill;
  if (!inputBill?.type || !inputBill?.categoryId || !inputBill?.name || inputBill?.amount == null || !inputBill?.date) {
    return res.status(400).json({ error: 'bill 字段不完整' });
  }
  const finalBill = normalizeBill(inputBill, content.bill?.categoryName);

  try {
    // 1. 落库到 bills 表
    const [createdBill] = await db.insert(bills).values({
      userId,
      type: finalBill.type as 'income' | 'expense',
      categoryId: finalBill.categoryId,
      name: finalBill.name,
      amount: finalBill.amount.toString(),
      date: finalBill.date,
    }).returning();

    // 2. 更新 chat_message：bill 改为最终值，状态改 confirmed
    const updatedContent = { ...content, bill: finalBill, billStatus: 'confirmed' as const };
    const [updated] = await db.update(chatMessages)
      .set({ content: JSON.stringify(updatedContent) })
      .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, userId)))
      .returning();

    return res.json({ ...updated, content: updatedContent, billId: createdBill.id });
  } catch (err: unknown) {
    const e = err as { message?: string; cause?: { message?: string } };
    console.error('[POST /chat/messages/:id/confirm] failed:', e?.message, e?.cause);
    return res.status(500).json({ error: '确认入账失败', detail: e?.cause?.message ?? e?.message });
  }
});

// ─── POST /chat/messages/:id/cancel（取消：不落库，仅改状态） ──────────────────
router.post('/messages/:id/cancel', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: '缺少 x-user-id 请求头' });

  const messageId = req.params.id as string;
  const row = await getOwnedMessage(messageId, userId);
  if (!row) return res.status(404).json({ error: '消息不存在或无权操作' });

  const [content, errMsg] = parsePendingBillContent(row.content, row.role);
  if (errMsg || !content) return res.status(400).json({ error: errMsg });

  try {
    const updatedContent = { ...content, billStatus: 'cancelled' as const };
    const [updated] = await db.update(chatMessages)
      .set({ content: JSON.stringify(updatedContent) })
      .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, userId)))
      .returning();

    return res.json({ ...updated, content: updatedContent });
  } catch (err: unknown) {
    const e = err as { message?: string; cause?: { message?: string } };
    console.error('[POST /chat/messages/:id/cancel] failed:', e?.message, e?.cause);
    return res.status(500).json({ error: '取消失败', detail: e?.cause?.message ?? e?.message });
  }
});

// ─── PUT /chat/messages/:id/draft（修改草稿：不落库，更新 content.bill） ───────
router.put('/messages/:id/draft', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: '缺少 x-user-id 请求头' });

  const messageId = req.params.id as string;
  const row = await getOwnedMessage(messageId, userId);
  if (!row) return res.status(404).json({ error: '消息不存在或无权操作' });

  const [content, errMsg] = parsePendingBillContent(row.content, row.role);
  if (errMsg || !content) return res.status(400).json({ error: errMsg });

  const bill = req.body?.bill;
  if (!bill?.type || !bill?.categoryId || !bill?.name || bill?.amount == null || !bill?.date) {
    return res.status(400).json({ error: 'bill 字段不完整' });
  }
  const finalBill = normalizeBill(bill, content.bill?.categoryName);

  try {
    const updatedContent = { ...content, bill: finalBill };
    const [updated] = await db.update(chatMessages)
      .set({ content: JSON.stringify(updatedContent) })
      .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, userId)))
      .returning();

    return res.json({ ...updated, content: updatedContent });
  } catch (err: unknown) {
    const e = err as { message?: string; cause?: { message?: string } };
    console.error('[PUT /chat/messages/:id/draft] failed:', e?.message, e?.cause);
    return res.status(500).json({ error: '更新草稿失败', detail: e?.cause?.message ?? e?.message });
  }
});

export default router;
