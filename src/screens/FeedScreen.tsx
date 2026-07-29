import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute, useScrollToTop } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { CreatePostModal } from '../components/CreatePostModal';
import { PostModal } from '../components/PostModal';
import { StoriesCarousel } from '../components/StoriesCarousel';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { StoryCreateModal } from '../components/StoryCreateModal';
import { PostCard } from '../components/PostCard';
import { AdCard } from '../components/AdCard';
import { PlatformFeedInfoSlot } from '../components/PlatformFeedInfoSlot';
import { postsApi, storiesApi, adsApi, platformFeedInfoApi } from '../services/api';
import { getAdminSessionToken } from '../lib/admin-session';
import { Post, StoriesGroup, Ad, ReactionType } from '../types/feed';
import type { PlatformFeedInfoItem } from '../types/platform-feed-info';
import {
  loadDismissedPlatformFeedInfoIds,
  persistDismissedPlatformFeedInfoIds,
} from '../lib/platform-feed-info-dismiss';
import { normalizeReactionsCount, applyOptimisticReaction } from '../utils/post-reactions';
import { showToast } from '../components/CustomToast';
import { DevScreenErrorBoundary } from '../components/DevScreenErrorBoundary';
import { PlanLocker } from '../components/PlanLocker';
import { resolveUserPlanType } from '../config/plan-features';

