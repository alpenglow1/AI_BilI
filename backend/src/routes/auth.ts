import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// ─── POST /auth/register ─────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, username } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '邮箱和密码不能为空' });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username: username || email.split('@')[0] },
    },
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ message: '注册成功', user: data.user });
});

// ─── POST /auth/login ────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '邮箱和密码不能为空' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return res.status(401).json({ error: error.message });
  return res.json({
    token: data.session?.access_token,
    user: {
      id: data.user?.id,
      email: data.user?.email,
      username: data.user?.user_metadata?.username,
    },
  });
});

// ─── POST /auth/change-username ───────────────────────────────────────────────
router.post('/change-username', async (req: Request, res: Response) => {
  const { username } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader) return res.status(401).json({ error: '未授权' });
  if (!username || username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: '用户名长度须为 2-20 个字符' });
  }

  const token = authHeader.replace('Bearer ', '');
  const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await userClient.auth.updateUser({
    data: { username },
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ message: '用户名修改成功', username: data.user?.user_metadata?.username });
});

// ─── POST /auth/change-password ──────────────────────────────────────────────
router.post('/change-password', async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader) return res.status(401).json({ error: '未授权' });
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: '新密码至少需要 8 位字符' });
  }

  const token = authHeader.replace('Bearer ', '');
  const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // 先用旧密码验证身份
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return res.status(401).json({ error: '用户未登录' });

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: userData.user.email!,
    password: oldPassword,
  });
  if (verifyError) return res.status(400).json({ error: '旧密码不正确' });

  // 更新密码
  const { error } = await userClient.auth.updateUser({ password: newPassword });
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ message: '密码修改成功' });
});

// ─── POST /auth/logout ───────────────────────────────────────────────────────
router.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: '未授权' });

  const token = authHeader.replace('Bearer ', '');
  const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { error } = await userClient.auth.signOut();
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ message: '已退出登录' });
});

export default router;
