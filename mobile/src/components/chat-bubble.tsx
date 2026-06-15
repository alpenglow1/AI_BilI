import { Text, View } from 'react-native';

interface Props {
  role: 'user' | 'assistant';
  text: string;
}

// 对齐 docs/prototypes/chat.html:73-85 的气泡样式
export function ChatBubble({ role, text }: Props) {
  if (role === 'user') {
    return (
      <View className="flex-row justify-end">
        <View className="bg-primary rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[75%] shadow-sm">
          <Text className="text-white text-sm">{text}</Text>
        </View>
      </View>
    );
  }
  return (
    <View className="flex-row justify-start">
      <View className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[75%] shadow-sm">
        <Text className="text-slate-700 text-sm">{text}</Text>
      </View>
    </View>
  );
}
