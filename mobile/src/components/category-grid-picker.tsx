import { Pressable, Text, View } from 'react-native';

import { getCategoryVisual } from '@/constants/category-icons';
import type { Category } from '../../lib/types';

interface Props {
  categories: Category[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}

export function CategoryGridPicker({ categories, selectedId, onSelect }: Props) {
  return (
    <View className="flex-row flex-wrap -mx-1.5">
      {categories.map((c) => {
        const v = getCategoryVisual(c.name);
        const active = c.id === selectedId;
        const bg = active ? v.selectedBgClass : v.bgClass;
        const txt = active ? v.selectedTextClass : v.textClass;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            className="w-1/4 px-1.5 mb-3 active:opacity-70"
          >
            <View className={`items-center justify-center py-3 rounded-2xl border border-transparent ${bg}`}>
              <Text className="text-2xl mb-1">{v.emoji}</Text>
              <Text className={`text-xs font-medium ${txt}`}>{c.name}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
