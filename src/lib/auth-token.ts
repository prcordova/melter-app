import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/** Token de sessão (JWT) criptografado no Keychain/Keystore — nunca em AsyncStorage. */
const SECURE_KEY = 'melter_auth_token_v1';
const LEGACY_ASYNC_STORAGE_KEY = 'token';

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

let memoryToken: string | null | undefined;
let loadPromise: Promise<string | null> | null = null;

async function loadToken(): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(SECURE_KEY, SECURE_OPTIONS);
  if (stored) return stored;

  const legacy = await AsyncStorage.getItem(LEGACY_ASYNC_STORAGE_KEY);
  if (!legacy) return null;

  await SecureStore.setItemAsync(SECURE_KEY, legacy, SECURE_OPTIONS);
  await AsyncStorage.removeItem(LEGACY_ASYNC_STORAGE_KEY);
  return legacy;
}

export async function getAuthToken(): Promise<string | null> {
  if (memoryToken !== undefined) return memoryToken;
  if (!loadPromise) {
    loadPromise = loadToken()
      .then((token) => {
        if (memoryToken === undefined) memoryToken = token;
        return memoryToken;
      })
      .catch((error) => {
        console.error('[auth-token] Falha ao ler token seguro:', error);
        return null;
      })
      .finally(() => {
        loadPromise = null;
      });
  }
  return loadPromise;
}

export async function setAuthToken(token: string): Promise<void> {
  memoryToken = token;
  await SecureStore.setItemAsync(SECURE_KEY, token, SECURE_OPTIONS);
}

export async function clearAuthToken(): Promise<void> {
  memoryToken = null;
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_KEY, SECURE_OPTIONS).catch(() => undefined),
    AsyncStorage.removeItem(LEGACY_ASYNC_STORAGE_KEY).catch(() => undefined),
  ]);
}
