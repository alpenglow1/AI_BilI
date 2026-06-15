import AsyncStorage from '@react-native-async-storage/async-storage';

const CLEARED_AT_KEY = 'chat.clearedAt';

export async function getClearedAt(): Promise<string | null> {
  return await AsyncStorage.getItem(CLEARED_AT_KEY);
}

export async function setClearedAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(CLEARED_AT_KEY, iso);
}
