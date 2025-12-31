import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';
import { COLORS } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { showToast } from './CustomToast';

import { Avatar } from './Avatar';

interface User {
  _id: string;
  username: string;
  avatar?: string;
  bio?: string;
  plan?: {
    type: 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS';
  };
  verifiedBadge?: {
    isVerified: boolean;
  };
  friendshipStatus?: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'FRIENDS';
  friendshipId?: string;
  friendRequestId?: string;
  followersCount?: number;
  friendsCount?: number;
  isFollowing?: boolean;
  friendsSince?: string | Date;
}

interface UserCardProps {
  user: User;
  onPress?: () => void;
  showFriendsSince?: boolean;
}

export function UserCard({ user, onPress, showFriendsSince = false }: UserCardProps) {
  const { user: currentUser } = useAuth();
  const navigation = useNavigation<any>();
  const [friendshipStatus, setFriendshipStatus] = useState(user.friendshipStatus || 'NONE');
  const [isFollowing, setIsFollowing] = useState(user.isFollowing || false);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.id === user._id;

  const handleProfilePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('UserProfile', { username: user.username });
    }
  };

  const formatDate = (date: string | Date) => {
    try {
      return new Date(date).toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  const handleFriendshipAction = async () => {
    if (loading) return;

    try {
      setLoading(true);

      switch (friendshipStatus) {
        case 'NONE':
          await userApi.sendFriendRequest(user._id);
          setFriendshipStatus('PENDING_SENT');
          showToast.success('Sucesso', 'Solicitação de amizade enviada');
          break;

        case 'PENDING_SENT':
          if (user.friendRequestId) {
            await userApi.cancelFriendRequest(user.friendRequestId);
            setFriendshipStatus('NONE');
            showToast.success('Sucesso', 'Solicitação cancelada');
          }
          break;

        case 'PENDING_RECEIVED':
          if (user.friendRequestId) {
            await userApi.acceptFriendRequest(user.friendRequestId);
            setFriendshipStatus('FRIENDS');
            showToast.success('Sucesso', 'Agora vocês são amigos!');
          }
          break;

        case 'FRIENDS':
          Alert.alert(
            'Remover Amigo',
            `Tem certeza que deseja remover ${user.username} dos amigos?`,
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Remover',
                style: 'destructive',
                onPress: async () => {
                  if (user.friendshipId) {
                    await userApi.removeFriend(user.friendshipId);
                    setFriendshipStatus('NONE');
                    showToast.success('Sucesso', 'Amizade removida');
                  }
                },
              },
            ]
          );
          break;
      }
    } catch (error) {
      console.error('[UserCard] Erro na ação de amizade:', error);
      showToast.error('Erro', 'Não foi possível executar esta ação');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowAction = async () => {
    if (followLoading) return;

    try {
      setFollowLoading(true);
      if (isFollowing) {
        await userApi.unfollowUser(user.username);
        setIsFollowing(false);
      } else {
        await userApi.followUser(user.username);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('[UserCard] Erro na ação de seguir:', error);
      showToast.error('Erro', 'Não foi possível executar esta ação');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessagePress = () => {
    navigation.navigate('MessagesStack', {
      screen: 'Chat',
      params: {
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
      },
    });
  };

  const handleRejectRequest = async () => {
    if (loading || !user.friendRequestId) return;

    try {
      setLoading(true);
      await userApi.rejectFriendRequest(user.friendRequestId);
      setFriendshipStatus('NONE');
      showToast.success('Sucesso', 'Solicitação rejeitada');
    } catch (error) {
      console.error('[UserCard] Erro ao rejeitar:', error);
      showToast.error('Erro', 'Não foi possível rejeitar a solicitação');
    } finally {
      setLoading(false);
    }
  };

  const getFriendButtonConfig = () => {
    if (isOwnProfile) return null;

    switch (friendshipStatus) {
      case 'NONE':
        return {
          text: 'Adicionar',
          icon: 'person-add-outline' as const,
          color: COLORS.secondary.main,
          variant: 'primary' as const,
        };
      case 'PENDING_SENT':
        return {
          text: 'Pendente',
          icon: 'time-outline' as const,
          color: COLORS.text.tertiary,
          variant: 'secondary' as const,
        };
      case 'PENDING_RECEIVED':
        return {
          text: 'Aceitar',
          icon: 'checkmark-circle-outline' as const,
          color: COLORS.states.success,
          variant: 'success' as const,
        };
      case 'FRIENDS':
        return {
          text: 'Amigos',
          icon: 'people' as const,
          color: COLORS.primary.main,
          variant: 'friends' as const,
        };
      default:
        return null;
    }
  };

  const friendButtonConfig = getFriendButtonConfig();
  const avatarSource = getAvatarUrl(user.avatar);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.mainContent}
        onPress={handleProfilePress}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          {/* Avatar usando o novo componente padrão */}
          <Avatar 
            user={{ username: user.username, avatar: user.avatar }} 
            size={64} 
            disableNavigation // Já estamos dentro de um TouchableOpacity que navega
          />

          {/* Info */}
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.username} numberOfLines={1}>
                {user.username}
              </Text>
              {user.verifiedBadge?.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
              )}
              {user.plan?.type && user.plan.type !== 'FREE' && (
                <View
                  style={[
                    styles.planBadge,
                    user.plan.type === 'STARTER' && styles.planSTARTER,
                    user.plan.type === 'PRO' && styles.planPRO,
                    user.plan.type === 'PRO_PLUS' && styles.planPRO_PLUS,
                  ]}
                >
                  <Text style={styles.planBadgeText}>{user.plan.type}</Text>
                </View>
              )}
            </View>

            {user.bio && (
              <Text style={styles.bio} numberOfLines={2}>
                {user.bio}
              </Text>
            )}

            <View style={styles.stats}>
              {user.friendsCount !== undefined && (
                <Text style={styles.statText}>
                  👥 {user.friendsCount}
                </Text>
              )}
              {user.followersCount !== undefined && (
                <Text style={styles.statText}>
                  👁️ {user.followersCount}
                </Text>
              )}
            </View>

            {showFriendsSince && user.friendsSince && (
              <Text style={styles.friendsSince}>
                Amigos desde: {formatDate(user.friendsSince)}
              </Text>
            )}
          </View>

          {/* Mensagem Icon (só para amigos) */}
          {friendshipStatus === 'FRIENDS' && !isOwnProfile && (
            <TouchableOpacity 
              style={styles.messageIconButton}
              onPress={handleMessagePress}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.secondary.main} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {/* Botões de Ação */}
      {!isOwnProfile && (
        <View style={styles.actions}>
          {/* Botão Seguir/Seguindo */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              isFollowing ? styles.actionButtonSecondary : styles.actionButtonPrimary,
            ]}
            onPress={handleFollowAction}
            disabled={followLoading}
          >
            <Ionicons 
              name={isFollowing ? "person-remove-outline" : "person-add-outline"} 
              size={18} 
              color={isFollowing ? COLORS.text.secondary : "#ffffff"} 
            />
            <Text style={[
              styles.actionButtonText,
              !isFollowing && styles.actionButtonTextPrimary
            ]}>
              {isFollowing ? 'Seguindo' : 'Seguir'}
            </Text>
          </TouchableOpacity>

          {/* Botão de Amizade */}
          {friendshipStatus === 'PENDING_RECEIVED' ? (
            <View style={styles.receivedRequestContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSuccess]}
                onPress={handleFriendshipAction}
                disabled={loading}
              >
                <Ionicons name="checkmark" size={20} color="#ffffff" />
                <Text style={styles.actionButtonTextPrimary}>Aceitar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonDanger]}
                onPress={handleRejectRequest}
                disabled={loading}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : friendButtonConfig ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                friendButtonConfig.variant === 'primary' && styles.actionButtonPrimary,
                friendButtonConfig.variant === 'secondary' && styles.actionButtonSecondary,
                friendButtonConfig.variant === 'friends' && styles.actionButtonFriends,
                friendButtonConfig.variant === 'success' && styles.actionButtonSuccess,
              ]}
              onPress={handleFriendshipAction}
              disabled={loading}
            >
              <Ionicons 
                name={friendButtonConfig.icon} 
                size={18} 
                color={friendButtonConfig.variant === 'primary' || friendButtonConfig.variant === 'success' ? "#ffffff" : friendButtonConfig.color} 
              />
              <Text
                style={[
                  styles.actionButtonText,
                  (friendButtonConfig.variant === 'primary' || friendButtonConfig.variant === 'success') && styles.actionButtonTextPrimary,
                ]}
              >
                {friendButtonConfig.text}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 140, // Altura aumentada
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background.tertiary,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.secondary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    flex: 1,
  },
  planBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  planSTARTER: {
    backgroundColor: '#fef3c7',
  },
  planPRO: {
    backgroundColor: '#ddd6fe',
  },
  planPRO_PLUS: {
    backgroundColor: '#fce7f3',
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  bio: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  statText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  friendsSince: {
    fontSize: 12,
    color: COLORS.secondary.main,
    fontWeight: '600',
    marginTop: 6,
  },
  messageIconButton: {
    padding: 8,
    backgroundColor: `${COLORS.secondary.main}10`,
    borderRadius: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    paddingTop: 16,
  },
  receivedRequestContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonPrimary: {
    backgroundColor: COLORS.secondary.main,
  },
  actionButtonSecondary: {
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  actionButtonFriends: {
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
  },
  actionButtonSuccess: {
    backgroundColor: COLORS.states.success,
  },
  actionButtonDanger: {
    backgroundColor: COLORS.states.error,
    width: 44,
    flex: 0,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.secondary,
  },
  actionButtonTextPrimary: {
    color: '#ffffff',
  },
});


