import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import { GradientButton } from '@/components/ui/gradient-button';
import { GradientInput } from '@/components/ui/gradient-input';

interface Props {
  onSwitchToRegister: () => void;
}

// 对齐 docs/prototypes/login.html
// 关键视觉：
// - 背景 linear-gradient(135deg, #e0e7ff, #ede9fe)
// - Logo 卡片：原 bg-primary/20 + blur-lg halo，RN 用紫色 shadow 模拟
// - 表单卡：bg-white/60 + backdrop-blur-xl，RN 用 BlurView
// - 图标：原型用 Font Awesome 6.4，这里用 @expo/vector-icons 的 FontAwesome6 对齐
export function LoginScreen({ onSwitchToRegister }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('请填写邮箱和密码');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    // 登录成功：auth-store 的 onAuthStateChange 会自动切到 AppTabs
  }

  const passwordEye = (
    <Pressable
      onPress={() => setShowPassword(!showPassword)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <FontAwesome6
        name={showPassword ? 'eye' : 'eye-slash'}
        size={16}
        color="#94a3b8"
      />
    </Pressable>
  );

  return (
    <LinearGradient colors={['#e0e7ff', '#ede9fe']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} pointerEvents="box-none">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']} pointerEvents="box-none">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32, paddingTop: 48, paddingBottom: 32, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo / Header */}
            <View className="items-center mb-10">
              <View
                className="w-20 h-20 bg-white rounded-2xl items-center justify-center mb-6"
                style={{
                  shadowColor: '#6366f1',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.45,
                  shadowRadius: 22,
                  elevation: 10,
                }}
              >
                {/* fa-solid fa-robot */}
                <FontAwesome6 name="robot" size={32} color="#6366f1" iconSet="solid" />
              </View>
              <Text className="text-3xl font-bold mb-2 text-slate-800">AI 记账</Text>
              <Text className="text-slate-500 text-sm">智能解析，轻松记录每一笔开销</Text>
            </View>

            {/* Form Card
             * 原型用 bg-white/60 + backdrop-blur-xl，原本用 expo-blur 的 BlurView 实现。
             * 但 iOS 17+ 上 BlurView 会吞掉子节点 TextInput 的触摸事件（点击后短暂聚焦立即失焦），
             * 这里退回到普通 View + bg-white/70 + border，视觉接近玻璃拟态，输入框稳定可聚焦。
             */}
            <View
              className="bg-white/70 rounded-3xl p-6 border border-white/60"
              style={{
                shadowColor: '#6366f1',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
                elevation: 3,
              }}
            >
              {/* Email */}
              <View className="mb-5">
                <Text className="text-xs font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">
                  邮箱
                </Text>
                <GradientInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@email.com"
                  leftIcon={<FontAwesome6 name="envelope" size={16} color="#94a3b8" />}
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>

              {/* Password */}
              <View className="mb-8">
                <Text className="text-xs font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">
                  密码
                </Text>
                <GradientInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  leftIcon={<FontAwesome6 name="lock" size={16} color="#94a3b8" iconSet="solid" />}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  rightAccessory={passwordEye}
                />
              </View>

              {/* Submit (原型登录按钮带 arrow-right-to-bracket 尾图标) */}
              <GradientButton
                label="登录"
                onPress={handleLogin}
                loading={loading}
                trailingIcon={<FontAwesome6 name="arrow-right-to-bracket" size={14} color="#fff" iconSet="solid" />}
              />
            </View>

            {error && (
              <Text className="text-rose-500 text-sm text-center mt-4">{error}</Text>
            )}

            {/* Switch to register */}
            <View className="mt-8 items-center">
              <Text className="text-sm text-slate-500">
                还没有账号？{' '}
                <Text onPress={onSwitchToRegister} className="text-primary font-semibold">
                  立即注册
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
