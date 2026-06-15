# AI 记账 App

> 一款基于 AI 自然语言识别的智能记账 App。用户通过与 AI 聊天的方式完成记账，支持账单明细查看、编辑及个人信息管理。
>
> 版本：v1.0 ｜ 日期：2026-06-15

---

## 技术栈

| 层级 | 技术选型 |
|------|---------|
| 前端 | React Native 0.85 + Expo 56 + TypeScript + NativeWind v4 + expo-router |
| 后端 | Express 5 + TypeScript + ts-node |
| 数据库 | Supabase PostgreSQL |
| ORM | Drizzle ORM + drizzle-kit |
| AI 模型 | 智谱 GLM-4.7 |
| 认证 | Supabase Auth（前端直连，后端用 JWT 校验） |
| 状态管理 | Zustand |

---

## 项目结构

```
ai_bill/
├── backend/                    # Express + TS 后端
│   ├── src/
│   │   ├── db/                 # Drizzle schema、client、seed
│   │   ├── routes/             # auth / bills / categories / chat
│   │   ├── lib/                # supabase admin / glm 客户端等
│   │   └── index.ts            # Express 入口
│   ├── drizzle/                # 迁移文件
│   ├── drizzle.config.ts
│   └── package.json
├── mobile/                     # React Native (Expo) 前端
│   ├── src/
│   │   ├── app/                # expo-router 路由（_layout / index / chat / profile）
│   │   ├── screens/            # LoginScreen / RegisterScreen
│   │   ├── components/         # 业务组件（账单卡片、编辑弹窗等）
│   │   │   └── ui/             # 可复用 GradientButton / GradientInput
│   │   ├── constants/          # 颜色 / 主题
│   │   ├── hooks/
│   │   └── store/              # zustand auth-store
│   ├── lib/
│   │   ├── api.ts              # 后端 REST 客户端
│   │   ├── supabase.ts         # 前端直连的 Supabase client
│   │   ├── storage.ts          # AsyncStorage 封装（clearedAt 等）
│   │   └── types.ts            # BillDraft / AssistantPayload 等类型
│   ├── assets/
│   ├── app.json
│   └── package.json
└── docs/
    ├── requirements.md         # 完整需求文档
    ├── stage3-ai-chat-plan.md  # 阶段 3（AI 对话）实现计划
    └── prototypes/             # HTML 原型（开发期 UI 对照基准）
        ├── login.html
        ├── register.html
        ├── home.html
        ├── chat.html
        ├── editModal.html
        ├── editUsernameModal.html
        ├── editPasswordModal.html
        ├── profile.html
        └── index.html
```

---

## 系统架构

```
┌─────────────────────────────────────────┐
│           React Native (前端)            │
│   首页 | AI对话页 | 我                   │
└──────────────┬──────────────────────────┘
               │ HTTP / REST API
┌──────────────▼──────────────────────────┐
│         Express + TypeScript (后端)      │
│   Auth路由 | 账单路由 | AI对话路由        │
│              Drizzle ORM                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Supabase PostgreSQL (数据库)        │
│   users ｜categories| bills | chat_messages │
└─────────────────────────────────────────┘
               +
┌─────────────────────────────────────────┐
│         智谱 GLM-4.7 API                │
│         自然语言 → 账单结构化数据         │
└─────────────────────────────────────────┘
```

---

## 快速开始

### 1. 准备外部依赖

