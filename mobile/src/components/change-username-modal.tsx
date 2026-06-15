import { useEffect, useState } from 'react';
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

interface Props {
  visible: boolean;
  currentUsername: string;
  onClose: () => void;
  onSaved?: (newUsername: string) => void;
}

// 对齐 docs/prototypes/editUsernameModal.html
// 底部 sheet 样式（与 BillEditModal 一致）
export function ChangeUsernameModal({ visible, currentUsername, onClose, onSaved }: Props) {
  const [username, setUsername] = useState(currentUsername);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 打开时同步 currentUsername
  useEffect(() => {
    if (visible) {
      setUsername(currentUsername);
      setError(null);
    }
  }, [visible, currentUsername]);

  const trimmed = username.trim();
  // 长度限制 2-20（与后端 /auth/change-username 一致）
  const canSave = trimmed.length >= 2 && trimmed.length <= 20 && trimmed !== currentUsername;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({
      data: { username: trimmed },
    });
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    onSaved?.(trimmed);
    setSaving(false);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-black/40 justify-end" edges={['bottom']}>
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-3xl shadow-2xl">
          {/* Header */}
          <View className="px-5 py-4 flex-row justify-between items-center border-b border-slate-100">
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <FontAwesome6 name="xmark" size={20} color="#94a3b8" iconSet="solid" />
            </TouchableOpacity>
            <Text className="font-bold text-slate-800 text-lg">修改用户名</Text>
            <View className="w-8" />
          </View>

          {/* Form */}
          <View className="px-5 py-6">
            <Text className="text-slate-500 text-xs mb-2 ml-1">新用户名</Text>
            <View className="flex-row items-center bg-slate-50 rounded-2xl px-4 border border-slate-100">
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="输入新用户名"
                placeholderTextColor="#94a3b8"
                autoFocus
                className="flex-1 py-4 font-medium text-slate-800"
              />
              {username.length > 0 && (
                <TouchableOpacity onPress={() => setUsername('')} hitSlop={8}>
                  <FontAwesome6 name="circle-xmark" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              )}
            </View>
            <Text className="text-slate-400 text-[10px] mt-2 ml-2">* 长度限制 2-20 个字符</Text>

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
                  保存修改
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
