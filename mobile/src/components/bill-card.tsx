import { Pressable, Text, TouchableOpacity, View } from 'react-native';

import { getCategoryVisual } from '@/constants/category-icons';
import type { Bill } from '../../lib/types';

interface Props {
  bill: Bill;
  categoryName?: string;
  onEdit: () => void;
  onDelete: () => void;
}

function yuan(amount: string, type: 'expense' | 'income'): string {
  const sign = type === 'expense' ? '-' : '+';
  return `${sign}¥${Number(amount).toFixed(2)}`;
}

export function BillCard({ bill, categoryName, onEdit, onDelete }: Props) {
  const visual = getCategoryVisual(categoryName ?? '');
  const amountColor = bill.type === 'expense' ? 'text-expense' : 'text-income';

  return (
    <Pressable
      onPress={onEdit}
      className="bg-white p-4 rounded-2xl border border-slate-100 flex-row items-center justify-between shadow-sm active:bg-slate-50"
    >
      <View className="flex-row items-center flex-1">
        <View className={`w-10 h-10 rounded-full items-center justify-center ${visual.bgClass}`}>
          <Text className="text-base">{visual.emoji}</Text>
        </View>
        <Text className="ml-3 font-medium text-slate-800">{bill.name}</Text>
      </View>
      <View className="flex-row items-center">
        <Text className={`font-semibold ${amountColor}`}>{yuan(bill.amount, bill.type)}</Text>
        <TouchableOpacity
          onPress={onEdit}
          className="w-6 h-6 rounded-full bg-slate-100 items-center justify-center ml-3"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-slate-400 text-[10px]">✎</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          className="w-6 h-6 rounded-full bg-slate-100 items-center justify-center ml-2"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-slate-400 text-[10px]">✕</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}
