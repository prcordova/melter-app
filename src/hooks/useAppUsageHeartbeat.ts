import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { userApi } from '../services/api';
import { INSTALLED_VERSION_CODE, INSTALLED_VERSION_NAME } from '../config/app-distribution';

const MIN_INTERVAL_MS = 10 * 60 * 1000;

/** Registra uso do app (versão/plataforma) ao abrir e ao voltar ao foreground, no máx. a cada 10 min. */
export function useAppUsageHeartbeat(userId: string | null | undefined) {
  const lastSentAtRef = useRef(0);

  useEffect(() => {
    if (!userId || (Platform.OS !== 'android' && Platform.OS !== 'ios')) return;
    const platform = Platform.OS;

    const send = () => {
      if (Date.now() - lastSentAtRef.current < MIN_INTERVAL_MS) return;
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
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') send();
    });
    return () => sub.remove();
  }, [userId]);
}
