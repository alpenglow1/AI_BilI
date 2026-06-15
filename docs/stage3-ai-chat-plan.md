# Stage 3: AI 对话功能 实施计划

## Context

按 `docs/requirements.md` 第 5.4 节、第 8 节、"阶段 3"，完成 AI 自然语言记账的核心闭环。当前状态：
- `chat_messages` 表 schema + migration 已就绪（`backend/src/db/schema.ts:29`、`backend/drizzle/0000_tiresome_mesmero.sql:24-30`）
- `mobile/src/app/chat.tsx` 是 12 行占位页
- 后端无 LLM 依赖；前端 AsyncStorage 已装但仅 Supabase 用

完成后用户应能在 AI 对话 tab 用自然语言记账、查询月度消费、闲聊；账单预览卡片支持确认入账 / 修改。

## 关键设计决策（请审核时确认；不同请直接说）

1. **GLM 接入**：用 Node 22 原生 `fetch` 调 `https://open.bigmodel.cn/api/paas/v4/chat/completions`，**零新依赖**。自写 ~50 行 client 封装在 `backend/src/lib/glm.ts`。理由：项目是 CommonJS（ts-node），第三方 SDK 多为 ESM 易冲突；fetch 路径最简。
2. **历史上下文**：**不传**历史，每次发送独立调用 GLM。理由：记账场景以独立录入为主，传历史会翻倍 token 成本。
3. **Assistant 消息存储**：**统一 JSON**。所有 assistant 消息的 `content` 字段存 `{ intent: 'bill'|'query'|'chat', ...payload }` 字符串。前端按 `intent` 分支渲染。
4. **BillDraft 直接带 categoryId**：后端在 `bill` intent 时，把 GLM 返回的中文 `category` 反查 categories 表得 `categoryId`，连同 `categoryName` 一起返回。前端"确认入账"时直接 POST /bills，无需再查分类。
5. **底部 Tab 浮起 + 按钮**：**不做**。当前用 `expo-router/unstable-native-tabs` 原生 tab，prototype 的浮起按钮需重写 tab bar，超出 Stage 3 范围，留到阶段 4 收尾。

## 实施步骤

### 后端

#### 1. 新增 `backend/src/lib/glm.ts` — GLM 客户端封装
- 导出 `chatCompletion({ messages, jsonMode?: boolean }): Promise<any>`
- 读 `process.env.GLM_API_KEY`、`process.env.GLM_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4'`
- model 写死 `'glm-4.7'`
- 用原生 fetch（Node 22 内置），60s 超时，抛错时带 `cause`
- `jsonMode=true` 时附 `response_format: { type: 'json_object' }`

#### 2. 新增 `backend/src/lib/prompts.ts` — System Prompt 设计
- `buildEntryPrompt(todayISO: string, categories: { type: string; name: string }[]): string`
  - 注入：今日日期（YYYY-MM-DD）、所有预设分类列表（按 type 分组）、三种 intent 判断规则、日期解析规则（今天/昨天/上周五/6月1日 → 绝对日期）
  - 强制要求 GLM 返回 JSON，schema：
    - bill: `{ intent: 'bill', type: 'expense'|'income', category: '餐饮', name: '麦当劳', amount: 48, date: '2026-06-15' }`
    - query: `{ intent: 'query', startDate: '2026-06-01', endDate: '2026-06-30', category?: '餐饮' }`
    - chat: `{ intent: 'chat', reply: '你好！...' }`
- `buildQuerySummaryPrompt(query, bills): string`
  - 二次调用，给 GLM 查询结果 + 用户原句，让它生成自然语言摘要

#### 3. 新增 `backend/src/routes/chat.ts` — 主路由
- 沿用 `bills.ts` 的 `getUserId(req)` 模式（读 `x-user-id` header），无中间件
- `GET /chat/messages?after=<ISO>`
  - 返回 `after` 之后该用户所有消息，按 createdAt 升序
  - `after` 可选，默认返回全部
