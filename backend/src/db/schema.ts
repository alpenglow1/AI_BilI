import { pgTable, uuid, varchar, text, boolean, integer, decimal, date, timestamp } from 'drizzle-orm/pg-core';

// ─── categories 二级分类表 ───────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 10 }).notNull(),        // 'income' | 'expense'
  name: varchar('name', { length: 50 }).notNull(),         // 分类名称（如：餐饮、交通）
  isDefault: boolean('is_default').notNull().default(true),
  userId: uuid('user_id'),                                 // null = 系统预设，有值 = 用户自定义
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── bills 账单表 ─────────────────────────────────────────────────────────────
export const bills = pgTable('bills', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),                       // FK → auth.users
  type: varchar('type', { length: 10 }).notNull(),         // 'income' | 'expense'（冗余，加速统计）
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  name: varchar('name', { length: 100 }).notNull(),        // 账单标题（具体备注）
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  date: date('date').notNull(),                            // 精确到年月日
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── chat_messages 聊天记录表 ────────────────────────────────────────────────
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),                       // FK → auth.users
  role: varchar('role', { length: 10 }).notNull(),         // 'user' | 'assistant'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
