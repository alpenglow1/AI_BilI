export type BillType = 'expense' | 'income';

export interface Category {
  id: string;
  type: BillType;
  name: string;
  isDefault: boolean;
  userId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Bill {
  id: string;
  userId: string;
  type: BillType;
  categoryId: string;
  name: string;
  amount: string; // Drizzle decimal 列返回字符串
  date: string;   // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface BillInput {
  type: BillType;
  categoryId: string;
  name: string;
  amount: number | string;
  date: string;
}

export type BillPatch = Partial<BillInput>;

// ─── Chat 相关类型（阶段 3：AI 对话） ─────────────────────────────────────────
export type ChatRole = 'user' | 'assistant';

interface ChatMessageBase {
  id: string;
  userId: string;
  createdAt: string;
}

export interface UserChatMessage extends ChatMessageBase {
  role: 'user';
  content: string;
}

export interface BillDraft {
  type: BillType;
  categoryId: string;
  categoryName: string;
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD
}

// 卡片状态机：pending（待操作）/ confirmed（已入账）/ cancelled（已取消）
export type BillCardStatus = 'pending' | 'confirmed' | 'cancelled';

export type AssistantPayload =
  | {
      intent: 'bill';
      bill: BillDraft;
      billStatus: BillCardStatus;
      generatedAt: string; // ISO 时间戳，用于超时绝对计时
    }
  | { intent: 'query'; reply: string }
  | { intent: 'chat'; reply: string };

export interface AssistantChatMessage extends ChatMessageBase {
  role: 'assistant';
  content: AssistantPayload;
}

export type ChatMessage = UserChatMessage | AssistantChatMessage;
