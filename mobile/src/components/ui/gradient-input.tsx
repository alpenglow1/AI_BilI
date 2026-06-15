import { ReactNode, useState } from 'react';
import { TextInput, View } from 'react-native';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  // 左侧图标节点（推荐传 <FontAwesome6 /> 组件，对齐原型的 fontawesome 图标）
  leftIcon: ReactNode;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoComplete?: 'email' | 'password' | 'current-password' | 'new-password';
  autoCapitalize?: 'none' | 'sentences';
  // 右侧可选按钮（密码框的眼睛、清空按钮等）
  rightAccessory?: ReactNode;
}

// 对齐 login.html / register.html 输入框：
// - bg-white/80 border border-slate-200 → focus 时 border-primary + ring-primary/50
// - 左侧图标 + 右侧可选按钮（密码框的眼睛）
export function GradientInput({
  value,
  onChangeText,
  placeholder,
  leftIcon,
  secureTextEntry,
  keyboardType = 'default',
  autoComplete,
  autoCapitalize = 'none',
  rightAccessory,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      // className 静态：动态 className 会触发 NativeWind 重新生成 style，让 native 层 View 卸载重建，
      // 子节点 TextInput 失焦。focus 视觉走 style 覆盖。
      // style 始终是同一 object shape（值切换），避免 undefined ↔ object 切换触发 native 重新计算。
      className="flex-row items-center bg-white/80 border rounded-xl h-12"
      style={{
        borderColor: focused ? '#6366f1' : '#e2e8f0',
        shadowColor: '#6366f1',
        shadowOpacity: focused ? 0.2 : 0,
        shadowRadius: focused ? 6 : 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: focused ? 2 : 0,
      }}
    >
      <View className="pl-4" pointerEvents="none">{leftIcon}</View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 ml-2 text-sm text-slate-800"
      />
      {rightAccessory && <View className="pr-4">{rightAccessory}</View>}
    </View>
  );
}