- **Supabase 项目**：在 [supabase.com](https://supabase.com) 新建一个项目，拿到：
  - `Project URL`（如 `https://xxxx.supabase.co`）
  - `anon key`
  - 数据库连接串（`Settings → Database → Connection string`，选 URI 形式）
- **智谱开放平台 API Key**：在 [open.bigmodel.cn](https://open.bigmodel.cn/) 申请 `GLM_API_KEY`。

### 2. 配置后端

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 填入 SUPABASE_URL / SUPABASE_ANON_KEY / DATABASE_URL / GLM_API_KEY
```

`.env` 字段：

```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
# 密码中的特殊字符需要 URL 编码（@ → %40，# → %23）
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
GLM_API_KEY=your-glm-api-key
# GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4   （可选，默认即此值）
```

数据库迁移 + 种子数据：

```bash
npm run db:generate    # 生成迁移文件
npm run db:migrate     # 应用迁移（建表）
npm run db:seed        # 写入 16 条预设分类（10 支出 + 6 收入）
```

启动开发服务器：

```bash
npm run dev            # nodemon + ts-node，端口 3000
```

### 3. 配置前端

前端需要知道后端地址和 Supabase 公共凭据。在 `mobile/` 下创建 `.env`（或通过 Expo 的 app config 注入），按项目实际接入方式配置即可。

```bash
cd mobile
npm install
```

启动 Expo dev：

```bash
npm start              # 等价于 expo start
# 或指定平台：
npm run ios
npm run android
```

> ⚠️ **Expo 56**：写代码前请阅读版本化文档 https://docs.expo.dev/versions/v56.0.0/

---

## 功能特性

### 三个主 Tab

| Tab | 路径 | 功能 |
|-----|------|------|
| 明细 | `/home` | 日期切换、当日收入/支出/结余统计、账单卡片列表、点击编辑 |
| AI 对话 | `/chat` | 自然语言记账，支持账单录入 / 数据查询 / 闲聊三种意图 |
| 我 | `/profile` | 用户名 / 邮箱展示，修改用户名、修改密码、退出登录 |

### AI 对话三种意图

| 模式 | 用户输入示例 | AI 回复形式 |
|------|------------|------------|
| 账单录入 | "打车花了23块" | 账单预览卡片（确认入账 / 修改 / 取消） |
| 数据查询 | "这个月餐饮花了多少" | 二次调用 GLM 生成自然语言摘要 |
| 闲聊 | "你好" | 普通文字气泡 |

### 账单卡片三态

- **pending**：3 个按钮（确认入账 / 修改 / 取消），1 分钟内未操作自动取消
- **confirmed**：写库后卡片变为「已入账」
- **cancelled**：不写库，卡片变为「已取消」

---

## API 接口清单

### 认证 `/auth`

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/auth/register` | 用户注册 |
| POST | `/auth/login` | 用户登录 |
| POST | `/auth/change-username` | 修改用户名 |
| POST | `/auth/change-password` | 修改密码 |
| POST | `/auth/logout` | 退出登录 |

### 分类 `/categories`

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/categories?type=expense` | 获取指定类型的二级分类 |

### 账单 `/bills`

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/bills?date=YYYY-MM-DD` | 获取指定日期账单 |
| POST | `/bills` | 新增账单 |
| PUT | `/bills/:id` | 编辑账单 |
| DELETE | `/bills/:id` | 删除账单 |

### 聊天 `/chat`

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/chat/messages` | 获取历史消息（自动处理超时取消） |
| POST | `/chat/send` | 发送消息，后端统一处理（录入 / 查询 / 闲聊） |
| POST | `/chat/messages/:id/confirm` | 确认入账（事务：写 bills + 改卡片状态） |
| POST | `/chat/messages/:id/cancel` | 取消卡片（不写库） |
| PUT | `/chat/messages/:id/draft` | 保存"修改"后的草稿（不写库） |

---

## 数据库设计

| 表 | 说明 |
|----|------|
| `auth.users` | Supabase Auth 自动维护 |
| `categories` | 二级分类（type / name / is_default / user_id / sort_order） |
| `bills` | 账单（type / category_id / name / amount / date） |
| `chat_messages` | 聊天消息（role / content，其中 assistant 的 `content` 是 JSON，包含 `intent` / `bill` / `billStatus` / `generatedAt`） |

---

## 关键设计决策

- **前端直连 Supabase Auth**：登录 / 注册 / 修改密码走 Supabase JS SDK，后端用 `supabase.auth.getUser(jwt)` 校验 token，避免自己维护密码哈希。
- **`chat_messages.content` 存 JSON 字符串**：assistant 消息按 `intent` 区分（bill / query / chat），`intent='bill'` 时 payload 含 `bill` / `billStatus` / `generatedAt`。不另开表，避免 schema 演进成本。
- **AI 卡片 1 分钟超时**：从卡片生成时刻绝对计时（`generatedAt`），GET `/chat/messages` 返回前会先把已超时的 pending 卡片改为 cancelled，保证前端拿到的是终态。
- **「清除聊天显示」仅本地**：`clearedAt` 存 AsyncStorage，数据库记录永久保留。
- **图标统一用 Font Awesome 6**：通过 `@expo/vector-icons` 的 `FontAwesome6` 组件对齐原型；底部 Tab 在 iOS 用 SF Symbols（`sf` prop），Android 退回 PNG。

---

## 开发约定

- **写代码前必读 `docs/requirements.md`** —— 全量需求文档。
- **涉及前端必读 `docs/prototypes/` 下对应 HTML** —— UI 像素级对齐基准。
- **Expo 56 API 以 https://docs.expo.dev/versions/v56.0.0/ 为准**，不要凭记忆写。
- 不写兼容性代码（除非显式要求）。

---

## 文档

- [`docs/requirements.md`](docs/requirements.md) — 完整需求（页面、接口、DB、AI 流程）
- [`docs/stage3-ai-chat-plan.md`](docs/stage3-ai-chat-plan.md) — AI 对话阶段实现计划
- [`docs/prototypes/`](docs/prototypes/) — HTML 原型
