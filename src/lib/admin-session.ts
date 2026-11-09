import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ADMIN_SESSION_KEY = 'melter_admin_session_token_v1';
const LEGACY_ASYNC_STORAGE_KEY = '@melter_admin_session_token';

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export async function getAdminSessionToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ADMIN_SESSION_KEY, SECURE_OPTIONS);
  } catch {
    return null;
  }
}

export async function setAdminSessionToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ADMIN_SESSION_KEY, token, SECURE_OPTIONS);
    await AsyncStorage.removeItem(LEGACY_ASYNC_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export async function clearAdminSessionToken(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(ADMIN_SESSION_KEY, SECURE_OPTIONS),
      AsyncStorage.removeItem(LEGACY_ASYNC_STORAGE_KEY),
    ]);
  } catch {
    /* ignore */
  }
}
