import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { messageApi } from '../services/api';
import { useAuth } from './AuthContext';
import { registerUnreadMessagesRefresh } from '../hooks/usePushNotifications';

type UnreadMessagesContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
};

const UnreadMessagesContext = createContext<UnreadMessagesContextValue | null>(null);

export function UnreadMessagesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const response = await messageApi.getUnreadCount();
      if (response.success && response.data) {
        const count = response.data.count || 0;
        setUnreadCount(count);
        try {
          await Notifications.setBadgeCountAsync(count);
        } catch {
          // badge não suportado em todas as plataformas
        }
      }
    } catch (error) {
      console.error('[UnreadMessages] Erro ao buscar contador:', error);
    }
  }, [user]);

  useEffect(() => {
    registerUnreadMessagesRefresh(() => {
      void refreshUnreadCount();
    });
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshUnreadCount();
      }
    });
    return () => sub.remove();
  }, [refreshUnreadCount]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnreadCount }),
    [unreadCount, refreshUnreadCount]
  );

  return (
    <UnreadMessagesContext.Provider value={value}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages() {
  const ctx = useContext(UnreadMessagesContext);
  if (!ctx) {
    throw new Error('useUnreadMessages deve ser usado dentro de UnreadMessagesProvider');
  }
  return ctx;
}
