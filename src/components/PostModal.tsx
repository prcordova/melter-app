import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { postsApi } from '../services/api';
import { Post, ReactionType, REACTIONS } from '../types/feed';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { useAuth } from '../contexts/AuthContext';
import { CommentsModal } from './CommentsModal';
import { ShareModal } from './ShareModal';
import { COLORS } from '../theme/colors';
import { showToast } from './CustomToast';
import { Avatar } from './Avatar';

interface PostModalProps {
  postId: string | null;
  visible: boolean;
  onClose: () => void;
  onPostDeleted?: () => void;
  onPostShared?: () => void;
}

export function PostModal({
  postId,
  visible,
  onClose,
  onPostDeleted,
  onPostShared,
}: PostModalProps) {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (visible && postId) {
      fetchPost();
    } else {
      setPost(null);
      setError(null);
    }
  }, [visible, postId]);

  const fetchPost = async () => {
    if (!postId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await postsApi.getPost(postId);
      
      if (response.success && response.data) {
        setPost(response.data);
      } else {
        setError(response.message || 'Post não encontrado');
      }
    } catch (err: any) {
      console.error('Erro ao buscar post:', err);
      setError(err.response?.data?.message || 'Erro ao carregar post');
    } finally {
      setLoading(false);
    }
  };

  const handleReact = async (reactionType: ReactionType) => {
    if (!post) return;

    // Atualização otimista
    const prevReaction = post.userReaction;
    const prevCounts = post.reactionsCount;
    const newCounts = { ...prevCounts };
    let newReaction: ReactionType | null = prevReaction;

    if (prevReaction === reactionType) {
      newReaction = null;
      if (newCounts[reactionType] > 0) {
        newCounts[reactionType] -= 1;
      }
      if (newCounts.total > 0) {
        newCounts.total -= 1;
      }
    } else if (prevReaction === null) {
      newReaction = reactionType;
      newCounts[reactionType] += 1;
      newCounts.total += 1;
    } else {
      if (newCounts[prevReaction] > 0) {
        newCounts[prevReaction] -= 1;
      }
      newCounts[reactionType] += 1;
      newReaction = reactionType;
    }

    setPost({
      ...post,
      reactionsCount: newCounts,
      userReaction: newReaction,
    });

    try {
      await postsApi.reactToPost(post._id, reactionType);
    } catch (error) {
      console.error('Erro ao reagir:', error);
      fetchPost(); // Reverter em caso de erro
    }
  };

  const handleComment = () => {
    setShowCommentsModal(true);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleAvatarPress = () => {
    if (post?.userId?.username) {
      onClose();
      navigation.navigate('UserProfile', { username: post.userId.username });
    }
  };

  const handleMenuPress = () => {
    setShowMenu(true);
  };

  const handleEditPress = () => {
    setShowMenu(false);
    showToast.info('Funcionalidade de edição será implementada');
  };

  const handleDeletePress = () => {
    setShowMenu(false);
    handleDelete();
  };

  const handleDelete = async () => {
    if (!post) return;
    try {
      await postsApi.deletePost(post._id);
      showToast.success('Post deletado com sucesso');
      onClose();
      if (onPostDeleted) {
        onPostDeleted();
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Erro ao deletar post');
    }
  };

  const getVisibilityIcon = () => {
    if (!post) return null;
    switch (post.visibility) {
      case 'PUBLIC':
        return <Ionicons name="globe-outline" size={14} color={COLORS.text.secondary} />;
      case 'FOLLOWERS':
        return <Ionicons name="people-outline" size={14} color={COLORS.text.secondary} />;
      case 'FRIENDS':
        return <Ionicons name="person-outline" size={14} color={COLORS.text.secondary} />;
      default:
        return null;
    }
  };

  const getVisibilityLabel = () => {
    if (!post) return '';
    switch (post.visibility) {
      case 'PUBLIC':
        return 'Público';
      case 'FOLLOWERS':
        return 'Seguidores';
      case 'FRIENDS':
        return 'Amigos';
      default:
        return '';
    }
  };

  if (!visible) return null;

  return (
    <>
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={onClose}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={styles.container}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.header}>
              {user?.id === post?.userId?._id && (
                <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
                  <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
              )}
              <View style={styles.headerSpacer} />
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.secondary.main} />
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={COLORS.states.error} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchPost}>
                  <Text style={styles.retryButtonText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            ) : post ? (
              <View style={styles.contentWrapper}>
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.contentContainer}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {/* Post Header */}
                  <View style={styles.postHeader}>
                    <TouchableOpacity
                      style={styles.userInfo}
                      onPress={handleAvatarPress}
                    >
                      <Avatar
                        user={{
                          username: post.userId?.username,
                          avatar: post.userId?.avatar,
                        }}
                        size={40}
                        onPress={handleAvatarPress}
                        disableNavigation={true}
                      />
                      <View style={styles.userDetails}>
                        <View style={styles.usernameRow}>
                          <Text style={styles.username}>{post.userId?.username}</Text>
                          {post.userId?.verifiedBadge?.isVerified && (
                            <Ionicons name="checkmark-circle" size={16} color={COLORS.secondary.main} />
                          )}
                        </View>
                        <View style={styles.metaRow}>
                          <Text style={styles.date}>
                            {formatDistanceToNow(new Date(post.createdAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </Text>
                          <View style={styles.visibilityChip}>
                            {getVisibilityIcon()}
                            <Text style={styles.visibilityText}>{getVisibilityLabel()}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Post Content */}
                  <Text style={styles.content}>{post.content}</Text>

                  {/* Link Preview */}
                  {post.linkId && (
                    <TouchableOpacity
                      style={styles.linkCard}
                      onPress={() => {
                        if (post.linkId?.url) {
                          Linking.openURL(post.linkId.url);
                        }
                      }}
                    >
                      {post.linkId.imageUrl && (
                        <Image
                          source={{ uri: getAvatarUrl(post.linkId.imageUrl) }}
                          style={styles.linkImage}
                        />
                      )}
                      <View style={styles.linkInfo}>
                        <Text style={styles.linkTitle}>🔗 {post.linkId.title}</Text>
                        {post.linkId.description && (
                          <Text style={styles.linkDescription} numberOfLines={2}>
                            {post.linkId.description}
                          </Text>
                        )}
                        <Text style={styles.linkUrl} numberOfLines={1}>
                          {post.linkId.url}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Post Image */}
                  {post.imageUrl && (
                    <Image
                      source={{ uri: getAvatarUrl(post.imageUrl) }}
                      style={styles.postImage}
                      resizeMode="contain"
                    />
                  )}

                </ScrollView>
                
                {/* Actions Row - Fixo no bottom */}
                <View style={styles.actionsRow}>
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
                      <Text
                        style={[
                          styles.actionText,
                          post.userReaction && styles.actionTextActive,
                        ]}
                      >
                        {(post.reactionsCount && typeof post.reactionsCount === 'object' && typeof post.reactionsCount.total === 'number') 
                          ? post.reactionsCount.total 
                          : 0}
                      </Text>
                    </TouchableOpacity>

                    {/* Reactions Menu */}
                    {showReactions && (
                      <View style={styles.reactionsMenu}>
                        {(Object.keys(REACTIONS) as ReactionType[]).map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={styles.reactionButton}
                            onPress={() => {
                              handleReact(type);
                              setShowReactions(false);
                            }}
                          >
                            <Text style={styles.reactionEmojiLarge}>{REACTIONS[type]}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Comments */}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleComment}
                  >
                    <Text style={styles.actionIcon}>💬</Text>
                    <Text style={styles.actionText}>
                      {post.commentsCount || 0}
                    </Text>
                  </TouchableOpacity>

                  {/* Share */}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleShare}
                  >
                    <Text style={styles.actionIcon}>🔄</Text>
                    <Text style={styles.actionText}>
                      {post.sharesCount || 0}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Comments Modal */}
      {post && (
        <CommentsModal
          visible={showCommentsModal}
          onClose={() => {
            setShowCommentsModal(false);
            fetchPost(); // Recarregar para atualizar contador
          }}
          postId={post._id}
        />
      )}

      {/* Share Modal */}
      {post && (
        <ShareModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          postId={post._id}
          onShared={() => {
            setShowShareModal(false);
            fetchPost(); // Recarregar para atualizar contador
            if (onPostShared) {
              onPostShared();
            }
          }}
        />
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
            {user?.id === post?.userId?._id && (
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
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
    minHeight: 400,
    backgroundColor: COLORS.background.paper,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  menuButton: {
    padding: 4,
  },
  headerSpacer: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.secondary.main,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  contentWrapper: {
    flex: 1,
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  date: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  visibilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: COLORS.background.tertiary,
  },
  visibilityText: {
    fontSize: 11,
    color: COLORS.text.secondary,
  },
  deleteButton: {
    padding: 4,
  },
  content: {
    fontSize: 16,
    color: COLORS.text.primary,
    lineHeight: 24,
    marginBottom: 16,
  },
  linkCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  linkImage: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.background.default,
  },
  linkInfo: {
    flex: 1,
    padding: 12,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  linkDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 11,
    color: COLORS.secondary.main,
  },
  postImage: {
    width: '100%',
    minHeight: 200,
    maxHeight: 500,
    borderRadius: 12,
    backgroundColor: COLORS.background.default,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border.light,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reactionsStack: {
    flexDirection: 'row',
    marginLeft: -4,
  },
  reactionEmoji: {
    fontSize: 14,
    marginLeft: -4,
  },
  statText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: COLORS.border.light,
  },
  reactionContainer: {
    position: 'relative',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  actionTextActive: {
    color: COLORS.secondary.main,
  },
  reactionsMenu: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.background.paper,
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
  reactionEmojiLarge: {
    fontSize: 28,
  },
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
  menuItemDanger: {
    // Estilo adicional se necessário
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  menuItemTextDanger: {
    color: COLORS.states.error,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: 4,
  },
});

