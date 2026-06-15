import { Modal, Pressable, Text, View } from 'react-native';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 bg-black/40 justify-center items-center px-8">
        <View className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
          <View className="px-6 pt-6 pb-4">
            <Text className="text-base font-semibold text-slate-800 text-center">{title}</Text>
            {message && (
              <Text className="text-sm text-slate-500 text-center mt-2">{message}</Text>
            )}
          </View>
          <View className="flex-row border-t border-slate-100">
            <Pressable
              onPress={onCancel}
              className="flex-1 py-3.5 active:bg-slate-50 border-r border-slate-100"
            >
              <Text className="text-center text-slate-600 font-medium">{cancelText}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className="flex-1 py-3.5 active:bg-slate-50"
            >
              <Text className={`text-center font-medium ${danger ? 'text-rose-500' : 'text-primary'}`}>
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
