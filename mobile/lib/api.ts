import { useAuthStore } from '../src/store/auth-store';
import type { Bill, BillDraft, BillInput, BillPatch, Category, BillType, ChatMessage, AssistantChatMessage } from './types';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:3000';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) throw new Error('未登录');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': userId,
    ...(init.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = (data && typeof data === 'object' && 'error' in data)
      ? String((data as { error: unknown }).error)
      : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export const api = {
  listCategories(type?: BillType): Promise<Category[]> {
    const q = type ? `?type=${type}` : '';
    return request<Category[]>(`/categories${q}`);
  },

  listBills(date: string): Promise<Bill[]> {
    return request<Bill[]>(`/bills?date=${encodeURIComponent(date)}`);
  },

  createBill(input: BillInput): Promise<Bill> {
    return request<Bill>('/bills', { method: 'POST', body: JSON.stringify(input) });
  },

  updateBill(id: string, patch: BillPatch): Promise<Bill> {
    return request<Bill>(`/bills/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
  },

  deleteBill(id: string): Promise<{ message: string; id: string }> {
    return request(`/bills/${id}`, { method: 'DELETE' });
  },

  listMessages(after?: string): Promise<ChatMessage[]> {
    const q = after ? `?after=${encodeURIComponent(after)}` : '';
    return request<ChatMessage[]>(`/chat/messages${q}`);
  },

  sendMessage(content: string): Promise<AssistantChatMessage> {
    return request<AssistantChatMessage>('/chat/send', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // ─── 卡片状态机：确认入账 / 取消 / 更新草稿 ─────────────────────────────────
  // 后端事务：落库到 bills + 改 chat_message 状态为 confirmed
  confirmBillMessage(messageId: string, bill?: BillDraft): Promise<AssistantChatMessage> {
    return request<AssistantChatMessage>(`/chat/messages/${messageId}/confirm`, {
      method: 'POST',
      body: JSON.stringify(bill ? { bill } : {}),
    });
  },

  // 后端：改 chat_message 状态为 cancelled（不落库）
  cancelBillMessage(messageId: string): Promise<AssistantChatMessage> {
    return request<AssistantChatMessage>(`/chat/messages/${messageId}/cancel`, {
      method: 'POST',
    });
  },

  // 后端：更新 content.bill（修改后的草稿），状态保持 pending
  updateBillDraft(messageId: string, bill: BillDraft): Promise<AssistantChatMessage> {
    return request<AssistantChatMessage>(`/chat/messages/${messageId}/draft`, {
      method: 'PUT',
      body: JSON.stringify({ bill }),
    });
  },
};
