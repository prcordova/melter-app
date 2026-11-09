import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { isBiometricLoginEnabledSync, subscribeBiometricLogin } from '../services/biometricLogin';
import {
  getBiometricHideContent,
  getBiometricLockTimeout,
  subscribeBiometricLockTimeout,
} from '../lib/biometric-lock';
import { setPushPreviewHidden } from './usePushNotifications';

const SCREEN_CAPTURE_KEY = 'biometric-lock';

function computeProtection(loggedIn: boolean): boolean {
  return (
    loggedIn &&
    isBiometricLoginEnabledSync() &&
    getBiometricLockTimeout() !== null &&
    getBiometricHideContent()
  );
}

/**
 * Com bloqueio biométrico ativo e "ocultar conteúdo" ligado:
 * - Android: FLAG_SECURE (tela em branco nos recentes + bloqueia prints/gravação);
 * - iOS: desfoque no seletor de apps;
 * - push sem remetente/conteúdo na tela de bloqueio.
 */
export function useAppPrivacyProtection(loggedIn: boolean) {
  const [protectionActive, setProtectionActive] = useState(() => computeProtection(loggedIn));

  useEffect(() => {
    const update = () => setProtectionActive(computeProtection(loggedIn));
    update();
    const unsubscribeLogin = subscribeBiometricLogin(update);
    const unsubscribeLock = subscribeBiometricLockTimeout(update);
    return () => {
      unsubscribeLogin();
      unsubscribeLock();
    };
  }, [loggedIn]);

  useEffect(() => {
    if (protectionActive) {
      ScreenCapture.preventScreenCaptureAsync(SCREEN_CAPTURE_KEY).catch(() => undefined);
      if (Platform.OS === 'ios') {
        ScreenCapture.enableAppSwitcherProtectionAsync(0.9).catch(() => undefined);
      }
    } else {
      ScreenCapture.allowScreenCaptureAsync(SCREEN_CAPTURE_KEY).catch(() => undefined);
      if (Platform.OS === 'ios') {
        ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => undefined);
      }
    }
    if (loggedIn) setPushPreviewHidden(protectionActive);
  }, [protectionActive, loggedIn]);
}