- `POST /chat/send { content }`
  - 验证 content 非空字符串
  - 写入 user 消息到 `chat_messages`
  - 一次性查所有预设分类（`db.select().from(categories).where(isNull(categories.userId))`）
  - 拼 System Prompt + user content，调 GLM（jsonMode）
  - 解析 JSON 失败时降级：构造 `{ intent: 'chat', reply: '抱歉，我没听懂，能再说一次吗？' }`
  - 按 intent 分支：
    - `bill`：反查 `categoryId`（按 type + name 在 categories 表找）→ attach 到 payload
    - `query`：用 `(startDate, endDate, category?)` 查 bills 表 → 拼 `buildQuerySummaryPrompt` 二次调 GLM → 用返回文字替换 payload.reply
    - `chat`：直接用 GLM 返回的 reply
  - 把最终 payload 序列化成 JSON 字符串，写入 `chat_messages` 的 assistant 消息
  - 返回完整 assistant 消息（含解析后的 payload 对象）给前端
  - **全程 try/catch**：任何失败都返回 `{ intent: 'chat', reply: '服务出错了，请稍后重试' }` 兜底，避免 UI 卡死，同时 console.error 真实错误

#### 4. `backend/src/index.ts`
- 加 `import chatRoutes from './routes/chat'` + `app.use('/chat', chatRoutes)`

#### 5. 环境变量
- `backend/.env.example` 增 `GLM_API_KEY=` 和注释掉的 `GLM_BASE_URL=`
- 你需要在 `backend/.env` 里手动填智谱开放平台申请的 key

### 前端

#### 6. 扩展 `mobile/lib/types.ts`
```ts
type ChatRole = 'user' | 'assistant';
interface BaseMsg { id: string; userId: string; role: ChatRole; createdAt: string; }
interface UserMsg extends BaseMsg { role: 'user'; content: string; }
interface BillDraft { type: BillType; categoryId: string; categoryName: string; name: string; amount: number; date: string; }
type AssistantPayload =
  | { intent: 'bill'; bill: BillDraft }
  | { intent: 'query'; reply: string }
  | { intent: 'chat'; reply: string };
interface AssistantMsg extends BaseMsg { role: 'assistant'; content: AssistantPayload; }
type ChatMessage = UserMsg | AssistantMsg;
```

#### 7. 扩展 `mobile/lib/api.ts`
- `listMessages(after?: string): Promise<ChatMessage[]>` — GET `/chat/messages[?after=]`
- `sendMessage(content: string): Promise<AssistantMsg>` — POST `/chat/send`

#### 8. 新增 `mobile/lib/storage.ts` — AsyncStorage 包装
- `getClearedAt(): Promise<string | null>`
- `setClearedAt(iso: string): Promise<void>`
- key: `'chat.clearedAt'`

#### 9. 扩展 `mobile/src/components/bill-edit-modal.tsx`
- Props 加 `draft?: Partial<BillDraft>` 字段
- 在 `useEffect` 的 `!bill` 分支用 draft 预填 type/name/amount/date/categoryId（参考 `bill-edit-modal.tsx:68-74`）

#### 10. 新增 `mobile/src/components/chat-bubble.tsx`
- Props: `{ role: 'user' | 'assistant'; text: string }`
- 视觉对齐 `prototypes/chat.html:73-85`：
  - user：右对齐，`bg-primary text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[75%]`
  - assistant：左对齐，`bg-white border border-slate-100 text-slate-700 rounded-2xl rounded-tl-sm`

#### 11. 新增 `mobile/src/components/bill-preview-card.tsx`
- Props: `{ draft: BillDraft; status: 'pending'|'confirmed'; onConfirm: () => void; onEdit: () => void }`
- 视觉对齐 `prototypes/chat.html:104-135`：
  - 白卡片 + 左侧 `bg-primary w-1` 竖条 + 圆形分类图标（`getCategoryVisual(draft.categoryName).emoji + .bgClass`）
  - 标题（`draft.name`）+ 金额（`text-expense`/`text-income`）
  - 下方两按钮：`✅ 确认入账`（primary）、`✏️ 修改`（白底）
- `status='confirmed'` 时按钮替换为 `✅ 已入账` 文字

