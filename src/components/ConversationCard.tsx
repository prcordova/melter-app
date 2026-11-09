import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { COLORS } from '../theme/colors';
import { Avatar } from './Avatar';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

interface Conversation {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatar?: string;
  };
  lastMessage?: {
    _id: string;
    content: string;
    senderId: string;
    timestamp: string;
    type?: 'text' | 'image' | 'document';
  };
  unreadCount: number;
  isArchived?: boolean;
  isOnline?: boolean;
}

interface ConversationCardProps {
  conversation: Conversation;
  onPress: () => void;
  onLongPress?: () => void;
  onUserPress?: (username: string) => void;
  onDeletePress?: () => void;
  onOptionsPress?: () => void;
  currentUserId: string;
}

export function ConversationCard({
  conversation,
  onPress,
  onLongPress,
  onUserPress,
  onDeletePress,
  onOptionsPress,
  currentUserId,
}: ConversationCardProps) {
  const swipeableRef = React.useRef<SwipeableMethods>(null);

  const handleAvatarPress = () => {
    if (onUserPress) {
      onUserPress(conversation.user.username);
    }
  };

  const getTimeAgo = (timestamp: string) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';

      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: ptBR,
      });
    } catch (error) {
      console.error('[ConversationCard] Erro ao formatar data:', error);
      return '';
    }
  };

  const getLastMessagePreview = () => {
    try {
      if (!conversation || !conversation.lastMessage) return 'Sem mensagens';

      const isOwnMessage = conversation.lastMessage.senderId === currentUserId;
      const prefix = isOwnMessage ? 'Você: ' : '';

      switch (conversation.lastMessage.type) {
        case 'image':
          return `${prefix}📷 Imagem`;
        case 'document':
          return `${prefix}📄 Documento`;
        default:
          return `${prefix}${conversation.lastMessage.content || ''}`;
      }
    } catch (e) {
      return 'Mensagem...';
    }
  };

  const renderRightActions = () => {
    return (
      <View style={styles.rightActionsContainer}>
        <TouchableOpacity
          style={[styles.rightAction, styles.optionsAction]}
          onPress={() => {
            swipeableRef.current?.close();
            if (onOptionsPress) onOptionsPress();
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          <Text style={styles.actionText}>Opções</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rightAction, styles.deleteAction]}
          onPress={() => {
            swipeableRef.current?.close();
            if (onDeletePress) onDeletePress();
          }}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
          <Text style={styles.actionText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!conversation || !conversation.user) return null;

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={40}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        delayLongPress={500}
      >
        <View style={styles.avatarContainer}>
          <Avatar 
            user={{ username: conversation.user.username, avatar: conversation.user.avatar }} 
            size={56}
            onPress={handleAvatarPress}
          />
          {conversation.isOnline && <View style={styles.onlineBadge} />}
        </View>

        <View style={styles.info}>
          <View style={styles.topRow}>
            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.7} style={{ flex: 1 }}>
              <Text style={styles.username} numberOfLines={1}>
                {conversation.user.username}
              </Text>
            </TouchableOpacity>
            {conversation.lastMessage && (
              <Text style={styles.time}>
                {getTimeAgo(conversation.lastMessage.timestamp)}
              </Text>
            )}
          </View>

          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.message,
                conversation.unreadCount > 0 && styles.unreadMessage,
              ]}
              numberOfLines={1}
            >
              {getLastMessagePreview()}
            </Text>
            {conversation.unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: COLORS.background.paper,
  },
  info: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginLeft: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.text.secondary,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  badge: {
    backgroundColor: COLORS.secondary.main,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  rightActionsContainer: {
    flexDirection: 'row',
    width: 160,
  },
  rightAction: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: '100%',
  },
  optionsAction: {
    backgroundColor: COLORS.text.tertiary,
  },
  deleteAction: {
    backgroundColor: COLORS.states.error,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});



