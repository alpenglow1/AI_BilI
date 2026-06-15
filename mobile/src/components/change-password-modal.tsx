import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@/store/auth-store';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

// 对齐 docs/prototypes/editPasswordModal.html
// 前端直连 supabase.auth：先用旧密码重新登录验证身份，再 updateUser 改密码
// 这与后端 /auth/change-password 逻辑等价，但走前端 session 即可（不需要 Bearer token）
export function ChangePasswordModal({ visible, onClose, onSaved }: Props) {
  const user = useAuthStore((s) => s.user);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  // 密码规则：至少 8 位，须含数字与字母（与 editPasswordModal.html 提示一致）
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
  const isNewValid = passwordRegex.test(newPassword);
  const isConfirmMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isOldFilled = oldPassword.length > 0;
  const canSave = isOldFilled && isNewValid && isConfirmMatch;

  async function handleSave() {
    if (!canSave || !user?.email) return;
    setSaving(true);
    setError(null);

    // 1. 用旧密码重新登录验证身份
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });
    if (verifyError) {
      setError('旧密码不正确');
      setSaving(false);
      return;
    }

    // 2. 更新为新密码
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    reset();
    onSaved?.();
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <SafeAreaView className="flex-1 bg-black/40 justify-end" edges={['bottom']}>
        <Pressable className="flex-1" onPress={handleClose} />
        <View className="bg-white rounded-t-3xl shadow-2xl">
          {/* Header */}
          <View className="px-5 py-4 flex-row justify-between items-center border-b border-slate-100">
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <FontAwesome6 name="xmark" size={20} color="#94a3b8" iconSet="solid" />
            </TouchableOpacity>
            <Text className="font-bold text-slate-800 text-lg">修改密码</Text>
            <View className="w-8" />
          </View>

          {/* Form */}
          <View className="px-5 py-6">
            {/* Old Password */}
            <View>
              <Text className="text-slate-500 text-xs mb-2 ml-1">旧密码</Text>
              <View className="flex-row items-center bg-slate-50 rounded-2xl px-4 border border-slate-100">
                <TextInput
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  placeholder="请输入旧密码"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showOld}
                  className="flex-1 py-4 font-medium text-slate-800"
                />
                <TouchableOpacity onPress={() => setShowOld(!showOld)} hitSlop={8}>
                  <FontAwesome6 name={showOld ? 'eye' : 'eye-slash'} size={18} color="#cbd5e1" />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View className="mt-5">
              <Text className="text-slate-500 text-xs mb-2 ml-1">新密码</Text>
              <View className="flex-row items-center bg-slate-50 rounded-2xl px-4 border border-slate-100">
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="请输入新密码"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showNew}
                  className="flex-1 py-4 font-medium text-slate-800"
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)} hitSlop={8}>
                  <FontAwesome6 name={showNew ? 'eye' : 'eye-slash'} size={18} color="#cbd5e1" />
                </TouchableOpacity>
              </View>
              <Text className="text-slate-400 text-[10px] mt-2 ml-2">
                * 至少包含 8 位，须含数字与字母
              </Text>
            </View>

            {/* Confirm New Password */}
            <View className="mt-5">
              <Text className="text-slate-500 text-xs mb-2 ml-1">确认新密码</Text>
              <View className="flex-row items-center bg-slate-50 rounded-2xl px-4 border border-slate-100">
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="请再次输入新密码"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirm}
                  className="flex-1 py-4 font-medium text-slate-800"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                  <FontAwesome6 name={showConfirm ? 'eye' : 'eye-slash'} size={18} color="#cbd5e1" />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && !isConfirmMatch && (
                <Text className="text-rose-500 text-[10px] mt-2 ml-2">两次输入的密码不一致</Text>
              )}
            </View>

            {error && (
              <Text className="text-rose-500 text-sm text-center mt-4">{error}</Text>
            )}

            <Pressable
              onPress={handleSave}
              disabled={!canSave || saving}
              className={`w-full py-4 rounded-2xl items-center mt-6 ${canSave && !saving ? 'bg-primary active:opacity-80' : 'bg-slate-200'}`}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className={`font-medium ${canSave ? 'text-white' : 'text-slate-400'}`}>
                  确认修改
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
