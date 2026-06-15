import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../lib/api';
import { getClearedAt, setClearedAt } from '../../lib/storage';
import type {
  AssistantChatMessage,
  BillCardStatus,
  BillDraft,
  ChatMessage,
  UserChatMessage,
} from '../../lib/types';
import { ChatBubble } from '../components/chat-bubble';
import { BillPreviewCard } from '../components/bill-preview-card';
import { BillEditModal } from '../components/bill-edit-modal';
import { ConfirmDialog } from '../components/confirm-dialog';

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // bill 卡片状态：messageId → 'pending' | 'confirmed' | 'cancelled'
  const [billStatus, setBillStatus] = useState<Record<string, BillCardStatus>>({});

  // 当前正在编辑的草稿（chat 页只用 draft-only 模式：保存时不落库，仅更新卡片显示）
  const [editing, setEditing] = useState<{ messageId: string; draft: BillDraft } | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);

  const loadMessages = useCallback(async (after?: string) => {
    setLoading(true);
    setError(null);
    try {
      const clearedAt = after ?? await getClearedAt();
      const rows = await api.listMessages(clearedAt ?? undefined);
      setMessages(rows);
      // 初始化 statusMap：直接读后端返回的 content.billStatus（后端 GET 时已处理超时）
      const statusMap: Record<string, BillCardStatus> = {};
      for (const m of rows) {
        if (m.role === 'assistant' && m.content.intent === 'bill') {
          statusMap[m.id] = m.content.billStatus;
        }
      }
      setBillStatus(statusMap);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // 新消息后滚到底
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages.length, sending]);

  // 超时自动取消：每条 pending 卡片根据 generatedAt 绝对计时，到点调 cancel API
  // 后端 GET 时已做兜底（刷新页面会拿到 cancelled），这里负责"会话内实时取消"
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cancelNow = async (msgId: string) => {
      try {
        const updated = await api.cancelBillMessage(msgId);
        setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
        setBillStatus((prev) => ({ ...prev, [msgId]: 'cancelled' }));
      } catch {
        // 静默失败：后端 GET 兜底，下次进入页面会重新检测
      }
    };
    for (const m of messages) {
      if (m.role !== 'assistant' || m.content.intent !== 'bill') continue;
      const status = billStatus[m.id] ?? m.content.billStatus;
      if (status !== 'pending') continue;
      const generatedAt = m.content.generatedAt;
      if (!generatedAt) continue;
      const remaining = 60_000 - (Date.now() - new Date(generatedAt).getTime());
      if (remaining <= 0) {
        cancelNow(m.id);
      } else {
        timers.push(setTimeout(() => cancelNow(m.id), remaining));
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [messages, billStatus]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    Keyboard.dismiss();
    setInput('');
    setSending(true);
    setError(null);

    // 乐观插入用户气泡
    const tempUser: UserChatMessage = {
      id: `temp-${Date.now()}`,
      userId: '',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUser]);

    try {
      const assistantMsg = await api.sendMessage(text);
      setMessages((prev) => [...prev, assistantMsg]);
      if (assistantMsg.content.intent === 'bill') {
        setBillStatus((prev) => ({ ...prev, [assistantMsg.id]: 'pending' }));
      }
    } catch (e) {
      const errorMsg: AssistantChatMessage = {
        id: `err-${Date.now()}`,
        userId: '',
        role: 'assistant',
        createdAt: new Date().toISOString(),
        content: { intent: 'chat', reply: `出错了：${(e as Error).message}` },
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  }

  async function handleConfirmBill(msgId: string, draft: BillDraft) {
    try {
      // 后端事务：落库 bills + 改 chat_message 状态为 confirmed + 更新 content.bill
      const updated = await api.confirmBillMessage(msgId, draft);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
      setBillStatus((prev) => ({ ...prev, [msgId]: 'confirmed' }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleCancelBill(msgId: string) {
    try {
      const updated = await api.cancelBillMessage(msgId);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
      setBillStatus((prev) => ({ ...prev, [msgId]: 'cancelled' }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // chat 页只用 draft-only 模式：保存时不调 bills API，由父组件调 PUT /chat/messages/:id/draft
  function handleEditBill(messageId: string, draft: BillDraft) {
    setEditing({ messageId, draft });
    setEditModalVisible(true);
  }

  async function handleClearConfirm() {
    const now = new Date().toISOString();
    await setClearedAt(now);
    setClearDialogOpen(false);
    await loadMessages(now);
  }

  function renderMessage({ item }: { item: ChatMessage }) {
    if (item.role === 'user') {
      return <ChatBubble role="user" text={item.content} />;
    }
    const payload = item.content;
    if (payload.intent === 'bill') {
      return (
        <BillPreviewCard
          draft={payload.bill}
          status={billStatus[item.id] ?? payload.billStatus}
          onConfirm={() => handleConfirmBill(item.id, payload.bill)}
          onEdit={() => handleEditBill(item.id, payload.bill)}
          onCancel={() => handleCancelBill(item.id)}
        />
      );
    }
    return <ChatBubble role="assistant" text={payload.reply} />;
  }

  // 强制选择：有 pending 卡片时禁用输入框和发送按钮
  const hasPendingBill = messages.some((m) => {
    if (m.role !== 'assistant' || m.content.intent !== 'bill') return false;
    return (billStatus[m.id] ?? m.content.billStatus) === 'pending';
  });

  const canSend = input.trim().length > 0 && !sending && !hasPendingBill;

  return (
    // [避让调整] SafeAreaView edges: ['top'] → ['top', 'bottom']
    // 原因：iOS 上 react-native-screens 的原生 Tabs.Screen 会把 Tab Bar 高度
    //       注入到 additionalSafeAreaInsets.bottom。
    //       之前用 ['top'] 故意排除了 bottom edge，导致这个自动避让失效，
    //       输入框直接画到 Tab Bar 后面（"完全被 3 个 tab 标签挡住"）。
    //       改回 ['top', 'bottom'] 后，SafeArea 会自动在底部应用：
    //         Tab Bar 高度(~49pt) + home indicator inset(~34pt) ≈ 83pt
    //       输入框自然就被推到 Tab Bar 之上。
    //       Android 上原生 Tab Bar 行为类似，inset 也会被正确处理。
    <SafeAreaView className="flex-1 bg-bgsoft" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="bg-white px-5 py-3 flex-row justify-between items-center border-b border-slate-100">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center mr-2">
            <Text className="text-base">🤖</Text>
          </View>
          <Text className="font-bold text-slate-800">AI 记账助手</Text>
        </View>
        <Pressable
          onPress={() => setClearDialogOpen(true)}
          className="flex-row items-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-slate-400 mr-1">🗑️</Text>
          <Text className="text-slate-500 text-xs font-medium">清除对话</Text>
        </Pressable>
      </View>

      {error && (
        <View className="bg-rose-50 px-4 py-2">
          <Text className="text-rose-500 text-xs text-center">{error}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            // [尺寸调整] paddingBottom: 120 → 96
            // 这个值只负责"消息列表底部留白"，确保最后一条消息能滚到输入框上方可见。
            // 与 SafeArea 的 bottom 避让是独立的（外层 SafeAreaView 已处理 Tab Bar 高度）。
            // 当前 96 ≈ 输入框胶囊(~44) + 外层 pt-2/pb-3(~20) + 三点动画区(~40, sending 时)。
            contentContainerStyle={{ padding: 20, paddingBottom: 96 }}
            // [间距调整] 气泡之间的间距 h-5(20px) 保持不变
            // 原型 chat.html:65 用 space-y-5(20px)，与之一致。
            // 不改这个值，"拥挤感"主要来自输入区背景过重而非气泡间距。
            ItemSeparatorComponent={() => <View className="h-5" />}
            ListEmptyComponent={
              <View className="items-center py-16">
                <Text className="text-slate-400 text-sm">你好！直接告诉我你花了什么钱吧~</Text>
              </View>
            }
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
          />
        )}

        {sending && (
          // [位置调整] 三点输入动画容器 padding: pb-2 → pb-3
          // 原因：和下方输入框之间多留 4px 呼吸感，避免动画气泡紧贴输入框上沿。
          <View className="px-5 pb-3">
            <TypingIndicator />
          </View>
        )}

        {/* ============== 输入区 ============== */}
        {/*
          [背景调整] 外层容器：
          - 旧：bg-white border-t border-slate-100（纯白底 + 顶部硬分隔线）
          - 新：完全透明，无 border-t
          - 对齐原型 chat.html:140-141 的 absolute + bg-gradient-to-t from-slate-50 via-slate-50 to-transparent。
            原型里输入框是"悬浮"在聊天背景上的，没有任何分隔线，所以视觉上更轻。
            RN 这里没法做真正的渐变 mask（除非引入额外库），所以直接透明 + 让 bg-bgsoft 透上来，
            效果接近原型的"融入背景"。
        */}
        {/*
          [位置调整] 外层 padding：
          - 旧：px-4 py-2（左右 16，上下 8）
          - 新：px-4 pt-2 pb-3（左右 16，上 8，下 12）
          - 原因：外层 SafeAreaView 已通过 edges={['top','bottom']} 把输入区整体上抬到 Tab Bar 之上，
            这里 pb-3 只是"输入框胶囊和 Tab Bar 之间的视觉呼吸感"(12px)，不再承担避让职责。
            pt-2 是输入框和上方三点动画/聊天区之间的间距(8px)。
        */}
        <View className="px-4 pt-2 pb-3">
          {/*
            [尺寸方案] 输入框胶囊 - 第 3 版，彻底重写：
            - 第 1 版：pl-3 pr-1.5 py-1（不对称 padding）
            - 第 2 版：px-2 py-1.5（对称，对齐原型）
            - 第 3 版（失败）：px-2 py-2.5（加大 padding）→ 反而"遮挡更多 + 输入后突然下沉"
            - 当前版：固定高度 h-11(44px) + items-center
            ==================== 根因分析 ====================
            iOS 的 RN TextInput 单行模式下，文字垂直位置由两个因素决定：
              1. 父容器 items-center 决定 TextInput 整体在胶囊内的垂直位置
              2. TextInput 自身的内容高度（受文字 lineHeight 影响）
            当用 py-X 控制 capsule 高度时，TextInput 自身没有显式 height，
              它会随"有文字/无文字"重新计算 layout，
              导致 placeholder 与实际文字的垂直位置不一致 → "输入后突然下沉"
            加大 py 会让问题更严重：胶囊变高，但 TextInput 渲染区域没变大，
              文字被挤压到胶囊底部 → "遮挡更多"
            ==================== 修复 ====================
            改用 h-11(44px) 固定胶囊高度，去掉 py：
              - 胶囊高度恒定 = 44px（符合 iOS HIG 44pt 最小可点击区域）
              - items-center 让 TextInput 和发送按钮在固定高度内垂直居中
              - TextInput 不再需要随内容重新计算高度，输入前后位置稳定
            px-2 保留：胶囊左右内边距（避让圆角）。
            发送按钮 w-8 h-8 不变（对齐原型 chat.html:149-152）。
          */}
          <View className="flex-row items-center bg-white border border-slate-200 rounded-full px-2 h-11 shadow-sm">
            {/*
              [尺寸调整] TextInput 横向 padding：
              - 旧：无 padding（紧贴胶囊左边缘）
              - 新：px-2（左右 8）
              - 原因：文字和胶囊左边缘留出 8px 间距，输入光标不会贴着圆角。
            */}
            {/*
              [尺寸稳定] TextInput 固定高度 h-8(32px)：
              - 不加显式 height 时，TextInput 高度随内容（placeholder vs 实际文字）变化，
                items-center 重新布局后会"输入瞬间突然下沉"。
              - 加 h-8 后，TextInput 渲染区域恒定 32px（与发送按钮等高），
                在 h-11(44px) 胶囊内靠 items-center 垂直居中，上下各留 6px 空白，
                输入前后位置完全稳定。
              - px-2：TextInput 内部左右 padding 8px，避让胶囊圆角，避免光标贴边。
            */}
            <TextInput
              value={input}
              onChangeText={setInput}
              editable={!hasPendingBill}
              placeholder={hasPendingBill ? '请先处理上方的账单卡片' : '输入消费内容或提问（如：吃饭50）...'}
              placeholderTextColor="#94a3b8"
              className="flex-1 h-8 text-sm text-slate-700 px-2"
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            {/*
              [尺寸保持] 发送按钮 w-8 h-8(32x32) 不变
              对齐原型 chat.html:149-152 的 w-8 h-8。
              bg-primary（可发送）/ bg-slate-200（禁用）的色彩规则也不变。
              hasPendingBill 时强制禁用（强制选择策略）。
            */}
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              className={`w-8 h-8 rounded-full items-center justify-center ${canSend ? 'bg-primary' : 'bg-slate-200'}`}
            >
              <Text className={`text-sm font-bold ${canSend ? 'text-white' : 'text-slate-400'}`}>↑</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={clearDialogOpen}
        title="确认清除聊天显示？"
        message="数据不会被删除，只清理聊天页面"
        onConfirm={handleClearConfirm}
        onCancel={() => setClearDialogOpen(false)}
      />

      <BillEditModal
        visible={editModalVisible}
        bill={null}
        draft={editing?.draft}
        mode="draft-only"
        onClose={() => {
          setEditModalVisible(false);
          setEditing(null);
        }}
        onSaved={(updatedDraft) => {
          // draft-only 模式：拿到修改后的 draft，调 PUT /chat/messages/:id/draft 持久化
          // 状态保持 pending，等用户继续选 [确认入账] 或 [取消]
          if (editing && updatedDraft) {
            api.updateBillDraft(editing.messageId, updatedDraft)
              .then((updated) => {
                setMessages((prev) => prev.map((m) => (m.id === editing.messageId ? updated : m)));
              })
              .catch((e) => setError((e as Error).message));
          }
          setEditing(null);
        }}
      />
    </SafeAreaView>
  );
}

// 三点 bounce 加载动画（对齐 prototypes/chat.html:95-102）
function TypingIndicator() {
  return (
    <View className="flex-row justify-start">
      <View className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <View className="flex-row items-center">
          <AnimatedDot delay={0} />
          <AnimatedDot delay={150} />
          <AnimatedDot delay={300} />
        </View>
      </View>
    </View>
  );
}

function AnimatedDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, delay]);

  return (
    <Animated.View
      style={{ opacity }}
      className="w-1.5 h-1.5 bg-slate-400 rounded-full mx-0.5"
    />
  );
}
