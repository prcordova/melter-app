import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { appApi } from '../services/app/api';
import {
  ANDROID_PACKAGE,
  APP_DISTRIBUTION,
  INSTALLED_VERSION_CODE,
  INSTALLED_VERSION_NAME,
} from '../config/app-distribution';
import { API_CONFIG } from '../config/api.config';
import { APP_DOWNLOAD_PAGE_PATH } from '../config/app/api-paths';
import { showToast } from '../components/CustomToast';

export type AppUpdateStatus = 'unknown' | 'up-to-date' | 'available' | 'required';

interface AppUpdateContextValue {
  status: AppUpdateStatus;
  latestVersion: string | null;
  installedVersion: string;
  openUpdate: () => Promise<void>;
}

const CHECK_THROTTLE_MS = 10 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

const isCheckEnabled =
  Platform.OS === 'android' && !__DEV__ && APP_DISTRIBUTION !== null && INSTALLED_VERSION_CODE > 0;

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

export function AppUpdateProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AppUpdateStatus>('unknown');
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const lastCheckAtRef = useRef(0);
  const checkingRef = useRef(false);

  const check = useCallback(async (force = false) => {
    if (!isCheckEnabled || checkingRef.current) return;
    if (!force && Date.now() - lastCheckAtRef.current < CHECK_THROTTLE_MS) return;

    checkingRef.current = true;
    try {
      const res = await appApi.getVersion();
      if (!res.success || !res.data) return;
      lastCheckAtRef.current = Date.now();

      const { latestVersion: latest, latestVersionCode, minVersionCode, apkUrl: url } = res.data;
      setLatestVersion(latest || null);
      setApkUrl(url);

      if (minVersionCode > 0 && INSTALLED_VERSION_CODE < minVersionCode) setStatus('required');
      else if (latestVersionCode > 0 && INSTALLED_VERSION_CODE < latestVersionCode) setStatus('available');
      else setStatus('up-to-date');
    } catch {
      /* sem rede: mantém o último status conhecido */
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isCheckEnabled) return;
    void check(true);

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void check();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void check(true);
    }, CHECK_INTERVAL_MS);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [check]);

  const openUpdate = useCallback(async () => {
    try {
      if (APP_DISTRIBUTION === 'play' && ANDROID_PACKAGE) {
        try {
          await Linking.openURL(`market://details?id=${ANDROID_PACKAGE}`);
        } catch {
          await Linking.openURL(`https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`);
        }
        return;
      }

      if (apkUrl) {
        void appApi.trackApkDownload().catch(() => {});
        await Linking.openURL(apkUrl);
        return;
      }

      const base = API_CONFIG.APP_URL.replace(/\/$/, '');
      await Linking.openURL(`${base}${APP_DOWNLOAD_PAGE_PATH}`);
    } catch {
      showToast.error('Erro', 'Não foi possível abrir o download da atualização');
    }
  }, [apkUrl]);

  const value = useMemo<AppUpdateContextValue>(
    () => ({ status, latestVersion, installedVersion: INSTALLED_VERSION_NAME, openUpdate }),
    [status, latestVersion, openUpdate]
  );

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>;
}

export function useAppUpdate(): AppUpdateContextValue {
  const ctx = useContext(AppUpdateContext);
  if (!ctx) throw new Error('useAppUpdate deve ser usado dentro de AppUpdateProvider');
  return ctx;
}
