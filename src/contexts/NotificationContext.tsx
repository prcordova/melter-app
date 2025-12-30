import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  actorUsername?: string;
  actorAvatar?: string;
  actionUrl?: string;
  actionType?: string;
  actionData?: any;
  isRead: boolean;
  createdAt: string;
  relatedPostId?: string;
  reactionType?: string;
  groupedActors?: Array<{
    actorId: string;
    actorUsername: string;
    actorAvatar?: string;
    reactionType?: string;
    createdAt: string;
  }>;
  groupExpiresAt?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  deletingIds: Set<string>;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  handleNotificationClick: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      // Buscar notificações (que já atualiza o unreadCount baseado nas filtradas)
      fetchNotifications();
      // Atualizar a cada 30 segundos
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await api.get('/api/notifications?limit=50');

      if (response.data.success && response.data.data) {
        // A API retorna { notifications, pagination } dentro de data
        const notificationsData = response.data.data.notifications || [];
        
        // Filtrar notificações de mensagem (aparecem em outro lugar)
        const filteredNotifications = notificationsData.filter(
          (n: Notification) => n.type !== 'MESSAGE'
        );
        
        console.log('[NotificationContext] Definindo notificações:', {
          total: filteredNotifications.length,
          unread: filteredNotifications.filter((n: Notification) => !n.isRead).length,
          sample: filteredNotifications.slice(0, 2).map((n: Notification) => ({ id: n._id, title: n.title }))
        });
        
        setNotifications(filteredNotifications);
        
        // Atualizar unreadCount baseado nas notificações filtradas (sem mensagens)
        const unreadCountFromNotifications = filteredNotifications.filter((n: Notification) => !n.isRead).length;
        
        // Sempre usar o contador calculado das notificações filtradas
        setUnreadCount(unreadCountFromNotifications);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('[NotificationContext] Erro ao buscar notificações:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      const response = await api.get('/api/notifications/unread-count');

      if (response.data.success && response.data.data) {
        const count = response.data.data.count || 0;
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('[NotificationContext] Erro ao buscar contagem:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await api.put(`/api/notifications/${notificationId}/read`);

      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('[NotificationContext] Erro ao marcar como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await api.put('/api/notifications/mark-all-read');

      if (response.data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('[NotificationContext] Erro ao marcar todas como lidas:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      setDeletingIds((prev) => new Set(prev).add(notificationId));

      const response = await api.delete(`/api/notifications/${notificationId}`);

      if (response.data.success) {
        setNotifications((prev) => {
          const filtered = prev.filter((n) => n._id !== notificationId);
          // Atualizar unreadCount se a notificação deletada era não lida
          const deletedNotif = prev.find((n) => n._id === notificationId);
          if (deletedNotif && !deletedNotif.isRead) {
            setUnreadCount((count) => Math.max(0, count - 1));
          }
          return filtered;
        });
      }
    } catch (error) {
      console.error('[NotificationContext] Erro ao deletar notificação:', error);
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const response = await api.delete('/api/notifications/all');

      if (response.data.success) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('[NotificationContext] Erro ao deletar todas as notificações:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como lida
    markAsRead(notification._id);

    // TODO: Implementar navegação baseada em actionUrl/actionType
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        deletingIds,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        handleNotificationClick,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationProvider');
  }
  return context;
}

