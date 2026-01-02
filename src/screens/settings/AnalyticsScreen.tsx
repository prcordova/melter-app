import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import { BackButton } from '../../components/BackButton';
import { postsApi } from '../../services/api';
import { COLORS } from '../../theme/colors';
import { showToast } from '../../components/CustomToast';
import { getImageUrl } from '../../utils/image';
import { PostAnalyticsCard } from '../../components/analytics/PostAnalyticsCard';

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

interface AnalyticsData {
  posts: PostAnalytics[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    totalPosts: number;
    totalViews: number;
    totalUniqueViews: number;
    totalEngagement: number;
    totalNewFollowers: number;
    avgEngagementRate: number;
  };
}

type SortFilter = 'recent' | 'most-viewed' | 'most-engagement' | 'most-comments' | 'most-reactions';

export function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortFilter>('recent');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await postsApi.getAnalytics(page, 10, sortBy);
      
      if (response.success && response.data) {
        setAnalytics(response.data);
      } else {
        showToast.error('Erro', response.message || 'Não foi possível carregar as análises');
      }
    } catch (error: any) {
      console.error('Erro ao buscar analytics:', error);
      showToast.error('Erro', 'Não foi possível carregar as análises');
    } finally {
      setLoading(false);
    }
  }, [page, sortBy]);

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [fetchAnalytics])
  );

  const handleSortChange = (value: SortFilter) => {
    setSortBy(value);
    setPage(1); // Reset para primeira página
  };

  const handlePromotePost = (postId: string) => {
    // TODO: Abrir modal de promoção
    showToast.info('Em breve', `Promover post ${postId} - Em breve!`);
  };


  const renderSummaryCard = () => {
    if (!analytics) return null;

    return (
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <Text style={styles.summaryTitle}>📊 Resumo Geral</Text>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{analytics.summary.totalPosts}</Text>
            <Text style={styles.summaryLabel}>Total de Posts</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {analytics.summary.totalViews.toLocaleString()}
            </Text>
            <Text style={styles.summaryLabel}>Visualizações</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{analytics.summary.totalEngagement}</Text>
            <Text style={styles.summaryLabel}>Engajamento</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{analytics.summary.totalNewFollowers}</Text>
            <Text style={styles.summaryLabel}>Novos Seguidores</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {analytics.summary.avgEngagementRate.toFixed(1)}%
            </Text>
            <Text style={styles.summaryLabel}>Taxa Média</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderPostCard = ({ item: post }: { item: PostAnalytics }) => {
    return (
      <PostAnalyticsCard 
        post={post} 
        onPromote={handlePromotePost}
      />
    );
  };

  const renderPagination = () => {
    if (!analytics || analytics.pagination.pages <= 1) return null;

    return (
      <View style={styles.pagination}>
        {Array.from({ length: analytics.pagination.pages }, (_, i) => i + 1).map((pageNum) => (
          <TouchableOpacity
            key={pageNum}
            style={[
              styles.paginationChip,
              page === pageNum && styles.paginationChipActive
            ]}
            onPress={() => setPage(pageNum)}
          >
            <Text style={[
              styles.paginationChipText,
              page === pageNum && styles.paginationChipTextActive
            ]}>
              {pageNum}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading && !analytics) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.secondary.main} />
          <Text style={styles.loadingText}>Carregando análises...</Text>
        </View>
      </View>
    );
  }

  if (!analytics || analytics.posts.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Nenhum post encontrado</Text>
          <Text style={styles.emptySubtitle}>
            Crie seu primeiro post para ver as análises aqui
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton title="Configurações" />
        <Text style={styles.headerTitle}>📊 Análises</Text>
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Resumo Geral */}
        {renderSummaryCard()}

        {/* Filtros e Título */}
        <View style={styles.filtersContainer}>
          <Text style={styles.postsTitle}>Posts</Text>
          
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={sortBy}
              onValueChange={(value) => handleSortChange(value as SortFilter)}
              style={styles.picker}
              dropdownIconColor={COLORS.text.secondary}
            >
              <Picker.Item label="Mais Recentes" value="recent" />
              <Picker.Item label="Mais Visualizados" value="most-viewed" />
              <Picker.Item label="Mais Engajamento" value="most-engagement" />
              <Picker.Item label="Mais Comentários" value="most-comments" />
              <Picker.Item label="Mais Reações" value="most-reactions" />
            </Picker>
          </View>
        </View>

        {/* Lista de Posts */}
        <FlatList
          data={analytics.posts}
          renderItem={renderPostCard}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          contentContainerStyle={styles.postsList}
        />

        {/* Paginação */}
        {renderPagination()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryItem: {
    width: '19%',
    minWidth: 60,
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  postsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  pickerWrapper: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    minWidth: 180,
    height: 48,
    justifyContent: 'center',
  },
  picker: {
    color: COLORS.text.primary,
    height: 48,
    paddingVertical: 0,
    marginVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  postsList: {
    gap: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  paginationChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  paginationChipActive: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  paginationChipText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  paginationChipTextActive: {
    color: '#ffffff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
});

