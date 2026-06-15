import { Pressable, Text, View } from 'react-native';
import { getCategoryVisual } from '../constants/category-icons';
import type { BillCardStatus, BillDraft } from '../../lib/types';

interface Props {
  draft: BillDraft;
  status: BillCardStatus;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

// 对齐 docs/prototypes/chat.html:104-135 的账单预览卡片样式
export function BillPreviewCard({ draft, status, onConfirm, onEdit, onCancel }: Props) {
  const visual = getCategoryVisual(draft.categoryName);
  const isExpense = draft.type === 'expense';
  const sign = isExpense ? '-' : '+';
  const amountText = `${sign}¥${Number(draft.amount).toFixed(2)}`;
  const amountClass = isExpense ? 'text-expense' : 'text-income';

  return (
    <View className="flex-row justify-start">
      <View className="w-[85%] max-w-[280px]">
        <View className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm p-4 shadow-sm relative overflow-hidden">
          {/* 左侧 primary 竖条 */}
          <View className="absolute top-0 left-0 w-1 h-full bg-primary" />

          {/*
            卡片内容布局：单行 [图标 + 标题 + 金额靠右]
            对齐需求文档 5.4 的卡片规范图。
            - flex-row items-center：水平排列 + 垂直居中
            - 标题 flex-1：占据中间，把金额推到右侧
            - 金额 ml-2 text-xl：字号大于标题，保留视觉焦点
          */}
          <View className="flex-row items-center">
            <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${visual.bgClass}`}>
              <Text className="text-base">{visual.emoji}</Text>
            </View>
            <Text className="font-semibold text-slate-800 text-sm flex-1" numberOfLines={1}>
              {draft.name}
            </Text>
            <Text className={`text-xl font-bold ml-2 ${amountClass}`}>{amountText}</Text>
          </View>
        </View>

        {/*
          卡片下方操作区：三态渲染
          - pending: 三个按钮 [确认入账] [修改] [取消]
          - confirmed: "✅ 已入账" 文字
          - cancelled: "❌ 已取消" 文字（灰色，弱化）
        */}
        {status === 'pending' ? (
          <View className="flex-row mt-2 ml-1">
            <Pressable
              onPress={onConfirm}
              className="flex-1 bg-primary py-2 rounded-xl items-center mr-1.5 active:opacity-80"
            >
              <Text className="text-white text-xs font-medium">✅ 确认</Text>
            </Pressable>
            <Pressable
              onPress={onEdit}
              className="flex-1 bg-white border border-slate-200 py-2 rounded-xl items-center mr-1.5 active:bg-slate-50"
            >
              <Text className="text-slate-600 text-xs font-medium">✏️ 修改</Text>
            </Pressable>
            <Pressable
              onPress={onCancel}
              className="flex-1 bg-white border border-slate-200 py-2 rounded-xl items-center active:bg-slate-50"
            >
              <Text className="text-slate-500 text-xs font-medium">✕ 取消</Text>
            </Pressable>
          </View>
        ) : status === 'confirmed' ? (
          <View className="mt-2 ml-1 py-2 items-center">
            <Text className="text-emerald-500 text-xs font-medium">✅ 已入账</Text>
          </View>
        ) : (
          <View className="mt-2 ml-1 py-2 items-center">
            <Text className="text-slate-400 text-xs font-medium">✕ 已取消</Text>
          </View>
        )}
      </View>
    </View>
  );
}
