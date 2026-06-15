import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { api } from '../../lib/api';
import type { Bill, BillType, Category, BillDraft } from '../../lib/types';
import { CategoryGridPicker } from './category-grid-picker';

interface Props {
  visible: boolean;
  bill: Bill | null;
  defaultDate?: Date;       // 新建模式下的默认日期
  draft?: Partial<BillDraft>; // AI 账单预填（仅 bill=null 的"新建"或"draft-only"模式下生效）
  // 模式：
  //   'create'     - 新建账单，POST /bills 落库（HomeScreen 默认）
  //   'edit'       - 编辑已有账单，PUT /bills/:id（HomeScreen 编辑按钮）
  //   'draft-only' - 仅更新 AI 卡片草稿，不落库，通过 onSaved(draft) 回调返回（chat 页用）
  mode?: 'create' | 'edit' | 'draft-only';
  onClose: () => void;
  onSaved?: (updatedDraft?: BillDraft) => void;  // 模式不同语义不同，见 handleSave
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatChineseDate(d: Date): string {
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`;
}

export function BillEditModal({ visible, bill, defaultDate, draft, mode = 'create', onClose, onSaved }: Props) {
  // isEdit 决定"是否走 PUT /bills/:id 编辑路径"（POST /bills 新建 vs PUT /bills/:id 更新）
  // mode='draft-only' 时即使 bill=null 也不是 create（不会 POST /bills），单独走第三条路径
  const isEdit = bill !== null;

  const [type, setType] = useState<BillType>('expense');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(defaultDate ?? new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);

  // 打开时同步初始数据
  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (bill) {
      setType(bill.type);
      setAmount(Number(bill.amount).toString());
      setName(bill.name);
      setCategoryId(bill.categoryId);
      setDate(new Date(bill.date + 'T00:00:00'));
    } else {
      // 新建模式：优先用 draft（AI 账单预填），否则用默认值
      setType(draft?.type ?? 'expense');
      setAmount(draft?.amount != null ? String(draft.amount) : '');
      setName(draft?.name ?? '');
      setCategoryId(draft?.categoryId ?? null);
      setDate(draft?.date ? new Date(draft.date + 'T00:00:00') : (defaultDate ?? new Date()));
    }
  }, [visible, bill, defaultDate, draft]);

  // 按 type 拉取分类
  useEffect(() => {
    if (!visible) return;
    setCatsLoading(true);
    api.listCategories(type)
      .then(setCategories)
      .catch((e) => setError(e.message))
      .finally(() => setCatsLoading(false));
  }, [visible, type]);

  const canSave = useMemo(() => {
    const amt = Number(amount);
    return !!name.trim() && !!categoryId && Number.isFinite(amt) && amt > 0;
  }, [amount, name, categoryId]);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        type,
        categoryId: categoryId!,
        name: name.trim(),
        amount: Number(amount),
        date: toIsoDate(date),
      };

      // ─── 模式分支 ───────────────────────────────────────────────────────
      if (mode === 'draft-only') {
        // chat 页"修改"流程：不调 API，构造 BillDraft 后通过 onSaved 回调返回给父组件
        // 父组件负责调 PUT /chat/messages/:id/draft 持久化 + 更新 messages state
        // categoryName 从当前 categories 数组反查（用户切换 type 后 categories 已刷新）
        const selectedCat = categories.find((c) => c.id === categoryId);
        const updatedDraft: BillDraft = {
          type,
          categoryId: payload.categoryId,
          categoryName: selectedCat?.name ?? draft?.categoryName ?? '',
          name: payload.name,
          amount: payload.amount,
          date: payload.date,
        };
        onSaved?.(updatedDraft);
        onClose();
        return;
      }

      // create / edit 模式：调 bills 接口（HomeScreen 用）
      if (isEdit && bill) {
        await api.updateBill(bill.id, payload);
      } else {
        await api.createBill(payload);
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handlePickerChange(_e: DateTimePickerEvent, d?: Date) {
    setShowDatePicker(false);
    if (d) setDate(d);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-3xl h-[85%] shadow-2xl">
            {/* Header */}
            <View className="px-5 py-4 flex-row justify-between items-center border-b border-slate-100">
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text className="text-slate-400 text-xl">✕</Text>
              </TouchableOpacity>
              <Text className="font-bold text-slate-800 text-lg">
                {mode === 'draft-only' ? '修改账单' : isEdit ? '编辑账单' : '新增账单'}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={!canSave || saving} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text className={`font-medium ${canSave && !saving ? 'text-primary' : 'text-slate-300'}`}>
                  {saving ? '保存中' : '保存'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-5 py-6" keyboardShouldPersistTaps="handled">
              {/* Type Toggle */}
              <View className="flex-row bg-slate-100 rounded-xl p-1 mb-6">
                {(['expense', 'income'] as BillType[]).map((t) => {
                  const active = type === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => { setType(t); setCategoryId(null); }}
                      // shadow-* 类必须从首次渲染就存在（无论 active 与否）：
                      // 否则打开收入账单时 useEffect 把 type 从默认 'expense' 改为 'income'，
                      // 触发收入按钮从 '' → 'bg-white shadow-sm'，新增 --tw-shadow-* CSS 变量，
                      // NativeWind 的 variables SHOULD_UPGRADE 警告路径会 stringify(originalProps)，
                      // 递归到 NavigationStateContext 默认值的 getKey 抛出型 getter 直接崩溃。
                      // inactive 用 shadow-none 保持视觉与原 '' 一致（无可见阴影）。
                      className={`flex-1 py-2 rounded-lg ${active ? 'bg-white shadow-sm' : 'shadow-none'}`}
                    >
                      <Text className={`text-center font-medium text-sm ${active ? 'text-slate-800' : 'text-slate-500'}`}>
                        {t === 'expense' ? '支出' : '收入'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Amount */}
              <Field label="金额">
                <View className="flex-row items-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <Text className="text-xl mr-2 text-slate-400 font-medium">¥</Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    className="flex-1 text-2xl font-bold text-slate-800"
                  />
                </View>
              </Field>

              {/* Title */}
              <Field label="标题">
                <View className="flex-row items-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="输入账单标题"
                    placeholderTextColor="#94a3b8"
                    className="flex-1 font-medium text-slate-800"
                  />
                </View>
              </Field>

              {/* Category Grid */}
              <Field label="分类">
                {catsLoading ? (
                  <ActivityIndicator />
                ) : (
                  <CategoryGridPicker
                    categories={categories}
                    selectedId={categoryId}
                    onSelect={setCategoryId}
                  />
                )}
              </Field>

              {/* Date */}
              <Field label="日期">
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className="flex-row items-center justify-between bg-slate-50 rounded-2xl p-4 border border-slate-100"
                >
                  <Text className="font-medium text-slate-800">{formatChineseDate(date)}</Text>
                  <Text className="text-slate-400">📅</Text>
                </TouchableOpacity>
              </Field>

              {error && (
                <Text className="text-rose-500 text-sm text-center mt-4">{error}</Text>
              )}
            </ScrollView>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handlePickerChange}
                maximumDate={new Date()}
              />
            )}
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-slate-500 text-xs mb-2 ml-1">{label}</Text>
      {children}
    </View>
  );
}
