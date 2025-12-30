import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { Post, ReactionType, REACTIONS } from '../types/feed';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { useAuth } from '../contexts/AuthContext';
import { CommentsModal } from './CommentsModal';
import { ShareModal } from './ShareModal';
import { ReportPostModal } from './ReportPostModal';
import { COLORS } from '../theme/colors';

import { Avatar } from './Avatar';

interface PostCardProps {
  post: Post;
  onReact: (postId: string, reactionType: ReactionType) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

export function PostCard({
  post,
  onReact,
  onComment,
  onShare,
  onDelete,
}: PostCardProps) {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [showReactions, setShowReactions] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Verificação de segurança
  if (!post || !post.userId || typeof post.userId !== 'object') {
    return null;
  }

  // Verificar se userId tem _id
  if (!post.userId._id) {
    return null;
  }

  const isOwnPost = user?.id === post.userId._id;

  const handleReactionPress = (reactionType: ReactionType) => {
    if (post?._id) {
      onReact(post._id, reactionType);
      setShowReactions(false);
    }
  };

  const handleCommentPress = () => {
    setShowCommentsModal(true);
  };

  const handleSharePress = () => {
    setShowShareModal(true);
  };

  const handleMenuPress = () => {
    setShowMenu(true);
  };

  const handleEditPress = () => {
    setShowMenu(false);
    Alert.alert('Editar Post', 'Funcionalidade de edição será implementada');
  };

  const handleDeletePress = () => {
    setShowMenu(false);
    Alert.alert(
      'Deletar Post',
      'Tem certeza que deseja deletar este post?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: () => {
            if (onDelete) {
              onDelete(post._id);
            }
          },
        },
      ]
    );
  };

  const handleReportPress = () => {
    setShowMenu(false);
    setShowReportModal(true);
  };

  const handleUserPress = () => {
    if (post?.userId?.username) {
      navigation.navigate('UserProfile', { username: post.userId.username });
    }
  };

  const getTimeAgo = (date: string | Date) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return '';
    }
  };

  const handleImagePress = () => {
    // TODO: Abrir modal de visualização de imagem
    console.log('Abrir imagem em tela cheia');
  };

  const handleLinkPress = () => {
    if (post.linkId?.url) {
      Linking.openURL(post.linkId.url);
    }
  };

  // Encontrar a reação mais comum
  const getTopReaction = (): ReactionType | null => {
    if (!post?.reactionsCount || typeof post.reactionsCount !== 'object') return null;
    const counts = post.reactionsCount;
    let maxCount = 0;
    let topReaction: ReactionType | null = null;

    // Iterar apenas sobre as chaves de reação válidas
    (Object.keys(REACTIONS) as ReactionType[]).forEach((key) => {
      if (counts[key] > maxCount) {
        maxCount = counts[key];
        topReaction = key;
      }
    });

    return topReaction;
  };

  const topReaction = getTopReaction();

  const renderOriginalPost = (originalPost: Post) => {
    if (!originalPost || !originalPost.userId || typeof originalPost.userId !== 'object') return null;

    return (
      <View style={styles.originalPostContainer}>
        <View style={styles.originalHeader}>
          <Avatar 
            user={{ username: originalPost.userId?.username || '', avatar: originalPost.userId?.avatar }} 
            size={32}
            style={styles.originalAvatar}
          />
          <View style={styles.headerInfo}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.originalUsername}>{originalPost.userId?.username || 'Usuário'}</Text>
              {originalPost.userId.verifiedBadge?.isVerified && (
                <Text style={[styles.verifiedBadge, { fontSize: 12 }]}>✓</Text>
              )}
              {originalPost.userId.plan?.type && originalPost.userId.plan.type !== 'FREE' && (
                <View style={[
                  styles.planBadge,
                  { paddingVertical: 1, paddingHorizontal: 4 },
                  originalPost.userId.plan.type === 'STARTER' && styles.planSTARTER,
                  originalPost.userId.plan.type === 'PRO' && styles.planPRO,
                  originalPost.userId.plan.type === 'PRO_PLUS' && styles.planPRO_PLUS,
                ]}>
                  <Text style={[styles.planBadgeText, { fontSize: 8 }]}>
                    {originalPost.userId.plan.type}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.timestamp}>{getTimeAgo(originalPost.createdAt || new Date())}</Text>
          </View>
        </View>

        {originalPost.content && (
          <Text style={styles.originalContent}>{originalPost.content}</Text>
        )}

        {/* Link no Post Original */}
        {originalPost.linkId && (
          <TouchableOpacity
            style={[styles.linkPreview, { marginBottom: 0, marginTop: 8 }]}
            onPress={() => originalPost.linkId?.url && Linking.openURL(originalPost.linkId.url)}
            activeOpacity={0.7}
          >
            {originalPost.linkId.imageUrl && (
              <Image
                source={{ uri: originalPost.linkId.imageUrl }}
                style={[styles.linkImage, { height: 120 }]}
                resizeMode="cover"
              />
            )}
            <View style={styles.linkInfo}>
              <Text style={[styles.linkTitle, { fontSize: 13 }]} numberOfLines={1}>
                {originalPost.linkId.title}
              </Text>
              <Text style={styles.linkUrl} numberOfLines={1}>
                {originalPost.linkId.url}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Imagem no Post Original */}
        {originalPost.imageUrl && (
          <TouchableOpacity 
            onPress={() => console.log('Abrir imagem original')} 
            activeOpacity={0.9}
            style={{ marginTop: 8 }}
          >
            <Image
              source={{ uri: originalPost.imageUrl }}
              style={[styles.postImage, { height: 200, marginBottom: 0 }]}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar 
          user={{ 
            username: (post.userId?.username && typeof post.userId.username === 'string') ? post.userId.username : '', 
            avatar: post.userId?.avatar 
          }} 
          size={40}
          style={styles.avatar}
        />
        <View style={styles.headerInfo}>
          <TouchableOpacity 
            onPress={handleUserPress}
            activeOpacity={0.7}
            style={styles.headerTitleRow}
          >
            <Text style={styles.username}>
              {(post.userId?.username && typeof post.userId.username === 'string') ? post.userId.username : 'Usuário'}
            </Text>
            {post.userId?.verifiedBadge?.isVerified && (
              <Text style={styles.verifiedBadge}>✓</Text>
            )}
            {post.userId?.plan?.type && typeof post.userId.plan.type === 'string' && post.userId.plan.type !== 'FREE' && (
              <View style={[
                styles.planBadge,
                post.userId.plan.type === 'STARTER' && styles.planSTARTER,
                post.userId.plan.type === 'PRO' && styles.planPRO,
                post.userId.plan.type === 'PRO_PLUS' && styles.planPRO_PLUS,
              ]}>
                <Text style={styles.planBadgeText}>
                  {post.userId.plan.type}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.timestamp}>
            {post.createdAt ? getTimeAgo(post.createdAt) : ''}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation();
            handleMenuPress();
          }} 
          style={styles.menuButton}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Content (Comentário do compartilhamento ou conteúdo do post normal) */}
      {(post.originalPostId ? post.shareComment : post.content) && (
        <Text style={styles.content}>
          {post.originalPostId ? post.shareComment : post.content}
        </Text>
      )}

      {/* Renderizar Post Original se existir */}
      {post.originalPostId && typeof post.originalPostId === 'object' && renderOriginalPost(post.originalPostId as Post)}

      {/* Link Preview (apenas para posts normais) */}
      {!post.originalPostId && post.linkId && typeof post.linkId === 'object' && (
        <TouchableOpacity
          style={styles.linkPreview}
          onPress={handleLinkPress}
          activeOpacity={0.7}
        >
          {post.linkId?.imageUrl && (
            <Image
              source={{ uri: post.linkId.imageUrl }}
              style={styles.linkImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.linkInfo}>
            <Text style={styles.linkTitle} numberOfLines={2}>
              {post.linkId?.title || ''}
            </Text>
            {post.linkId?.description && (
              <Text style={styles.linkDescription} numberOfLines={2}>
                {post.linkId.description}
              </Text>
            )}
            <Text style={styles.linkUrl} numberOfLines={1}>
              {post.linkId?.url || ''}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Image (apenas para posts normais) */}
      {!post.originalPostId && post.imageUrl && (
        <TouchableOpacity onPress={handleImagePress} activeOpacity={0.9}>
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.postImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {/* Reactions */}
        <View style={styles.reactionContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowReactions(!showReactions)}
          >
            <Text style={styles.actionIcon}>
              {post.userReaction && REACTIONS[post.userReaction]
                ? REACTIONS[post.userReaction]
                : '👍'}
            </Text>
            <Text style={[
              styles.actionText,
              post.userReaction && styles.actionTextActive
            ]}>
              {(post.reactionsCount && typeof post.reactionsCount === 'object' && typeof post.reactionsCount.total === 'number') 
                ? post.reactionsCount.total 
                : 0}
            </Text>
          </TouchableOpacity>

          {/* Menu de reações */}
          {showReactions && (
            <View style={styles.reactionsMenu}>
              {(Object.keys(REACTIONS) as ReactionType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.reactionButton}
                  onPress={() => handleReactionPress(type)}
                >
                  <Text style={styles.reactionEmoji}>{REACTIONS[type]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Comments */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCommentPress}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>
            {post.commentsCount || 0}
          </Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSharePress}
        >
          <Text style={styles.actionIcon}>🔄</Text>
          <Text style={styles.actionText}>
            {post.sharesCount || 0}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reactions Summary */}
      {post.reactionsCount && 
       typeof post.reactionsCount === 'object' && 
       typeof post.reactionsCount.total === 'number' && 
       post.reactionsCount.total > 0 && (
        <View style={styles.reactionsSummary}>
          {topReaction && (
            <Text style={styles.topReactionEmoji}>{REACTIONS[topReaction]}</Text>
          )}
          <Text style={styles.reactionsSummaryText}>
            {post.reactionsCount.total} {post.reactionsCount.total === 1 ? 'reação' : 'reações'}
          </Text>
        </View>
      )}

      {/* Modais */}
      {/* Modais */}
      {post._id && (
        <>
          <CommentsModal
            visible={showCommentsModal}
            onClose={() => setShowCommentsModal(false)}
            postId={post._id}
          />

          <ShareModal
            visible={showShareModal}
            onClose={() => setShowShareModal(false)}
            postId={post._id}
            onShared={() => {
              setShowShareModal(false);
              if (post._id) {
                onShare(post._id);
              }
            }}
          />

          <ReportPostModal
            visible={showReportModal}
            onClose={() => setShowReportModal(false)}
            postId={post._id}
            postAuthorUsername={(post.userId?.username && typeof post.userId.username === 'string') ? post.userId.username : ''}
          />
        </>
      )}

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuContainer}>
            {isOwnPost ? (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={handleEditPress}>
                  <Ionicons name="create-outline" size={22} color={COLORS.text.primary} />
                  <Text style={styles.menuItemText}>Editar</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemDanger]}
                  onPress={handleDeletePress}
                >
                  <Ionicons name="trash-outline" size={22} color={COLORS.states.error} />
                  <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Deletar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.menuItem} onPress={handleReportPress}>
                <Ionicons name="flag-outline" size={22} color={COLORS.text.primary} />
                <Text style={styles.menuItemText}>Denunciar</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  avatarPlaceholder: {
    backgroundColor: '#B63385',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  verifiedBadge: {
    fontSize: 14,
    color: '#3b82f6',
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
    color: '#1e293b',
  },
  timestamp: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  content: {
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 22,
    marginBottom: 12,
  },
  linkPreview: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  linkImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f1f5f9',
  },
  linkInfo: {
    padding: 12,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  linkDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
  },
  linkUrl: {
    fontSize: 12,
    color: '#d946ef',
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reactionContainer: {
    position: 'relative',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  actionTextActive: {
    color: '#d946ef',
  },
  reactionsMenu: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    gap: 4,
  },
  reactionButton: {
    padding: 6,
  },
  reactionEmoji: {
    fontSize: 24,
  },
  reactionsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  topReactionEmoji: {
    fontSize: 16,
  },
  reactionsSummaryText: {
    fontSize: 13,
    color: '#64748b',
  },
  // Menu Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    minWidth: 200,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  menuItemDanger: {
    // Sem estilo especial de fundo
  },
  menuItemTextDanger: {
    color: COLORS.states.error,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: 4,
  },
  // Original Post Styles
  originalPostContainer: {
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: COLORS.background.tertiary + '40', // 40% opacity
  },
  originalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  originalAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  originalUsername: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  originalContent: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
});

