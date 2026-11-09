import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import ImageViewing from 'react-native-image-viewing';
import { Post, ReactionType, REACTIONS, REACTION_LABELS } from '../types/feed';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { useAuth } from '../contexts/AuthContext';
import { CommentsModal } from './CommentsModal';
import { ShareModal } from './ShareModal';
import { ReportPostModal } from './ReportPostModal';
import { PostModal } from './PostModal';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import { SURFACE_RADIUS, type AppPalette } from '../theme/palettes';
import { shouldShowVerifiedBadgeOnProfile } from '../utils/verified-badge';
import {
  getPostAuthorDisplayLabel,
  getPostAuthorObjectId,
  getPostAuthorUsernameForNav,
  VERIFIED_BADGE_ICON_COLOR,
} from '../utils/post-author';

import { Avatar } from './Avatar';
import { UsernameGradientText } from './UsernameGradientText';
import { RichPostText } from './RichPostText';
import { PostDoubleTapLike } from './PostDoubleTapLike';
import { PlanLocker } from './PlanLocker';
import { resolveUserPlanType } from '../config/plan-features';
import { useFeedPlanGates } from '../hooks/useFeedPlanGates';
import { useLinkPreview } from '../hooks/useLinkPreview';
import { LinkPreviewCard, postLinkToPreview, type LinkPreviewData } from './LinkPreviewCard';
import { getFixedCategory } from '../constants/categories';
import { getPostVisibilityOption } from '../constants/post-visibility';

const ADULT_CATEGORY_COLOR = '#CA3994';

/** Borda do avatar por selo/plano (web `PostCard` header). */
function getAvatarRingColor(user: Post['userId']): string | null {
  if (user?.verifiedBadge?.isVerified) return 'rgba(236, 72, 153, 0.8)';
  switch (user?.plan?.type) {
    case 'PRO_PLUS':
      return '#9333ea';
    case 'PRO':
      return '#FFD700';
    case 'STARTER':
      return '#0ea5e9';
    default:
      return null;
  }
}

