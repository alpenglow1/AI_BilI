import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
// 延长连接超时到 30 秒（Supabase 悉尼节点延迟较高）
const client = postgres(connectionString, {
  ssl: 'require',
  connect_timeout: 30,
  idle_timeout: 30,
  max_lifetime: 60 * 5,
});
export const db = drizzle(client, { schema });
