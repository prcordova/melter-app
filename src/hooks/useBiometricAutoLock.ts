import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { getBiometricLoginEnabled } from '../services/biometricLogin';
import { getBiometricLockTimeout } from '../lib/biometric-lock';

const IDLE_CHECK_INTERVAL_MS = 15_000;

/**
 * Pede biometria de novo após o tempo configurado sem uso (app em segundo plano ou aberto sem toques).
 * Só age quando o login biométrico está ativo neste aparelho.
 * Retorna `markActivity` para registrar toques na raiz da navegação.
 */
export function useBiometricAutoLock(active: boolean, onLock: () => void) {
  const lastActivityRef = useRef(Date.now());
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!active) return;

    lastActivityRef.current = Date.now();
    let cancelled = false;
    let locking = false;

    const lockIfIdle = async () => {
      const timeout = getBiometricLockTimeout();
      if (timeout === null || locking) return;
      if (Date.now() - lastActivityRef.current < timeout * 60_000) return;

      locking = true;
      try {
        if (!cancelled && (await getBiometricLoginEnabled())) {
          onLockRef.current();
        }
      } finally {
        locking = false;
      }
    };

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void lockIfIdle();
    });

    const intervalId = setInterval(() => {
      if (AppState.currentState === 'active') void lockIfIdle();
    }, IDLE_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      subscription.remove();
      clearInterval(intervalId);
    };
  }, [active]);

  return markActivity;
}
