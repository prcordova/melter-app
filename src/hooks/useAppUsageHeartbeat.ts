import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { userApi } from '../services/api';
import { INSTALLED_VERSION_CODE, INSTALLED_VERSION_NAME } from '../config/app-distribution';

/** Mesmo ritmo do web (`useHeartbeat` 30s) — servidor considera online por 90s após o último envio. */
const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const MIN_GAP_MS = 20 * 1000;

/** Presença online + uso do app (versão/plataforma) enquanto o app está em foreground. */
export function useAppUsageHeartbeat(userId: string | null | undefined) {
  const lastSentAtRef = useRef(0);

  useEffect(() => {
    if (!userId || (Platform.OS !== 'android' && Platform.OS !== 'ios')) return;
    const platform = Platform.OS;

    const send = () => {
      if (Date.now() - lastSentAtRef.current < MIN_GAP_MS) return;
      lastSentAtRef.current = Date.now();
      void userApi
        .heartbeat({
          client: 'app',
          platform,
          versionCode: INSTALLED_VERSION_CODE,
          ...(INSTALLED_VERSION_NAME ? { versionName: INSTALLED_VERSION_NAME } : {}),
        })
        .catch(() => {
          lastSentAtRef.current = 0;
        });
    };

    send();
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') send();
    }, HEARTBEAT_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') send();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [userId]);
}
