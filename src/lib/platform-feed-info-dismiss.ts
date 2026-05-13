import AsyncStorage from '@react-native-async-storage/async-storage';

/** Mesma chave semântica do web (`usePlatformFeedInfo`) — valores em AsyncStorage no app. */
const STORAGE_KEY = 'melter_platform_feed_info_dismiss:ids';

export async function loadDismissedPlatformFeedInfoIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export async function persistDismissedPlatformFeedInfoIds(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignorar falhas de persistência
  }
}
