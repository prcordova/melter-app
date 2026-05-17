import { useEffect, useMemo, useRef } from 'react';
import { usePusher } from './usePusher';

type EventCallback = (...args: unknown[]) => void;

type ListenerEntry = {
  event: string;
  callback: EventCallback;
};

/**
 * API compatível com socket.on/off, implementada com Pusher.
 */
export function useSocketIO() {
  const { channel, isConnected } = usePusher();
  const listenersRef = useRef<ListenerEntry[]>([]);

  useEffect(() => {
    if (!channel) return;

    for (const { event, callback } of listenersRef.current) {
      channel.bind(event, callback);
    }

    return () => {
      for (const { event, callback } of listenersRef.current) {
        try {
          channel.unbind(event, callback);
        } catch {
          // ignore
        }
      }
    };
  }, [channel]);

  const socket = useMemo(
    () => ({
      on: (eventName: string, callback: EventCallback) => {
        const exists = listenersRef.current.some(
          (l) => l.event === eventName && l.callback === callback
        );
        if (!exists) {
          listenersRef.current.push({ event: eventName, callback });
        }
        channel?.bind(eventName, callback);
      },
      off: (eventName: string, callback?: EventCallback) => {
        if (callback) {
          listenersRef.current = listenersRef.current.filter(
            (l) => !(l.event === eventName && l.callback === callback)
          );
          channel?.unbind(eventName, callback);
          return;
        }
        const removed = listenersRef.current.filter((l) => l.event === eventName);
        listenersRef.current = listenersRef.current.filter((l) => l.event !== eventName);
        for (const { callback: cb } of removed) {
          channel?.unbind(eventName, cb);
        }
      },
      disconnect: () => {
        listenersRef.current = [];
      },
    }),
    [channel]
  );

  return {
    socket,
    isConnected,
  };
}
