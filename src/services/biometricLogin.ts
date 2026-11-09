import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { authApi } from './auth';

const FLAG_KEY = '@melter_biometric_login_v1';
/** Id da credencial (não é segredo) — permite revogar no servidor sem pedir biometria. */
const CREDENTIAL_ID_KEY = '@melter_biometric_credential_id_v2';
/** Segredo da credencial de dispositivo, só legível após biometria (chave invalidada se a biometria mudar). */
const DEVICE_SECRET_KEY = 'melter_biometric_device_v2';
const LEGACY_SECURE_USER = 'melter_biometric_user_v1';
const LEGACY_SECURE_PASS = 'melter_biometric_pass_v1';

export type BiometricErrorCode =
  | 'BIOMETRIC_CANCELLED'
  | 'BIOMETRIC_INVALIDATED'
  | 'BIOMETRIC_UNAVAILABLE'
  | 'NOT_CONFIGURED';

export type BiometricLoginCredential =
  | { type: 'device'; credentialId: string; secret: string; username: string }
  | { type: 'legacy'; username: string; password: string };

type StoredDeviceSecret = { credentialId: string; secret: string; username: string };

function biometricError(code: BiometricErrorCode, message: string): Error & { code: BiometricErrorCode } {
  const err = new Error(message) as Error & { code: BiometricErrorCode };
  err.code = code;
  return err;
}

function protectedOptions(prompt: string): SecureStore.SecureStoreOptions {
  return {
    requireAuthentication: true,
    authenticationPrompt: prompt,
    keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  };
}

function currentDeviceName(): string {
  const constants = Platform.constants as Record<string, unknown>;
  if (Platform.OS === 'android') {
    const brand = typeof constants.Brand === 'string' ? constants.Brand : '';
    const model = typeof constants.Model === 'string' ? constants.Model : '';
    const name = `${brand} ${model}`.trim();
    return name ? name.slice(0, 80) : 'Android';
  }
  return constants.interfaceIdiom === 'pad' ? 'iPad' : 'iPhone';
}

let enabledCache: boolean | undefined;
const listeners = new Set<() => void>();

function setEnabledCache(enabled: boolean) {
  enabledCache = enabled;
  listeners.forEach((fn) => fn());
}

export function subscribeBiometricLogin(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Leitura síncrona (decisões de bloqueio sem esperar I/O). Válida após `getBiometricLoginEnabled`. */
export function isBiometricLoginEnabledSync(): boolean {
  return enabledCache === true;
}

export async function isBiometricLoginSupported(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    return (await LocalAuthentication.isEnrolledAsync()) && SecureStore.canUseBiometricAuthentication();
  } catch {
    return false;
  }
}

export async function getBiometricLoginEnabled(): Promise<boolean> {
  const enabled = (await AsyncStorage.getItem(FLAG_KEY)) === '1';
  if (enabled !== enabledCache) setEnabledCache(enabled);
  return enabled;
}

/** Indica se o login biométrico está ativo neste aparelho. */
export async function hasBiometricLoginConfigured(): Promise<boolean> {
  return getBiometricLoginEnabled();
}

async function readLegacyUsername(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(LEGACY_SECURE_USER);
  } catch {
    return null;
  }
}

async function deleteLegacyCredentials() {
  await Promise.all([
    SecureStore.deleteItemAsync(LEGACY_SECURE_USER).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_SECURE_PASS).catch(() => undefined),
  ]);
}

/**
 * Ativa o login biométrico neste aparelho (exige sessão válida).
 * O servidor emite uma credencial de dispositivo; o segredo fica no Keychain/Keystore preso à biometria atual.
 * A senha **não** é guardada.
 */
export async function enableBiometricLogin(
  username: string,
  options?: { alreadyConfirmed?: boolean }
): Promise<void> {
  if (!(await isBiometricLoginSupported())) {
    throw biometricError('BIOMETRIC_UNAVAILABLE', 'Biometria não disponível ou não cadastrada neste aparelho.');
  }

  // No Android o próprio SecureStore pede a biometria ao gravar; no iOS confirmamos antes.
  if (Platform.OS === 'ios' && !options?.alreadyConfirmed) {
    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirme com biometria para ativar o acesso',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: true,
    });
    if (!auth.success) {
      throw biometricError('BIOMETRIC_CANCELLED', 'Biometria cancelada.');
    }
  }

  const created = await authApi.createDeviceCredential(
    currentDeviceName(),
    Platform.OS === 'ios' ? 'ios' : 'android'
  );
  if (!created.success || !created.data) {
    throw new Error(created.message || 'Não foi possível ativar a biometria.');
  }

  const stored: StoredDeviceSecret = {
    credentialId: created.data.credentialId,
    secret: created.data.secret,
    username,
  };

  try {
    await SecureStore.setItemAsync(
      DEVICE_SECRET_KEY,
      JSON.stringify(stored),
      protectedOptions('Confirme com biometria para ativar o acesso')
    );
  } catch {
    await authApi.revokeDeviceCredential(stored.credentialId).catch(() => undefined);
    throw biometricError('BIOMETRIC_CANCELLED', 'Biometria cancelada.');
  }

  await AsyncStorage.multiSet([
    [FLAG_KEY, '1'],
    [CREDENTIAL_ID_KEY, stored.credentialId],
  ]);
  await deleteLegacyCredentials();
  setEnabledCache(true);
}

