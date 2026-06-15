import dotenv from 'dotenv';
dotenv.config();

import { db } from './client';
import { categories } from './schema';

const expenseCategories = [
  { type: 'expense', name: '餐饮', sortOrder: 1 },
  { type: 'expense', name: '交通', sortOrder: 2 },
  { type: 'expense', name: '购物', sortOrder: 3 },
  { type: 'expense', name: '居住', sortOrder: 4 },
  { type: 'expense', name: '娱乐', sortOrder: 5 },
  { type: 'expense', name: '医疗', sortOrder: 6 },
  { type: 'expense', name: '人情', sortOrder: 7 },
  { type: 'expense', name: '零食', sortOrder: 8 },
  { type: 'expense', name: '宠物', sortOrder: 9 },
  { type: 'expense', name: '其他支出', sortOrder: 10 },
];

const incomeCategories = [
  { type: 'income', name: '工资', sortOrder: 1 },
  { type: 'income', name: '理财', sortOrder: 2 },
  { type: 'income', name: '红包', sortOrder: 3 },
  { type: 'income', name: '借入', sortOrder: 4 },
  { type: 'income', name: '兼职', sortOrder: 5 },
  { type: 'income', name: '其他收入', sortOrder: 6 },
];

async function seed() {
  console.log('🌱 开始写入预置分类数据...');

  const allCategories = [...expenseCategories, ...incomeCategories];

  for (const cat of allCategories) {
    await db.insert(categories).values({
      type: cat.type,
      name: cat.name,
      isDefault: true,
      userId: null,
      sortOrder: cat.sortOrder,
    }).onConflictDoNothing();
  }

  console.log(`✅ 成功写入 ${allCategories.length} 条分类数据（10条支出 + 6条收入）`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed 失败:', err);
  process.exit(1);
});
