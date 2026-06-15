import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 } from '@expo/vector-icons';

import { ChangePasswordModal } from '@/components/change-password-modal';
import { ChangeUsernameModal } from '@/components/change-username-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useAuthStore } from '@/store/auth-store';

// 对齐 docs/prototypes/profile.html
// 假定调用方已保证 session 存在（_layout 未登录时不会渲染到 AppTabs，自然到不了这里）
export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [usernameModalVisible, setUsernameModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // user_metadata.username 是注册时和 change-username 时写入的
  // 类型上 supabase 的 user_metadata 是 Record<string, any>，需要安全访问
  const username = (user?.user_metadata?.username as string | undefined) ?? '';
  const email = user?.email ?? '';
  const avatarLetter = (username || email).charAt(0).toUpperCase() || '?';

  async function handleLogoutConfirm() {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    setLogoutDialogOpen(false);
  }

  if (!user) {
    // 防御：理论上 _layout 已过滤，但加一道兜底避免渲染时 user 突然变 null
    return (
      <View className="flex-1 items-center justify-center bg-bgsoft">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bgsoft" edges={['top']}>
      {/* Header */}
      <View className="px-6 py-2 items-center mb-2">
        <Text className="text-xl font-bold text-slate-800">我</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 96 }}>
        {/* User Info */}
        <View className="items-center justify-center py-6 mb-2">
          {/* 对齐 profile.html：bg-gradient-to-tr from-primary to-purple-400
           * purple-400 = #c084fc（Tailwind v3）
           * 注意：LinearGradient 的 width/height/borderRadius 都必须走 style prop，
           * NativeWind className 在 LinearGradient 上不会传到 native view */}
          <LinearGradient
            colors={['#6366f1', '#c084fc']}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={{
              width: 70,
              height: 70,
              borderRadius: 50,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Text className="text-white text-3xl font-bold">{avatarLetter}</Text>
          </LinearGradient>
          <Text className="text-slate-500 font-medium">{email}</Text>
        </View>

        {/* Action List */}
        <View className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-6">
          {/* 用户名 row */}
          <Pressable
            onPress={() => setUsernameModalVisible(true)}
            className="flex-row items-center justify-between px-5 py-4 border-b border-slate-50 active:bg-slate-50"
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-indigo-50 items-center justify-center mr-3">
                <FontAwesome6 name="user-pen" size={12} color="#6366f1" iconSet="solid" />
              </View>
              <Text className="font-medium text-sm text-slate-700">用户名</Text>
            </View>
            <View className="flex-row items-center">
              {/* 原型 space-x-2 (8px) + chevron ml-1 (4px) = 12px 总间距 */}
              <Text className="text-sm text-slate-500 mr-3">{username || '未设置'}</Text>
              <FontAwesome6 name="chevron-right" size={12} color="#cbd5e1" iconSet="solid" />
            </View>
          </Pressable>

          {/* 密码 row */}
          <Pressable
            onPress={() => setPasswordModalVisible(true)}
            className="flex-row items-center justify-between px-5 py-4 active:bg-slate-50"
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center mr-3">
                <FontAwesome6 name="lock" size={12} color="#3b82f6" iconSet="solid" />
              </View>
              <Text className="font-medium text-sm text-slate-700">密码</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-sm text-slate-500 mr-3 tracking-widest">••••••••</Text>
              <FontAwesome6 name="chevron-right" size={12} color="#cbd5e1" iconSet="solid" />
            </View>
          </Pressable>
        </View>

        {/* Logout Button */}
        <Pressable
          onPress={() => setLogoutDialogOpen(true)}
          className="w-full bg-white rounded-2xl py-4 items-center border border-slate-100 shadow-sm active:bg-red-50 active:scale-95"
        >
          <Text className="text-rose-500 font-medium">退出登录</Text>
        </Pressable>

        {/* Version */}
        <View className="items-center mt-8">
          <Text className="text-xs text-slate-400">AI 记账 App v1.0.0</Text>
        </View>
      </ScrollView>

      <ChangeUsernameModal
        visible={usernameModalVisible}
        currentUsername={username}
        onClose={() => setUsernameModalVisible(false)}
        onSaved={() => {
          // supabase.auth.updateUser 会触发 onAuthStateChange，
          // auth-store 自动同步 user（含新的 user_metadata），无需手动 reload
        }}
      />

      <ChangePasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
      />

      <ConfirmDialog
        visible={logoutDialogOpen}
        title="确认退出登录？"
        message="退出后需要重新登录才能使用"
        confirmText={signingOut ? '退出中' : '退出'}
        danger
        onConfirm={handleLogoutConfirm}
        onCancel={() => setLogoutDialogOpen(false)}
      />
    </SafeAreaView>
  );
}
