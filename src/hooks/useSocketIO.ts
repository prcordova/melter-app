import { useMemo } from 'react';
import { usePusher } from './usePusher';

export function useSocketIO() {
  const { channel, isConnected } = usePusher();

  // Adapter para manter compatibilidade com chamadas socket.on/off existentes
  // enquanto o app usa Pusher como provider de realtime.
  const socket = useMemo(() => {
    if (!channel) return null;

    return {
      on: (eventName: string, callback: (...args: any[]) => void) => {
        try {
          channel.bind(eventName, callback);
        } catch (error) {
          console.error('[Realtime Adapter] Erro ao registrar listener:', error);
        }
      },
      off: (eventName: string, callback: (...args: any[]) => void) => {
        try {
          channel.unbind(eventName, callback);
        } catch (error) {
          console.error('[Realtime Adapter] Erro ao remover listener:', error);
        }
      },
      disconnect: () => {
        // O ciclo de conexão/desconexão é controlado por usePusher.
        // Mantido por compatibilidade de interface.
      }
    };
  }, [channel]);

  return {
    socket,
    isConnected,
  };
}