export function FeedScreen() {
  const { user, refreshUser } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const listRef = useRef<FlatList<Post>>(null);
  useScrollToTop(listRef);

  // Estados
  const [posts, setPosts] = useState<Post[]>([]);
  const [storiesGroups, setStoriesGroups] = useState<StoriesGroup[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [adIndices, setAdIndices] = useState<{ [key: number]: number }>({});
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [showStoryCreate, setShowStoryCreate] = useState(false);
  const [selectedStoryGroupIndex, setSelectedStoryGroupIndex] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [platformFeedRaw, setPlatformFeedRaw] = useState<PlatformFeedInfoItem[]>([]);
  const [dismissedPlatformIds, setDismissedPlatformIds] = useState<Set<string>>(new Set());

  const platformFeedItems = useMemo(
    () => platformFeedRaw.filter((i) => !dismissedPlatformIds.has(i.id)),
    [platformFeedRaw, dismissedPlatformIds]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ids = await loadDismissedPlatformFeedInfoIds();
      if (!cancelled) setDismissedPlatformIds(ids);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData();
  }, []);

  // Detectar postId dos parâmetros da rota (vindo de notificações)
  useEffect(() => {
    const postId = route.params?.postId;
    if (postId) {
      setSelectedPostId(postId);
      setShowPostModal(true);
      // Limpar parâmetro para não abrir novamente
      navigation.setParams({ postId: undefined });
    }
  }, [route.params?.postId]);

  const loadInitialData = async () => {
    try {
      if (!hasLoadedOnce) setLoading(true);
      await Promise.all([
        fetchPosts(1),
        fetchStories(),
        fetchAds(),
      ]);
      setHasLoadedOnce(true);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showToast.error('Erro', 'Não foi possível carregar o feed');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Posts
  const fetchPosts = async (pageNum = 1) => {
    try {
      if (pageNum > 1) {
        setLoadingMore(true);
      }

      const response = await postsApi.getPosts(pageNum, 20);

      if (response.success && response.data) {
        const newPosts = response.data.posts ?? [];

        // Filtrar posts inválidos
        const validPosts = newPosts
          .filter((p: Post) => {
            if (!p?._id || !p.userId || typeof p.userId !== 'object') return false;
            const uid = (p.userId as any)._id ?? (p.userId as any).id;
            if (!uid) return false;
            const u = p.userId.username;
            const fn = (p.userId as any).fullName;
            const hasLabel =
              (typeof u === 'string' && u.trim().length > 0) ||
              (typeof fn === 'string' && fn.trim().length > 0);
            return hasLabel;
          })
          .map((p: Post) => ({
            ...p,
            reactionsCount: normalizeReactionsCount(p.reactionsCount),
          }));

        if (pageNum === 1) {
          setPosts(validPosts);
        } else {
          // Evitar duplicatas
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p._id));
            const uniqueNewPosts = validPosts.filter(
              (p: Post) => !existingIds.has(p._id)
            );
            return [...prev, ...uniqueNewPosts];
          });
        }

        setHasMore(response.data.hasMore);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Erro ao buscar posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Fetch Stories
  const fetchStories = async () => {
    try {
      // Usar endpoint de feed que retorna stories já agrupados
      const response = await storiesApi.getStoriesFeed(1, 20);

      if (response.success) {
        // O endpoint retorna data.stories (já agrupados)
        const storiesData = response.data?.stories || response.data?.data?.stories || [];
        
        // Filtrar e ordenar grupos válidos
        const sortedStories = Array.isArray(storiesData)
          ? storiesData
              .filter(
                (group: any) =>
                  group &&
                  group.user &&
                  group.user._id &&
                  Array.isArray(group.stories) &&
                  group.stories.length > 0
              )
              .sort((a: any, b: any) => {
                // Stories do próprio usuário primeiro
                if (a?.user?._id === user?.id) return -1;
                if (b?.user?._id === user?.id) return 1;
                return 0;
              })
          : [];

        setStoriesGroups(sortedStories);
      }
    } catch (error) {
      console.error('Erro ao buscar stories:', error);
    }
  };

  const fetchPlatformFeedInfo = useCallback(async () => {
    if (!user?.id) {
      setPlatformFeedRaw([]);
      return;
    }
    try {
      const response = await platformFeedInfoApi.getItems();
      if (response.success && response.data?.items) {
        setPlatformFeedRaw(response.data.items);
      } else {
        setPlatformFeedRaw([]);
      }
    } catch (error) {
      console.error('[FEED] Erro ao buscar dicas da plataforma:', error);
      setPlatformFeedRaw([]);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchPlatformFeedInfo();
  }, [fetchPlatformFeedInfo]);

  const dismissPlatformInfo = (id: string) => {
    setDismissedPlatformIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      void persistDismissedPlatformFeedInfoIds(next);
      return next;
    });
  };

  // Fetch Ads
  const fetchAds = async () => {
    try {
      const response = await adsApi.getAds(true, 10);

      if (response.success && response.data) {
        // Randomizar ordem
        const shuffled = [...response.data].sort(() => Math.random() - 0.5);
        setAds(shuffled);
        setAdIndices({});
      }
    } catch (error) {
      console.error('[FEED] ❌ Erro ao buscar anúncios:', error);
    }
  };

  // Pull to Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    await fetchPlatformFeedInfo();
    setRefreshing(false);
  }, [fetchPlatformFeedInfo]);

  // Load More
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPosts(page + 1);
    }
  };

  // Handlers
  const handleReact = async (postId: string, reactionType: ReactionType) => {
    // Atualização otimista
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p._id !== postId) return p;

        const { userReaction, reactionsCount } = applyOptimisticReaction(
          p.userReaction,
          p.reactionsCount,
          reactionType
        );

        return {
          ...p,
          reactionsCount,
          userReaction,
        };
      })
    );

    try {
      await postsApi.reactToPost(postId, reactionType);
    } catch (error) {
      console.error('Erro ao reagir:', error);
      // Reverter em caso de erro
      fetchPosts(1);
    }
  };

  const handleComment = (postId: string) => {
    // Comentários são gerenciados pelo PostCard internamente via modal
  };

  const handleShare = (postId: string) => {
    // Compartilhamento é gerenciado pelo PostCard internamente via modal
    // Este handler é chamado após o compartilhamento ser concluído
    fetchPosts(1); // Recarregar feed
  };

  const handleDelete = async (postId: string) => {
    try {
      const post = posts.find((p) => p._id === postId);
      const authorId =
        post?.userId && typeof post.userId === 'object' ? (post.userId as { _id?: string })._id : undefined;
      const isOtherAuthor =
        Boolean(user?.id && authorId && String(authorId) !== String(user.id));
      const needsAdminSession = user?.accountType === 'admin' && isOtherAuthor;
      let adminTok: string | null = null;
      if (needsAdminSession) {
        adminTok = await getAdminSessionToken();
        if (!adminTok) {
          showToast.error(
            'Sessão admin',
            'Confirme a senha de administrador no detalhe do post (⋯) antes de eliminar posts de outros utilizadores.'
          );
          return;
        }
      }

      setPosts((prevPosts) => prevPosts.filter((p) => p._id !== postId));

      await postsApi.deletePost(
        postId,
        needsAdminSession && adminTok ? { adminSessionToken: adminTok } : undefined
      );
      showToast.success('Sucesso', 'Post deletado com sucesso');
    } catch (error) {
      console.error('Erro ao deletar post:', error);
      showToast.error('Erro', 'Não foi possível deletar o post');
      fetchPosts(1);
    }
  };

  const handleStoryClick = (group: StoriesGroup) => {
    if (!group || !group.user || !group.user._id) return;
    const index = storiesGroups.findIndex(g => g?.user?._id === group.user._id);
    if (index !== -1) {
      setSelectedStoryGroupIndex(index);
      setShowStoryViewer(true);
    }
  };

  const handleCreateStory = () => {
    setShowStoryCreate(true);
  };

  const handleCreatePost = () => {
    setShowCreatePostModal(true);
  };

  const handlePostCreated = async () => {
    // Recarregar feed após criar post
    await fetchPosts(1);
  };

  const handleWalletPress = () => {
    showToast.info('Carteira', 'Funcionalidade de carteira será implementada');
  };

  const handleAdView = useCallback(async (adId: string) => {
    try {
      await adsApi.viewAd(adId);
    } catch {
      // métrica opcional — não bloquear feed
    }
  }, []);

  const handleAdClick = useCallback(async (adId: string) => {
    try {
      await adsApi.clickAd(adId);
    } catch {
      // métrica opcional
    }
  }, []);

  const handleNextAd = useCallback((adPosition: number) => {
    setAdIndices((prev) => {
      if (ads.length <= 1) return prev;
      const currentIndex = prev[adPosition] ?? 0;
      const nextIndex = (currentIndex + 1) % ads.length;
      return { ...prev, [adPosition]: nextIndex };
    });
  }, [ads.length]);

  const handlePlatformAfterFollow = useCallback(() => {
    void refreshUser();
    void fetchPlatformFeedInfo();
  }, [refreshUser, fetchPlatformFeedInfo]);

  const renderItem = useCallback(
    ({ item, index }: { item: Post; index: number }) => {
      if (!item?._id || !item.userId || typeof item.userId !== 'object' || !item.userId._id) {
        return null;
      }

      const adPosition = Math.floor((index + 1) / 2);
      const showAd = ads.length > 0 && (index + 1) % 2 === 0;
      const currentAd = showAd
        ? ads[(adIndices[adPosition] ?? 0) % ads.length]
        : null;

      return (
        <View>
          <PostCard
            post={item}
            onReact={handleReact}
            onComment={handleComment}
            onShare={handleShare}
            onDelete={handleDelete}
          />

          {showAd && currentAd?._id ? (
            <AdCard
              key={`ad-${adPosition}-${currentAd._id}`}
              ad={currentAd}
              onView={handleAdView}
              onClick={handleAdClick}
              onSkip={ads.length > 1 ? () => handleNextAd(adPosition) : undefined}
              onVideoEnd={ads.length > 1 ? () => handleNextAd(adPosition) : undefined}
            />
          ) : null}

          {platformFeedItems.length > 0 &&
          ((index + 1) % 5 === 0 || index === posts.length - 1) ? (
            <View style={{ marginVertical: 8 }}>
              <PlatformFeedInfoSlot
                items={platformFeedItems}
                onDismiss={dismissPlatformInfo}
                onAfterFollow={handlePlatformAfterFollow}
              />
            </View>
          ) : null}
        </View>
      );
    },
    [
      ads,
      adIndices,
      posts.length,
      platformFeedItems,
      dismissPlatformInfo,
      handlePlatformAfterFollow,
      handleAdView,
      handleAdClick,
      handleNextAd,
      handleReact,
      handleComment,
      handleShare,
      handleDelete,
    ]
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.header}>
        <StoriesCarousel
          storiesGroups={storiesGroups}
          onStoryClick={handleStoryClick}
          onCreateStory={handleCreateStory}
        />
        <View style={styles.createPostContainer}>
          <PlanLocker
            requiredPlan="LITE"
            currentPlan={resolveUserPlanType(user?.plan?.type)}
          >
            <Button onPress={handleCreatePost} style={styles.createPostButton}>
              Criar Post
            </Button>
          </PlanLocker>
        </View>
      </View>
    ),
    [storiesGroups, handleStoryClick, handleCreateStory]
  );

  // Footer Component
  const ListFooterComponent = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator 
          size="small" 
          color="#d946ef"
          animating={true}
        />
      </View>
    );
  };

  // Empty Component
  const ListEmptyComponent = () => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Nenhum post no feed ainda.
        </Text>
        <Text style={styles.emptySubtext}>
          Comece seguindo pessoas ou criando seu primeiro post!
        </Text>
      </View>
    );
  };

  // Loading inicial
  if (loading) {
    return (
      <View style={styles.feedSkeletonContainer}>
        <View style={styles.feedSkeletonHeader} />
        <View style={styles.feedSkeletonStories} />
        <View style={styles.feedSkeletonCreate} />
        <View style={styles.feedSkeletonPost} />
        <View style={styles.feedSkeletonPost} />
      </View>
    );
  }

         return (
           <DevScreenErrorBoundary screenName="Feed">
           <View style={styles.container}>
             <Header
               onLogoPress={() => {
                 onRefresh();
               }}
             />

      <FlatList
        ref={listRef}
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={listHeader}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews
        windowSize={7}
        maxToRenderPerBatch={6}
        initialNumToRender={5}
        updateCellsBatchingPeriod={50}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            colors={['#d946ef']}
            tintColor="#d946ef"
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal Criar Post */}
      <CreatePostModal
        visible={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Modal Post Referência */}
      <PostModal
        postId={selectedPostId}
        visible={showPostModal}
        onClose={() => {
          setShowPostModal(false);
          setSelectedPostId(null);
        }}
        onPostDeleted={() => {
          fetchPosts(1);
        }}
        onPostShared={() => {
          fetchPosts(1);
        }}
      />

      <StoryViewerModal
        visible={showStoryViewer}
        onClose={() => setShowStoryViewer(false)}
        storiesGroups={storiesGroups}
        initialGroupIndex={selectedStoryGroupIndex}
        onStoryViewed={() => {
          // Opcional: Atualizar lista de stories para mostrar como visualizado
        }}
      />

      <StoryCreateModal
        visible={showStoryCreate}
        onClose={() => setShowStoryCreate(false)}
        onStoryCreated={() => {
          fetchStories();
        }}
      />
    </View>
    </DevScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    marginBottom: 8,
  },
  createPostContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  createPostButton: {
    minWidth: 200,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  feedSkeletonContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 12,
  },
  feedSkeletonHeader: {
    height: 72,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  feedSkeletonStories: {
    height: 90,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  feedSkeletonCreate: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#d1d5db',
  },
  feedSkeletonPost: {
    height: 260,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
  },
});
