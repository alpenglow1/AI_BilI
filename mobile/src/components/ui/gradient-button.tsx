import { ReactNode, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  // 可选尾部图标（原型登录按钮的 arrow-right-to-bracket）
  trailingIcon?: ReactNode;
}

// 对齐 login.html / register.html 主按钮：
// - bg-primary hover:bg-primaryDark（135deg indigo-500 → indigo-600）
// - shadow-lg shadow-primary/30（按钮下方紫色光晕）
// - active:scale-95（按下时缩放回弹）
export function GradientButton({ label, onPress, loading, disabled, trailingIcon }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(toValue: number) {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(0.95)}
      onPressOut={() => animateTo(1)}
      disabled={isDisabled}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          shadowColor: '#6366f1',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDisabled ? 0.15 : 0.3,
          shadowRadius: 10,
          elevation: isDisabled ? 3 : 6,
        }}
        className="rounded-xl overflow-hidden"
      >
        <LinearGradient
          colors={['#6366f1', '#4f46e5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 14, alignItems: 'center', justifyContent: 'center', opacity: isDisabled ? 0.6 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View className="flex-row items-center">
              <Text className="text-white font-medium">{label}</Text>
              {trailingIcon && <View className="ml-2">{trailingIcon}</View>}
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}
