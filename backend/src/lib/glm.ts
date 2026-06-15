import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.GLM_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4';
const API_KEY = process.env.GLM_API_KEY!;
const MODEL = process.env.MODEL;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionParams {
  messages: ChatMessage[];
  jsonMode?: boolean;
  temperature?: number;
}

export async function chatCompletion(params: ChatCompletionParams): Promise<string> {
  const maxAttempts = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await doChatCompletion(params);
    } catch (err: any) {
      lastErr = err;
      const is429 = typeof err?.message === 'string' && err.message.includes('GLM API 429');
      if (!is429 || attempt === maxAttempts) throw err;
      const wait = 2000 * Math.pow(2, attempt - 1);
      console.warn(`[GLM] 429 限速，${wait}ms 后重试（第 ${attempt}/${maxAttempts - 1} 次）`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

async function doChatCompletion({ messages, jsonMode, temperature }: ChatCompletionParams): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        ...(temperature !== undefined ? { temperature } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GLM API ${res.status}: ${text.slice(0, 500)}`);
    }

    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error(`GLM 返回结构异常: ${JSON.stringify(data).slice(0, 500)}`);
    }
    return content;
  } catch (err: any) {
    console.error('[GLM] fetch error:', {
      name: err?.name,
      message: err?.message,
      cause: err?.cause?.message ?? err?.cause,
    });
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