function topReactionEmojis(counts: Post['reactionsCount'], limit = 3): string[] {
  if (!counts) return [];
  return (Object.keys(REACTIONS) as ReactionType[])
    .map((type) => ({ emoji: REACTIONS[type], n: Number(counts[type] ?? 0) }))
    .filter((item) => item.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map((item) => item.emoji);
}

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
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [showReactions, setShowReactions] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showOriginalPostModal, setShowOriginalPostModal] = useState(false);
  const [originalPostId, setOriginalPostId] = useState<string | null>(null);
  const { requiredPlan } = useFeedPlanGates();
  const { preview: autoLinkPreview, loading: autoLinkPreviewLoading } = useLinkPreview(post?.content, {
    enabled: Boolean(post && !post.linkId && !post.originalPostId && !post.hideAutoPreview),
  });

  const authorId = getPostAuthorObjectId(post?.userId);
  const isValidPost =
    Boolean(post && post.userId && typeof post.userId === 'object' && authorId);

  if (!isValidPost || !post || !authorId) {
    return null;
  }

  const authorLabel = getPostAuthorDisplayLabel(post.userId);
  const authorNavUsername = getPostAuthorUsernameForNav(post.userId);
  const currentPlan = resolveUserPlanType(user?.plan?.type);
  const shareRequiredPlan = requiredPlan('minPlanToSharePosts');
  /** Web (`PostCard`): mostra `post.userId.username` no gradiente; fallback só se vier vazio. */
  const authorUsernameForHeader =
    typeof post.userId.username === 'string' && post.userId.username.trim()
      ? post.userId.username.trim()
      : authorLabel;

  const isOwnPost = user?.id === authorId;

  const handleReactionPress = (reactionType: ReactionType) => {
    if (post?._id) {
      onReact(post._id, reactionType);
      setShowReactions(false);
    }
  };

  /** Double-tap Instagram-like: LIKE sem descurtir se já curtido. */
  const handleDoubleTapLike = () => {
    if (!post?._id) return;
    if (post.userReaction !== 'LIKE') {
      onReact(post._id, 'LIKE');
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
    if (authorNavUsername) {
      navigation.navigate('UserProfile', { username: authorNavUsername });
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

  // Função helper para sempre pegar o ID do post ORIGINAL na cadeia de compartilhamentos
  const getOriginalPostId = (post: Post): string => {
    if (!post.originalPostId) {
      // Este é o post original
      return post._id;
    }
    
    // Se o post compartilhado tem outro originalPostId, usar aquele (post mais antigo da cadeia)
    if (post.originalPostId && typeof post.originalPostId === 'object' && post.originalPostId.originalPostId) {
      if (typeof post.originalPostId.originalPostId === 'object' && post.originalPostId.originalPostId._id) {
        return post.originalPostId.originalPostId._id;
      }
      if (typeof post.originalPostId.originalPostId === 'string') {
        return post.originalPostId.originalPostId;
      }
    }
    
    // Caso contrário, o originalPostId._id é o post original
    if (post.originalPostId && typeof post.originalPostId === 'object' && post.originalPostId._id) {
      return post.originalPostId._id;
    }
    
    return post._id;
  };

  const handleImagePress = () => {
    if (post.imageUrl) {
      setShowImageViewer(true);
    }
  };

  const handleOriginalPostPress = () => {
    if (post.originalPostId) {
      const originalId = getOriginalPostId(post);
      setOriginalPostId(originalId);
      setShowOriginalPostModal(true);
    }
  };

  const totalReactions =
    post.reactionsCount && typeof post.reactionsCount.total === 'number' ? post.reactionsCount.total : 0;
  const reactionEmojis = totalReactions > 0 ? topReactionEmojis(post.reactionsCount) : [];
  const commentsCount = post.commentsCount || 0;
  const viewsCount = post.viewsCount || 0;
  const sharesCount = post.sharesCount || 0;
  const hasEngagementStats = totalReactions > 0 || commentsCount > 0 || viewsCount > 0 || sharesCount > 0;
  const avatarRingColor = getAvatarRingColor(post.userId);
  const visibilityOption = getPostVisibilityOption(post.visibility);
  const category = getFixedCategory(post.category || 'outros');
  const isAdultCategory = category?._id === 'conteudo-18';

  const renderOriginalPost = (originalPost: Post) => {
    if (!originalPost || !originalPost.userId || typeof originalPost.userId !== 'object') return null;

    return (
      <View style={styles.originalPostContainer}>
        <View style={styles.originalHeader}>
          <Avatar 
            user={{
              username:
                typeof (originalPost.userId as any).username === 'string' &&
                String((originalPost.userId as any).username).trim()
                  ? String((originalPost.userId as any).username).trim()
                  : getPostAuthorDisplayLabel(originalPost.userId as any),
              avatar: originalPost.userId?.avatar,
            }} 
            size={32}
            style={styles.originalAvatar}
          />
          <View style={styles.headerInfo}>
            <View style={[styles.headerTitleRow, styles.headerTitleTouchable]}>
              <View style={styles.authorNameShrink}>
              <UsernameGradientText
                username={
                  typeof (originalPost.userId as any).username === 'string' &&
                  String((originalPost.userId as any).username).trim()
                    ? String((originalPost.userId as any).username).trim()
                    : getPostAuthorDisplayLabel(originalPost.userId as any)
                }
                effect={originalPost.userId.profile?.usernameDisplayEffect ?? null}
                fontSize={14}
                fontWeight="600"
                style={{ color: colors.text.primary }}
                numberOfLines={1}
              />
            </View>
              {shouldShowVerifiedBadgeOnProfile(originalPost.userId as any) && (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={VERIFIED_BADGE_ICON_COLOR}
                  style={styles.verifiedIcon}
                />
              )}
              {originalPost.userId?.plan?.type &&
                typeof originalPost.userId.plan.type === 'string' &&
                originalPost.userId.plan.type !== 'FREE' && (
                <View style={[
                  { flexShrink: 0 },
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
          <PostDoubleTapLike onLike={handleDoubleTapLike}>
            <RichPostText text={originalPost.content} style={styles.originalContent} color={colors.text.secondary} />
          </PostDoubleTapLike>
        )}

        {/* Link no Post Original */}
        {originalPost.linkId?.url ? (
          <View style={styles.originalLinkWrap}>
            <LinkPreviewCard preview={postLinkToPreview(originalPost.linkId)} confirmBeforeNavigate compact />
          </View>
        ) : null}

        {/* Imagem no Post Original */}
        {originalPost.imageUrl && (
          <TouchableOpacity 
            activeOpacity={0.9}
            style={{ marginTop: 8 }}
            onPress={handleOriginalPostPress}
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
        <View style={[styles.avatarRing, avatarRingColor ? { borderColor: avatarRingColor } : null]}>
          <Avatar
            user={{
              username: authorUsernameForHeader,
              avatar: post.userId?.avatar,
            }}
            size={40}
          />
        </View>
        <View style={styles.headerInfo}>
          <TouchableOpacity 
            onPress={handleUserPress}
            activeOpacity={0.7}
            style={[styles.headerTitleRow, styles.headerTitleTouchable]}
          >
            <View style={styles.authorNameShrink}>
              <UsernameGradientText
                username={authorUsernameForHeader}
                effect={post.userId.profile?.usernameDisplayEffect ?? null}
                fontSize={15}
                fontWeight="600"
                style={{ color: colors.text.primary }}
                numberOfLines={1}
              />
            </View>
            {shouldShowVerifiedBadgeOnProfile(post.userId as any) && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={VERIFIED_BADGE_ICON_COLOR}
                style={styles.verifiedIcon}
              />
            )}
            {post.userId?.plan?.type && typeof post.userId.plan.type === 'string' && post.userId.plan.type !== 'FREE' && (
              <View style={[
                { flexShrink: 0 },
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
        <View style={styles.headerActions}>
          <View style={styles.metaChip} accessibilityLabel={`Visibilidade: ${visibilityOption.label}`}>
            <Ionicons name={visibilityOption.icon} size={13} color={colors.text.secondary} />
          </View>
          {category ? (
            <View
              style={[styles.metaChip, isAdultCategory && styles.metaChipAdult]}
              accessibilityLabel={`Categoria: ${category.name}`}
            >
              <Ionicons
                name={category.icon as React.ComponentProps<typeof Ionicons>['name']}
                size={13}
                color={isAdultCategory ? ADULT_CATEGORY_COLOR : colors.text.secondary}
              />
            </View>
          ) : null}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleMenuPress();
            }}
            style={styles.menuButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Opções do post"
          >
            <Ionicons name="ellipsis-vertical" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content (Comentário do compartilhamento ou conteúdo do post normal) */}
      {(post.originalPostId ? post.shareComment : post.content) && (
        <PostDoubleTapLike onLike={handleDoubleTapLike}>
          <RichPostText
            text={(post.originalPostId ? post.shareComment : post.content) || ''}
            style={styles.content}
            color={colors.text.primary}
          />
        </PostDoubleTapLike>
      )}

      {/* Post original (compartilhamento) — respeita permissão como no web */}
      {post.originalPostId && typeof post.originalPostId === 'object' ? (
        post.canViewOriginalPost === false ? (
          <View style={styles.originalPostRestricted}>
            <Text style={styles.originalPostRestrictedText}>
              {post.originalPostVisibilityMessage ||
                'Você não tem permissão para ver este post.'}
            </Text>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.95} onPress={handleOriginalPostPress}>
            {renderOriginalPost(post.originalPostId as Post)}
          </TouchableOpacity>
        )
      ) : null}

      {/* Link do perfil anexado (apenas posts normais) */}
      {!post.originalPostId && post.linkId && typeof post.linkId === 'object' && post.linkId.url ? (
        <LinkPreviewCard preview={postLinkToPreview(post.linkId)} confirmBeforeNavigate />
      ) : null}

      {/* Preview automático do 1º link do texto */}
      {!post.originalPostId && !post.linkId && (autoLinkPreviewLoading || autoLinkPreview) ? (
        autoLinkPreviewLoading || !autoLinkPreview ? (
          <LinkPreviewCard preview={{} as LinkPreviewData} loading />
        ) : (
          <LinkPreviewCard preview={autoLinkPreview} confirmBeforeNavigate />
        )
      ) : null}

      {/* Image (apenas para posts normais) */}
      {!post.originalPostId && post.imageUrl && (
        <PostDoubleTapLike onLike={handleDoubleTapLike} onSingleTap={handleImagePress}>
          <Image
            source={{ uri: getAvatarUrl(post.imageUrl) }}
            style={styles.postImage}
            resizeMode="cover"
          />
        </PostDoubleTapLike>
      )}

      {/* Contadores + ações (web: PostEngagementStats + PostActionBar) */}
      <View style={styles.footerSection}>
        {hasEngagementStats ? (
          <View style={styles.statsRow}>
            {totalReactions > 0 ? (
              <View style={styles.statItem}>
                <View style={styles.statEmojis}>
                  {reactionEmojis.map((emoji, i) => (
                    <Text key={`${emoji}-${i}`} style={[styles.statEmoji, i > 0 && styles.statEmojiOverlap]}>
                      {emoji}
                    </Text>
                  ))}
                </View>
                <Text style={styles.statText}>{totalReactions}</Text>
              </View>
            ) : (
              <View />
            )}
            <View style={styles.statsRight}>
              {commentsCount > 0 ? (
                <TouchableOpacity style={styles.statItem} onPress={handleCommentPress} activeOpacity={0.7}>
                  <Ionicons name="chatbubble-outline" size={14} color={colors.text.secondary} />
                  <Text style={styles.statText}>{commentsCount}</Text>
                </TouchableOpacity>
              ) : null}
              {viewsCount > 0 ? (
                <View style={styles.statItem}>
                  <Ionicons name="eye-outline" size={14} color={colors.text.secondary} />
                  <Text style={styles.statText}>{viewsCount}</Text>
                </View>
              ) : null}
              {sharesCount > 0 ? (
                <View style={styles.statItem}>
                  <Ionicons name="share-social-outline" size={14} color={colors.text.secondary} />
                  <Text style={styles.statText}>{sharesCount}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <View style={[styles.actionSlot, styles.reactionContainer]}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowReactions(!showReactions)}
              onLongPress={() => setShowReactions(true)}
              activeOpacity={0.7}
            >
              {post.userReaction && REACTIONS[post.userReaction] ? (
                <Text style={styles.actionEmoji}>{REACTIONS[post.userReaction]}</Text>
              ) : (
                <Ionicons name="thumbs-up-outline" size={19} color={colors.text.secondary} />
              )}
              <Text style={[styles.actionText, post.userReaction && styles.actionTextActive]}>
                {post.userReaction ? REACTION_LABELS[post.userReaction] : REACTION_LABELS.LIKE}
              </Text>
            </TouchableOpacity>

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

          <View style={styles.actionSlot}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCommentPress} activeOpacity={0.7}>
              <Ionicons name="chatbubble-outline" size={19} color={colors.text.secondary} />
              <Text style={styles.actionText}>Comentar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionSlot}>
            <PlanLocker requiredPlan={shareRequiredPlan} currentPlan={currentPlan} variant="compact">
              <TouchableOpacity style={styles.actionButton} onPress={handleSharePress} activeOpacity={0.7}>
                <Ionicons name="share-social-outline" size={19} color={colors.text.secondary} />
                <Text style={styles.actionText}>Compartilhar</Text>
              </TouchableOpacity>
            </PlanLocker>
          </View>
        </View>
      </View>

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

      {/* Image Viewer */}
      {post.imageUrl && (
        <ImageViewing
          images={[{ uri: getAvatarUrl(post.imageUrl) }]}
          imageIndex={0}
          visible={showImageViewer}
          onRequestClose={() => setShowImageViewer(false)}
          presentationStyle="overFullScreen"
          doubleTapToZoomEnabled
          swipeToCloseEnabled
        />
      )}

      {/* Post Original Modal */}
      {originalPostId && (
        <PostModal
          postId={originalPostId}
          visible={showOriginalPostModal}
          onClose={() => {
            setShowOriginalPostModal(false);
            setOriginalPostId(null);
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
            {isOwnPost ? (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={handleEditPress}>
                  <Ionicons name="create-outline" size={22} color={colors.text.primary} />
                  <Text style={styles.menuItemText}>Editar</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemDanger]}
                  onPress={handleDeletePress}
                >
                  <Ionicons name="trash-outline" size={22} color={colors.states.error} />
                  <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Deletar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.menuItem} onPress={handleReportPress}>
                <Ionicons name="flag-outline" size={22} color={colors.text.primary} />
                <Text style={styles.menuItemText}>Denunciar</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  card: {
    backgroundColor: c.background.paper,
    borderRadius: SURFACE_RADIUS,
    borderWidth: 1,
    borderColor: c.divider,
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
  avatarRing: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
    flexShrink: 0,
  },
  metaChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border.light,
    backgroundColor: c.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaChipAdult: {
    borderColor: `${ADULT_CATEGORY_COLOR}66`,
  },
  originalLinkWrap: {
    marginTop: 8,
  },
  avatarPlaceholder: {
    backgroundColor: c.secondary.main,
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
    minWidth: 0,
  },
  menuButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  headerTitleTouchable: {
    flex: 1,
    minWidth: 0,
  },
  /**
   * Não usar flex:1 aqui: em row isso dá largura total ao View e o MaskedView herda a barra inteira.
   * flexShrink:1 + minWidth:0 permite truncar nome longo; o gradiente fica só na largura do texto.
   */
  authorNameShrink: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
  },
  verifiedIcon: {
    flexShrink: 0,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: c.text.primary,
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
    color: c.text.secondary,
    marginTop: 2,
  },
  content: {
    fontSize: 15,
    color: c.text.primary,
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: c.background.tertiary,
    marginBottom: 12,
  },
  footerSection: {
    borderTopWidth: 1,
    borderTopColor: c.divider,
    paddingTop: 8,
    gap: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 24,
  },
  statsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statEmojis: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 14,
  },
  statEmojiOverlap: {
    marginLeft: -3,
  },
  statText: {
    fontSize: 13,
    color: c.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionSlot: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  reactionContainer: {
    position: 'relative',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 8,
  },
  actionEmoji: {
    fontSize: 18,
  },
  actionText: {
    fontSize: 13,
    color: c.text.secondary,
    fontWeight: '500',
  },
  actionTextActive: {
    color: c.secondary.light,
  },
  reactionsMenu: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    flexDirection: 'row',
    backgroundColor: c.background.paper,
    borderWidth: 1,
    borderColor: c.divider,
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
  // Menu Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: c.background.paper,
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
    color: c.text.primary,
    fontWeight: '500',
  },
  menuItemDanger: {
    // Sem estilo especial de fundo
  },
  menuItemTextDanger: {
    color: c.states.error,
  },
  menuDivider: {
    height: 1,
    backgroundColor: c.border.light,
    marginVertical: 4,
  },
  // Original Post Styles
  originalPostContainer: {
    borderWidth: 1,
    borderColor: c.border.light,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: c.background.tertiary + '40', // 40% opacity
  },
  originalPostRestricted: {
    borderWidth: 1,
    borderColor: c.border.light,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: c.background.tertiary,
    alignItems: 'center',
  },
  originalPostRestrictedText: {
    fontSize: 14,
    color: c.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
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
    color: c.text.primary,
  },
  originalContent: {
    fontSize: 14,
    color: c.text.secondary,
    lineHeight: 20,
  },
});

