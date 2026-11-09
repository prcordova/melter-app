import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@melter_biometric_lock_timeout_v1';
const DISABLED_VALUE = 'off';

/** Minutos sem uso até pedir biometria de novo; `null` = bloqueio desativado. */
export type BiometricLockTimeout = number | null;

export const DEFAULT_BIOMETRIC_LOCK_TIMEOUT: BiometricLockTimeout = 5;

export const BIOMETRIC_LOCK_TIMEOUT_OPTIONS: {
  value: BiometricLockTimeout;
  label: string;
  description: string;
}[] = [
  { value: 1, label: '1 minuto', description: 'Máxima proteção' },
  { value: 5, label: '5 minutos', description: 'Padrão recomendado' },
  { value: 15, label: '15 minutos', description: 'Equilíbrio entre proteção e praticidade' },
  { value: 30, label: '30 minutos', description: 'Bloqueia menos vezes' },
  { value: 60, label: '1 hora', description: 'Só após longos períodos sem uso' },
  { value: null, label: 'Desativado', description: 'Não pede biometria para desbloquear o app' },
];

const HIDE_CONTENT_STORAGE_KEY = '@melter_biometric_hide_content_v1';

let memoryCache: BiometricLockTimeout | undefined;
let hideContentCache: boolean | undefined;
const listeners = new Set<() => void>();

function parseStored(raw: string | null): BiometricLockTimeout {
  if (raw === DISABLED_VALUE) return null;
  const minutes = Number(raw);
  return raw && Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_BIOMETRIC_LOCK_TIMEOUT;
}

/** Garante a preferência em memória (lê do AsyncStorage na primeira chamada). */
export async function ensureBiometricLockTimeoutLoaded(): Promise<BiometricLockTimeout> {
  if (memoryCache !== undefined) return memoryCache;
  let loaded: BiometricLockTimeout;
  try {
    loaded = parseStored(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    loaded = DEFAULT_BIOMETRIC_LOCK_TIMEOUT;
  }
  if (memoryCache === undefined) {
    memoryCache = loaded;
    listeners.forEach((fn) => fn());
  }
  return memoryCache;
}

export function getBiometricLockTimeout(): BiometricLockTimeout {
  return memoryCache === undefined ? DEFAULT_BIOMETRIC_LOCK_TIMEOUT : memoryCache;
}

export async function setBiometricLockTimeout(value: BiometricLockTimeout): Promise<void> {
  memoryCache = value;
  await AsyncStorage.setItem(STORAGE_KEY, value === null ? DISABLED_VALUE : String(value));
  listeners.forEach((fn) => fn());
}

/**
 * Com bloqueio ativo: oculta o app nos recentes, bloqueia prints/gravação e esconde o texto dos pushes.
 * Padrão ligado.
 */
export async function ensureBiometricHideContentLoaded(): Promise<boolean> {
  if (hideContentCache !== undefined) return hideContentCache;
  let loaded: boolean;
  try {
    loaded = (await AsyncStorage.getItem(HIDE_CONTENT_STORAGE_KEY)) !== '0';
  } catch {
    loaded = true;
  }
  if (hideContentCache === undefined) {
    hideContentCache = loaded;
    listeners.forEach((fn) => fn());
  }
  return hideContentCache;
}

export function getBiometricHideContent(): boolean {
  return hideContentCache !== false;
}

export async function setBiometricHideContent(enabled: boolean): Promise<void> {
  hideContentCache = enabled;
  await AsyncStorage.setItem(HIDE_CONTENT_STORAGE_KEY, enabled ? '1' : '0');
  listeners.forEach((fn) => fn());
}

/** Avisa mudanças de tempo de bloqueio e de ocultar conteúdo. */
export function subscribeBiometricLockTimeout(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function formatBiometricLockTimeout(value: BiometricLockTimeout): string {
  if (value === null) return 'desativado';
  if (value >= 60 && value % 60 === 0) {
    const hours = value / 60;
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }
  return value === 1 ? '1 minuto' : `${value} minutos`;
}
