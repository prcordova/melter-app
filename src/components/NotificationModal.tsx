import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNotifications, Notification } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { COLORS } from '../theme/colors';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationModal({ visible, onClose }: NotificationModalProps) {
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    loading,
    deletingIds,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    handleNotificationClick,
    fetchNotifications,
  } = useNotifications();

  // Recarregar notificações quando o modal abrir
  React.useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible, fetchNotifications]);

  // Mostrar apenas as 10 mais recentes
  const recentNotifications = notifications.slice(0, 10);
  
  // Debug temporário
  React.useEffect(() => {
    if (visible) {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      console.log('[NotificationModal] Estado quando modal está visível:', {
        notificationsCount: notifications.length,
        recentCount: recentNotifications.length,
        loading,
        unreadCount,
        unreadNotificationsCount: unreadNotifications.length,
        shouldShowMarkButton: unreadCount > 0,
        notifications: notifications.map(n => ({ id: n._id, title: n.title, isRead: n.isRead }))
      });
    }
  }, [visible, notifications, recentNotifications, loading, unreadCount]);

  const getTimeAgo = (date: string) => {
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Agora';
      }
      return formatDistanceToNow(dateObj, {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return 'Agora';
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    handleNotificationClick(notification);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable 
          style={[styles.container, { paddingTop: insets.top + 12 }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Notificações</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Ações */}
          {notifications.length > 0 && (
            <View style={styles.actions}>
              {(() => {
                // Calcular unreadCount localmente para garantir que está correto
                const localUnreadCount = notifications.filter(n => !n.isRead).length;
                console.log('[NotificationModal] Renderizando ações:', {
                  unreadCount,
                  localUnreadCount,
                  shouldShow: localUnreadCount > 0
                });
                
                return localUnreadCount > 0 ? (
                  <TouchableOpacity
                    onPress={markAllAsRead}
                    style={styles.actionButton}
                  >
                    <Ionicons name="checkmark-done" size={18} color={COLORS.secondary.main} />
                    <Text style={styles.actionButtonText}>Marcar todas como lidas</Text>
                  </TouchableOpacity>
                ) : null;
              })()}
              <TouchableOpacity
                onPress={deleteAllNotifications}
                style={[styles.actionButton, styles.actionButtonDanger]}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.states.error} />
                <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
                  Limpar
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Lista de Notificações */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
          >
            {loading && notifications.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.secondary.main} animating={true} />
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="notifications-outline"
                  size={64}
                  color={COLORS.text.secondary}
                />
                <Text style={styles.emptyText}>Nenhuma notificação</Text>
              </View>
            ) : (
              <>
                {recentNotifications.length > 0 ? (
                  recentNotifications.map((notification) => {
                    console.log('[NotificationModal] Renderizando notificação:', notification._id, notification.title);
                    return (
                      <TouchableOpacity
                        key={notification._id}
                        style={[
                          styles.notificationItem,
                          !notification.isRead && styles.notificationItemUnread,
                        ]}
                        onPress={() => handleNotificationPress(notification)}
                      >
                        {/* Avatar */}
                        <View style={styles.avatarContainer}>
                          {notification.groupedActors && notification.groupedActors.length > 1 ? (
                            // Múltiplos avatares (notificação agrupada)
                            <View style={styles.groupedAvatars}>
                              {notification.groupedActors.slice(0, 2).map((actor, index) => (
                                <View
                                  key={actor.actorId || index}
                                  style={[
                                    styles.groupedAvatar,
                                    { left: index * 12, top: index * 12, zIndex: 2 - index },
                                  ]}
                                >
                                  {getAvatarUrl(actor.actorAvatar) ? (
                                    <Image
                                      source={{ uri: getAvatarUrl(actor.actorAvatar) }}
                                      style={styles.groupedAvatarImage}
                                    />
                                  ) : (
                                    <View style={[styles.groupedAvatarImage, styles.avatarPlaceholder]}>
                                      <Text style={styles.avatarPlaceholderText}>
                                        {getUserInitials(actor.actorUsername)}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              ))}
                            </View>
                          ) : getAvatarUrl(notification.actorAvatar) ? (
                            <Image
                              source={{ uri: getAvatarUrl(notification.actorAvatar) }}
                              style={styles.avatar}
                            />
                          ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                              {notification.actorUsername ? (
                                <Text style={styles.avatarPlaceholderText}>
                                  {getUserInitials(notification.actorUsername)}
                                </Text>
                              ) : (
                                <Ionicons
                                  name="notifications"
                                  size={20}
                                  color="#ffffff"
                                />
                              )}
                            </View>
                          )}
                        </View>

                        {/* Conteúdo */}
                        <View style={styles.notificationContent}>
                          <Text
                            style={[
                              styles.notificationTitle,
                              !notification.isRead && styles.notificationTitleUnread,
                            ]}
                          >
                            {notification.title}
                          </Text>
                          <Text style={styles.notificationMessage}>
                            {notification.message}
                          </Text>
                          <Text style={styles.notificationTime}>
                            {getTimeAgo(notification.createdAt)}
                          </Text>
                        </View>

                        {/* Botão deletar */}
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                          style={styles.deleteButton}
                          disabled={deletingIds.has(notification._id)}
                        >
                          {deletingIds.has(notification._id) ? (
                            <ActivityIndicator size="small" color={COLORS.text.secondary} animating={true} />
                          ) : (
                            <Ionicons
                              name="close-circle-outline"
                              size={20}
                              color={COLORS.text.secondary}
                            />
                          )}
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nenhuma notificação recente</Text>
                  </View>
                )}

                {notifications.length > 10 && (
                  <View style={styles.moreContainer}>
                    <Text style={styles.moreText}>
                      + {notifications.length - 10} notificações
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  container: {
    backgroundColor: COLORS.background.paper,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    maxHeight: '80%',
    minHeight: 300,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
  },
  actionButtonDanger: {
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary.main,
  },
  actionButtonTextDanger: {
    color: COLORS.states.error,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  notificationItemUnread: {
    backgroundColor: '#f0e7f5',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary.main,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.tertiary,
  },
  groupedAvatars: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  groupedAvatar: {
    position: 'absolute',
  },
  groupedAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.background.paper,
    backgroundColor: COLORS.background.tertiary,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.secondary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  notificationTitleUnread: {
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.secondary.main,
  },
  deleteButton: {
    padding: 4,
  },
  moreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  moreText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
});

