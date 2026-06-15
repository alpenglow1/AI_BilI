import { Text, View } from 'react-native';

interface Props {
  expense: number;
  income: number;
}

function yuan(n: number): string {
  return `¥${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function SummaryBar({ expense, income }: Props) {
  const balance = income - expense;
  return (
    <View className="flex-row justify-between items-center px-2">
      <Stat label="支出" value={yuan(expense)} valueClass="text-white" />
      <Divider />
      <Stat label="收入" value={yuan(income)} valueClass="text-white" />
      <Divider />
      <Stat
        label="结余"
        value={yuan(balance)}
        valueClass={balance >= 0 ? 'text-emerald-300' : 'text-rose-300'}
      />
    </View>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <View className="items-center flex-1">
      <Text className="text-white/70 text-xs mb-1">{label}</Text>
      <Text className={`text-lg font-semibold ${valueClass}`}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View className="w-px h-8 bg-white/20" />;
}
