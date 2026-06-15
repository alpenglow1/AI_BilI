import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  date: Date;
  onChange: (d: Date) => void;
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatChinese(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function DateNavigator({ date, onChange, pickerOpen, setPickerOpen }: Props) {
  const [viewYear, setViewYear] = useState(date.getFullYear());
  const [viewMonth, setViewMonth] = useState(date.getMonth());

  useEffect(() => {
    if (pickerOpen) {
      setViewYear(date.getFullYear());
      setViewMonth(date.getMonth());
    }
  }, [pickerOpen, date]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const shift = (days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    onChange(next);
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const canGoNextMonth = new Date(viewYear, viewMonth + 1, 1) <= today;
  const goNextMonth = () => {
    if (!canGoNextMonth) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const pick = (d: Date) => {
    onChange(d);
    setPickerOpen(false);
  };

  // 构建 6×7 日期网格（当月 + 上下月填充）
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const cells: Date[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push(new Date(viewYear, viewMonth - 1, daysInPrevMonth - i));
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
  let nextDay = 1;
  while (cells.length < 42) cells.push(new Date(viewYear, viewMonth + 1, nextDay++));

  const arrowBtn = 'w-8 h-8 rounded-full bg-white/20 items-center justify-center';

  return (
    <View className="bg-primary px-5 pt-6 pb-4 rounded-b-3xl">
      <View className="flex-row justify-between items-center">
        <TouchableOpacity onPress={() => shift(-1)} className={arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-white text-sm font-bold">‹</Text>
        </TouchableOpacity>

        <Pressable onPress={() => setPickerOpen(true)} className="flex-row items-center">
          <Text className="text-white text-lg font-medium mr-2">{formatChinese(date)}</Text>
          <Text className="text-white/70 text-xs">▼</Text>
        </Pressable>

        <TouchableOpacity onPress={() => shift(1)} className={arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-white text-sm font-bold">›</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable className="flex-1 bg-black/40 justify-center items-center px-6" onPress={() => setPickerOpen(false)}>
          <Pressable className="bg-white rounded-[32px] p-5 w-full" onPress={(e) => e.stopPropagation()}>
            <View className="flex-row justify-between items-center mb-4">
              <TouchableOpacity onPress={goPrevMonth} hitSlop={8} className="w-8 h-8 items-center justify-center">
                <Text className="text-slate-600 text-xl font-medium">‹</Text>
              </TouchableOpacity>
              <Text className="font-bold text-slate-800 text-lg">{viewYear}年{viewMonth + 1}月</Text>
              <TouchableOpacity onPress={goNextMonth} disabled={!canGoNextMonth} hitSlop={8} className="w-8 h-8 items-center justify-center">
                <Text className={`text-xl font-medium ${canGoNextMonth ? 'text-slate-600' : 'text-slate-200'}`}>›</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row mb-2">
              {WEEKDAYS.map((w) => (
                <View key={w} style={{ width: `${100 / 7}%` }} className="items-center">
                  <Text className="text-slate-400 text-xs font-medium">{w}</Text>
                </View>
              ))}
            </View>

            <View className="flex-row flex-wrap">
              {cells.map((d, i) => {
                const isSelected = isSameDay(d, date);
                const isToday = isSameDay(d, today);
                const isFuture = d > today;
                const inCurrentMonth = d.getMonth() === viewMonth;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => pick(d)}
                    disabled={isFuture}
                    style={{ width: `${100 / 7}%`, aspectRatio: 1 }}
                    className="items-center justify-center"
                  >
                    <View className={`w-11 h-11 rounded-full items-center justify-center ${isSelected ? 'bg-primary' : ''}`}>
                      <Text className={`text-base ${
                        isSelected ? 'text-white font-bold'
                          : isFuture ? 'text-slate-200'
                          : !inCurrentMonth ? 'text-slate-300'
                          : isToday ? 'text-primary font-bold'
                          : 'text-slate-700'
                      }`}>
                        {d.getDate()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