/**
 * Pede biometria e devolve a credencial para login.
 * `BIOMETRIC_INVALIDATED`: a biometria do aparelho mudou (ex.: nova digital) — acesso local apagado.
 */
export async function getBiometricLoginCredential(prompt: string): Promise<BiometricLoginCredential> {
  if (!(await getBiometricLoginEnabled())) {
    throw biometricError('NOT_CONFIGURED', 'Login por biometria não está ativo neste aparelho.');
  }

  const legacyUsername = await readLegacyUsername();
  if (legacyUsername) {
    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: true,
    });
    if (!auth.success) {
      throw biometricError('BIOMETRIC_CANCELLED', 'Biometria cancelada.');
    }
    const password = await SecureStore.getItemAsync(LEGACY_SECURE_PASS);
    if (!password) {
      await clearBiometricLogin({ revokeRemote: false });
      throw biometricError('NOT_CONFIGURED', 'Acesso biométrico incompleto. Entre com sua senha.');
    }
    return { type: 'legacy', username: legacyUsername, password };
  }

  let raw: string | null;
  try {
    raw = await SecureStore.getItemAsync(DEVICE_SECRET_KEY, protectedOptions(prompt));
  } catch {
    throw biometricError('BIOMETRIC_CANCELLED', 'Não foi possível confirmar a biometria.');
  }

  if (!raw) {
    await clearBiometricLogin();
    throw biometricError(
      'BIOMETRIC_INVALIDATED',
      'A biometria deste aparelho mudou. Por segurança, entre com sua senha e ative o acesso de novo.'
    );
  }

  try {
    const parsed = JSON.parse(raw) as StoredDeviceSecret;
    if (!parsed.credentialId || !parsed.secret) throw new Error('invalid');
    return { type: 'device', ...parsed };
  } catch {
    await clearBiometricLogin();
    throw biometricError('NOT_CONFIGURED', 'Acesso biométrico corrompido. Entre com sua senha.');
  }
}

/**
 * Formato antigo (usuário/senha no aparelho) → credencial de dispositivo. Exige sessão válida.
 * Se falhar, apaga o acesso antigo para a senha não continuar guardada.
 */
export async function migrateLegacyBiometricLogin(username: string): Promise<boolean> {
  try {
    await enableBiometricLogin(username, { alreadyConfirmed: true });
    return true;
  } catch {
    await clearBiometricLogin({ revokeRemote: false });
    return false;
  }
}

export type BiometricUnlockResult = 'success' | 'cancelled' | 'invalidated';

/** Desbloqueio do app com sessão válida: lê o segredo protegido (só biometria atual, sem PIN). */
export async function verifyBiometricIdentity(): Promise<BiometricUnlockResult> {
  try {
    const credential = await getBiometricLoginCredential('Desbloqueie o Melter');
    if (credential.type === 'legacy') {
      void migrateLegacyBiometricLogin(credential.username);
    }
    return 'success';
  } catch (e) {
    const code = (e as { code?: BiometricErrorCode }).code;
    if (code === 'BIOMETRIC_INVALIDATED' || code === 'NOT_CONFIGURED') return 'invalidated';
    return 'cancelled';
  }
}

/** Remove o acesso biométrico do aparelho e, se houver sessão, revoga a credencial no servidor. */
export async function clearBiometricLogin(options?: { revokeRemote?: boolean }): Promise<void> {
  const credentialId = await AsyncStorage.getItem(CREDENTIAL_ID_KEY).catch(() => null);
  if (credentialId && options?.revokeRemote !== false) {
    await authApi.revokeDeviceCredential(credentialId).catch(() => undefined);
  }
  await AsyncStorage.multiRemove([FLAG_KEY, CREDENTIAL_ID_KEY]).catch(() => undefined);
  await SecureStore.deleteItemAsync(DEVICE_SECRET_KEY, { requireAuthentication: true }).catch(() => undefined);
  await deleteLegacyCredentials();
  setEnabledCache(false);
}

/** Id da credencial deste aparelho (para destacar na lista de aparelhos). */
export async function getCurrentDeviceCredentialId(): Promise<string | null> {
  return AsyncStorage.getItem(CREDENTIAL_ID_KEY).catch(() => null);
}
