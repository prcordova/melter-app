import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import { getImageUrl } from '../../utils/image';

interface PostAnalytics {
  _id: string;
  content: string;
  imageUrl?: string;
  visibility: string;
  createdAt: string;
  viewsCount: number;
  uniqueViewsCount: number;
  viewsLast24h: number;
  reactionsCount: number;
  commentsCount: number;
  sharesCount: number;
  totalEngagement: number;
  engagementRate: number;
  newFollowers: number;
  reach: number;
  hasPromotion: boolean;
  promotionProgress?: {
    status: string;
    budget: number;
    targetViews: number;
    achievedViews: number;
    percentage: number;
    remainingViews: number;
    startDate: string;
    endDate: string | null;
  };
}

interface PostAnalyticsCardProps {
  post: PostAnalytics;
  onPromote?: (postId: string) => void;
}

export function PostAnalyticsCard({ post, onPromote }: PostAnalyticsCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'PUBLIC':
        return { label: 'Público', icon: 'globe-outline' };
      case 'FRIENDS':
        return { label: 'Amigos', icon: 'people-outline' };
      case 'FOLLOWERS':
        return { label: 'Seguidores', icon: 'eye-outline' };
      default:
        return { label: visibility, icon: 'lock-closed-outline' };
    }
  };

  let imageSource: any = null;
  if (post.imageUrl) {
    if (post.imageUrl.startsWith('http') || post.imageUrl.startsWith('/assets')) {
      imageSource = { uri: post.imageUrl };
    } else {
      const imageUrl = getImageUrl(post.imageUrl);
      imageSource = imageUrl ? { uri: imageUrl } : null;
    }
  }

  const visibilityInfo = getVisibilityLabel(post.visibility);

  return (
    <View style={styles.card}>
      {/* Badge de Promoção */}
      {post.hasPromotion && (
        <View style={styles.promotionBadge}>
          <Ionicons name="megaphone-outline" size={12} color="#ffffff" />
          <Text style={styles.promotionBadgeText}>Promovido</Text>
        </View>
      )}

      {/* Header: Data e Visibilidade */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.text.secondary} />
          <Text style={styles.headerDate}>{formatDateTime(post.createdAt)}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.visibilityChip}>
            <Ionicons name={visibilityInfo.icon as any} size={14} color={COLORS.text.secondary} />
            <Text style={styles.visibilityText}>{visibilityInfo.label}</Text>
          </View>
          {post.reach > 0 && (
            <View style={styles.reachChip}>
              <Ionicons name="pulse-outline" size={14} color={COLORS.states.info} />
              <Text style={styles.reachText}>Alcance: {post.reach.toLocaleString()}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {/* Conteúdo do Post */}
        <View style={styles.postInfo}>
          {imageSource && (
            <Image source={imageSource} style={styles.postImage} />
          )}
          <View style={styles.postTextContainer}>
            <Text style={styles.postText} numberOfLines={3}>
              {post.content.length > 100 
                ? `${post.content.substring(0, 100)}...` 
                : post.content}
            </Text>
          </View>
        </View>

        {/* Métricas - 2 colunas */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <View style={[styles.metricIconContainer, { backgroundColor: COLORS.primary.main + '20' }]}>
                <Ionicons name="eye-outline" size={18} color={COLORS.primary.main} />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{post.viewsCount.toLocaleString()}</Text>
                <Text style={styles.metricLabel}>Visualizações</Text>
              </View>
            </View>

            <View style={styles.metricItem}>
              <View style={[styles.metricIconContainer, { backgroundColor: COLORS.states.info + '20' }]}>
                <Ionicons name="chatbubble-outline" size={18} color={COLORS.states.info} />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{post.commentsCount.toLocaleString()}</Text>
                <Text style={styles.metricLabel}>Comentários</Text>
              </View>
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <View style={[styles.metricIconContainer, { backgroundColor: COLORS.states.success + '20' }]}>
                <Ionicons name="person-add-outline" size={18} color={COLORS.states.success} />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{post.newFollowers.toLocaleString()}</Text>
                <Text style={styles.metricLabel}>Novos Seguidores</Text>
              </View>
            </View>

            <View style={styles.metricItem}>
              <View style={[styles.metricIconContainer, { backgroundColor: COLORS.states.warning + '20' }]}>
                <Ionicons name="trending-up-outline" size={18} color={COLORS.states.warning} />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>
                  {post.engagementRate.toFixed(1)}%
                </Text>
                <Text style={styles.metricLabel}>Engajamento</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Progresso de Promoção ou Botão Promover */}
        <View style={styles.promotionSection}>
          {post.hasPromotion && post.promotionProgress ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progresso da Promoção</Text>
                <Text style={styles.progressText}>
                  {post.promotionProgress.achievedViews.toLocaleString()} / {post.promotionProgress.targetViews.toLocaleString()} visualizações
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${post.promotionProgress.percentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressFooter}>
                {post.promotionProgress.remainingViews.toLocaleString()} visualizações restantes • 
                Orçamento: R$ {post.promotionProgress.budget.toFixed(2)}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.promoteButton}
              onPress={() => onPromote?.(post._id)}
              activeOpacity={0.7}
            >
              <Ionicons name="rocket-outline" size={18} color={COLORS.states.warning} />
              <Text style={styles.promoteButtonText}>🚀 Promover</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    position: 'relative',
  },
  promotionBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: COLORS.states.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 1,
  },
  promotionBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  visibilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.background.tertiary,
  },
  visibilityText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  reachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.states.info + '15',
  },
  reachText: {
    fontSize: 12,
    color: COLORS.states.info,
    fontWeight: '500',
  },
  content: {
    gap: 16,
  },
  postInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  postImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
  },
  postTextContainer: {
    flex: 1,
  },
  postText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  metricsContainer: {
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.background.tertiary,
    padding: 12,
    borderRadius: 8,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  promotionSection: {
    marginTop: 4,
  },
  progressContainer: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.border.light,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.secondary.main,
    borderRadius: 4,
  },
  progressFooter: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.states.warning,
    gap: 8,
  },
  promoteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.states.warning,
  },
});

