import { useState } from 'react';
import {
  Alert,
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
  onSwitchToLogin: () => void;
}

// 对齐 docs/prototypes/register.html
// 注册页和登录页同一套视觉（渐变背景 + BlurView 表单 + 渐变按钮）
export function RegisterScreen({ onSwitchToLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }
    if (password.length < 6) {
      setError('密码至少需要 6 位字符');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    setError(null);

    // username 默认用邮箱前缀（原型注册页没有用户名输入）
    const defaultUsername = trimmedEmail.split('@')[0];

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { data: { username: defaultUsername } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // supabase 要求邮箱验证时 data.session 为 null
    if (!data.session) {
      Alert.alert('注册成功', '请检查邮箱点击验证链接后返回 App 登录');
      setLoading(false);
      return;
    }
    // 已自动登录：auth-store 监听 onAuthStateChange 会切到 AppTabs
  }

  const passwordEye = (
    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <FontAwesome6 name={showPassword ? 'eye' : 'eye-slash'} size={16} color="#94a3b8" />
    </Pressable>
  );

  const confirmEye = (
    <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <FontAwesome6 name={showConfirm ? 'eye' : 'eye-slash'} size={16} color="#94a3b8" />
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
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32, paddingTop: 32, paddingBottom: 32, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View className="mb-8">
              <Text className="text-3xl font-bold mb-2 text-slate-800">创建账号</Text>
              <Text className="text-slate-500 text-sm">开启您的智能记账之旅</Text>
            </View>

            {/* Form Card (iOS BlurView 会吞 TextInput 触摸，退回 View + bg-white/70 模拟玻璃拟态) */}
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
              <View className="mb-4">
                <Text className="text-xs font-semibold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">
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
              <View className="mb-4">
                <Text className="text-xs font-semibold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">
                  设置密码
                </Text>
                <GradientInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="至少 6 位字符"
                  leftIcon={<FontAwesome6 name="lock" size={16} color="#94a3b8" iconSet="solid" />}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  rightAccessory={passwordEye}
                />
              </View>

              {/* Confirm Password */}
              <View className="mb-8">
                <Text className="text-xs font-semibold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">
                  确认密码
                </Text>
                <GradientInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="再次输入密码"
                  leftIcon={<FontAwesome6 name="lock" size={16} color="#94a3b8" iconSet="solid" />}
                  secureTextEntry={!showConfirm}
                  autoComplete="new-password"
                  rightAccessory={confirmEye}
                />
              </View>

              {/* Submit (原型注册按钮没有尾图标) */}
              <GradientButton label="注册并登录" onPress={handleRegister} loading={loading} />
            </View>

            {error && (
              <Text className="text-rose-500 text-sm text-center mt-4">{error}</Text>
            )}

            {/* Switch to login */}
            <View className="mt-8 items-center">
              <Text className="text-sm text-slate-500">
                已有账号？{' '}
                <Text onPress={onSwitchToLogin} className="text-primary font-semibold">
                  立即登录
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
