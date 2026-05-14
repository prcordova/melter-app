import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const FLAG_KEY = '@melter_biometric_login_v1';
const SECURE_USER = 'melter_biometric_user_v1';
const SECURE_PASS = 'melter_biometric_pass_v1';

export async function isBiometricLoginSupported(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

export async function getBiometricLoginEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(FLAG_KEY)) === '1';
}

/** Indica se o utilizador configurou login biométrico (credenciais guardadas). */
export async function hasBiometricLoginConfigured(): Promise<boolean> {
  return (await AsyncStorage.getItem(FLAG_KEY)) === '1';
}

/**
 * Após login com sucesso: pede biometria e grava utilizador/senha no SecureStore.
 */
export async function saveCredentialsWithBiometricConfirmation(
  username: string,
  password: string
): Promise<void> {
  const auth = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirme com biometria para guardar o acesso seguro',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  if (!auth.success) {
    const err = new Error('BIOMETRIC_CANCELLED');
    (err as any).code = 'BIOMETRIC_CANCELLED';
    throw err;
  }
  await SecureStore.setItemAsync(SECURE_USER, username, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
  await SecureStore.setItemAsync(SECURE_PASS, password, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
  await AsyncStorage.setItem(FLAG_KEY, '1');
}

/**
 * Lê credenciais após autenticação biométrica (botão "Entrar com biometria").
 */
export async function getCredentialsWithBiometric(): Promise<{ username: string; password: string }> {
  const auth = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Autentique-se para entrar no Melter',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  if (!auth.success) {
    const err = new Error('BIOMETRIC_CANCELLED');
    (err as any).code = 'BIOMETRIC_CANCELLED';
    throw err;
  }
  const username = await SecureStore.getItemAsync(SECURE_USER);
  const password = await SecureStore.getItemAsync(SECURE_PASS);
  if (!username || !password) {
    const err = new Error('Credenciais biométricas em falta');
    (err as any).code = 'NO_STORED_CREDS';
    throw err;
  }
  return { username, password };
}

/** Só confirma biometria (ex.: desbloquear app com sessão já válida). */
export async function verifyBiometricIdentity(): Promise<boolean> {
  const auth = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Desbloqueie o Melter',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  return auth.success;
}

export async function clearBiometricLogin(): Promise<void> {
  await AsyncStorage.removeItem(FLAG_KEY);
  try {
    await SecureStore.deleteItemAsync(SECURE_USER);
  } catch {
    /* ignore */
  }
  try {
    await SecureStore.deleteItemAsync(SECURE_PASS);
  } catch {
    /* ignore */
  }
}
