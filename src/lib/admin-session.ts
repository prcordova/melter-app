import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_SESSION_KEY = '@melter_admin_session_token';

export async function getAdminSessionToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ADMIN_SESSION_KEY);
  } catch {
    return null;
  }
}

export async function setAdminSessionToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ADMIN_SESSION_KEY, token);
  } catch {
    /* ignore */
  }
}

export async function clearAdminSessionToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
