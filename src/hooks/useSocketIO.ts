import { useMemo } from 'react';

export function useSocketIO() {
  // Fallback estável: desativa provider realtime problemático no boot.
  // Mantemos a mesma interface para não quebrar as telas.
  const socket = useMemo(() => {
    return {
      on: (_eventName: string, _callback: (...args: any[]) => void) => {
        // no-op
      },
      off: (_eventName: string, _callback: (...args: any[]) => void) => {
        // no-op
      },
      disconnect: () => {
        // no-op
      }
    };
  }, []);

  return {
    socket,
    isConnected: false,
  };
}