#### 12. 改造 `mobile/src/app/chat.tsx` — 完整聊天页
- Header：标题"AI 记账助手" + 🗑️ 按钮（弹 `ConfirmDialog`，确认后 `setClearedAt(now)` + 重拉 `listMessages(now)`）
- 消息列表：`FlatList`，正序渲染，外层包 `KeyboardAvoidingView`
- 渲染分支：
  - UserMsg → `<ChatBubble role="user">`
  - AssistantMsg.intent==='bill' → `<BillPreviewCard>`
  - AssistantMsg.intent==='query'|'chat' → `<ChatBubble role="assistant">`
  - 加载中 → 三点 bounce 动画（参考 `prototypes/chat.html:95-102`，用 RN `Animated` 实现）
- 输入区：圆角白框 + primary 圆形发送按钮，`prototypes/chat.html:140-154`
- 交互流：
  - 进入页面：`getClearedAt()` → `listMessages(clearedAt)` 渲染历史
  - 发送：插入用户气泡（乐观） → 调 `sendMessage(content)` → 隐藏 loading → 插入 assistant 消息
  - 账单卡片"确认入账"：调 `api.createBill(draft)` → 卡片切 `status='confirmed'`
  - 账单卡片"修改"：开 `BillEditModal visible draft={draft}` → 保存（即 createBill）后卡片切 confirmed

## 关键文件清单

**新增**：
- `backend/src/lib/glm.ts`
- `backend/src/lib/prompts.ts`
- `backend/src/routes/chat.ts`
- `mobile/lib/storage.ts`
- `mobile/src/components/chat-bubble.tsx`
- `mobile/src/components/bill-preview-card.tsx`

**修改**：
- `backend/src/index.ts` — 挂载 /chat 路由
- `backend/.env.example` — 加 GLM_API_KEY
- `mobile/lib/types.ts` — 加 ChatMessage 系列类型
- `mobile/lib/api.ts` — 加 listMessages / sendMessage
- `mobile/src/components/bill-edit-modal.tsx` — 加 draft prop
- `mobile/src/app/chat.tsx` — 整页改造

## 验证方式

**后端单独测**（先关代理）：
```bash
curl -X POST http://localhost:3000/chat/send \
  -H "Content-Type: application/json" \
  -H "x-user-id: <你的 user id>" \
  -d '{"content":"打车花了23块"}'
```
- 期望返回 `{ intent: 'bill', bill: { type: 'expense', categoryId: '...', categoryName: '交通', name: '打车', amount: 23, date: '2026-06-15' } }`

```bash
curl 'http://localhost:3000/chat/send' -X POST -H '...' -d '{"content":"这个月餐饮花了多少"}'
```
- 期望 `intent: 'query'`，reply 是基于真实 bills 数据的自然语言摘要

**前端联调**（Expo Go）：
1. 打开 AI 对话 tab → 看到空聊天页（无历史时）
2. 输入"Hi" → AI 文字气泡回复
3. 输入"昨天打车花了 23 块" → AI 账单预览卡片
4. 点"确认入账" → 卡片变"✅ 已入账" → 切到首页昨日 → 看到这笔
5. 再次输入"打车 23" → 点"修改" → 改金额保存 → 同样入账
6. 点🗑️ → 确认 → 界面清空，但 DB chat_messages 仍保留
7. 重启 app → 界面仍为空（clearedAt 在 AsyncStorage 持久）

## 风险/边界

- **GLM JSON 容错**：智谱 GLM-4.7 在 `response_format: json_object` 下基本稳定返回 JSON，但偶发不合规 → `JSON.parse` try/catch 降级为 chat + 提示文字
- **Query 链路耗时**：两次 GLM 调用，单次发送可能 5-10s → 前端必须显示三点 loading 动画
- **categoryId 找不到**：GLM 偶尔返回 categories 表里没有的分类名（如"网上购物"）→ bill intent 降级为：categoryId 取"其他支出" / "其他收入"（这两个是 seed 兜底分类）
- **Date 解析时区**：服务器和 GLM 都按本地时区"今天"算，前端展示用前端时区；若用户跨时区使用可能有 ±1 天偏差 → 当前不处理（国内用户场景）
- **Token 成本**：每次发送都注入完整 categories 列表（16 条）+ 三种 intent 规则，System Prompt 约 500-800 token；可接受
