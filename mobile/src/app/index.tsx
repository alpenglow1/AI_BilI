import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { api } from '../../lib/api';
import type { Bill, Category } from '../../lib/types';
import { BillCard } from '@/components/bill-card';
import { BillEditModal } from '@/components/bill-edit-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DateNavigator } from '@/components/date-navigator';
import { SummaryBar } from '@/components/summary-bar';
import { useAuthStore } from '@/store/auth-store';

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const [date, setDate] = useState<Date>(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState(false);

  const dateStr = toIsoDate(date);

  const loadBills = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await api.listBills(dateStr);
      setBills(rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, dateStr]);

  // 切回明细 tab 时重新拉取（chat 页确认入账后切回来才能看到新账单）
  // 注意：useFocusEffect 不能直接传 async 函数，要包一层同步 wrapper
  useFocusEffect(
    useCallback(() => {
      loadBills();
    }, [loadBills]),
  );

  // 预加载分类映射（用于 BillCard 显示分类名 / emoji）
  useEffect(() => {
    if (!user) return;
    Promise.all([api.listCategories('expense'), api.listCategories('income')])
      .then(([exp, inc]) => {
        const map: Record<string, Category> = {};
        [...exp, ...inc].forEach((c) => (map[c.id] = c));
        setCategoryMap(map);
      })
      .catch(() => {});
  }, [user]);

  const { expense, income } = useMemo(() => {
    let e = 0;
    let i = 0;
    for (const b of bills) {
      const amt = Number(b.amount);
      if (b.type === 'expense') e += amt;
      else i += amt;
    }
    return { expense: e, income: i };
  }, [bills]);

  function openEdit(bill: Bill) {
    setEditingBill(bill);
    setModalVisible(true);
  }

  function closeEdit() {
    setModalVisible(false);
    setEditingBill(null);
  }

  async function confirmDeleteBill() {
    if (!deletingBill) return;
    setDeleting(true);
    try {
      await api.deleteBill(deletingBill.id);
      setDeletingBill(null);
      await loadBills();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-bgsoft" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-slate-500">请先在「我」页面登录</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bgsoft" edges={['top']}>
      <View className="bg-primary">
        <DateNavigator
          date={date}
          onChange={setDate}
          pickerOpen={pickerOpen}
          setPickerOpen={setPickerOpen}
        />
        <View className="pb-4">
          <SummaryBar expense={expense} income={income} />
        </View>
      </View>

      <View className="flex-row justify-between items-center px-5 pt-4 pb-2">
        <Text className="font-semibold text-slate-700">{isToday(date) ? '今日明细' : '当日明细'}</Text>
        <Text className="text-xs text-slate-400">共 {bills.length} 笔</Text>
      </View>

      {loading && bills.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-rose-500 text-center">{error}</Text>
          <Pressable onPress={loadBills} className="mt-3">
            <Text className="text-primary">重试</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => (
            <BillCard
              bill={item}
              categoryName={categoryMap[item.categoryId]?.name}
              onEdit={() => openEdit(item)}
              onDelete={() => setDeletingBill(item)}
            />
          )}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-slate-400">这一天没有记录</Text>
            </View>
          }
          ListFooterComponent={
            bills.length > 0 ? (
              <Text className="text-center text-xs text-slate-400 pt-4 pb-2">没有更多记录了</Text>
            ) : null
          }
        />
      )}

      <BillEditModal
        visible={modalVisible}
        bill={editingBill}
        defaultDate={date}
        onClose={closeEdit}
        onSaved={loadBills}
      />

      <ConfirmDialog
        visible={deletingBill !== null}
        title="确认删除账单？"
        message="删除后无法恢复"
        confirmText={deleting ? '删除中' : '删除'}
        danger
        onConfirm={confirmDeleteBill}
        onCancel={() => setDeletingBill(null)}
      />
    </SafeAreaView>
  );
}

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
