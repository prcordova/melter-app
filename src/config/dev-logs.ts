import Constants from 'expo-constants';

const raw = Constants.expoConfig?.extra?.EXPO_PUBLIC_DEBUG_LOGS;

if (raw !== 'true' && raw !== 'false') {
  throw new Error(
    'EXPO_PUBLIC_DEBUG_LOGS ausente ou inválido no app.json (extra). Use "true" ou "false".'
  );
}

/** Logs verbosos (push, API, crash overlay no feed). Produção / uso normal: false. */
export const DEBUG_VERBOSE_LOGS = raw === 'true';

export function devLog(...args: unknown[]): void {
  if (DEBUG_VERBOSE_LOGS) console.log(...args);
}

export function devWarn(...args: unknown[]): void {
  if (DEBUG_VERBOSE_LOGS) console.warn(...args);
}

export function devError(...args: unknown[]): void {
  if (DEBUG_VERBOSE_LOGS) console.error(...args);
}
