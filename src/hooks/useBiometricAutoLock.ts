import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { isBiometricLoginEnabledSync } from '../services/biometricLogin';
import { getBiometricLockTimeout } from '../lib/biometric-lock';

const IDLE_CHECK_INTERVAL_MS = 15_000;

function isLockProtectionActive(): boolean {
  return isBiometricLoginEnabledSync() && getBiometricLockTimeout() !== null;
}

/**
 * Pede biometria de novo após o tempo configurado sem uso (app em segundo plano ou aberto sem toques).
 * Só age quando o login biométrico está ativo neste aparelho.
 * Decisões são síncronas: ao voltar do segundo plano o bloqueio aparece sem expor o conteúdo antes.
 */
export function useBiometricAutoLock(active: boolean, onLock: () => void) {
  const lastActivityRef = useRef(Date.now());
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;
  const [privacyCoverVisible, setPrivacyCoverVisible] = useState(false);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!active) {
      setPrivacyCoverVisible(false);
      return;
    }

    lastActivityRef.current = Date.now();

    const isIdleExpired = () => {
      const timeout = getBiometricLockTimeout();
      return timeout !== null && Date.now() - lastActivityRef.current >= timeout * 60_000;
    };

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        if (isLockProtectionActive()) setPrivacyCoverVisible(true);
        return;
      }
      if (state === 'active') {
        if (isLockProtectionActive() && isIdleExpired()) onLockRef.current();
        setPrivacyCoverVisible(false);
      }
    });

    const intervalId = setInterval(() => {
      if (AppState.currentState === 'active' && isLockProtectionActive() && isIdleExpired()) {
        onLockRef.current();
      }
    }, IDLE_CHECK_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, [active]);

  return { markActivity, privacyCoverVisible };
}
