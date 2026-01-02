import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { CreatePostModal } from '../components/CreatePostModal';
import { PostModal } from '../components/PostModal';
import { StoriesCarousel } from '../components/StoriesCarousel';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { StoryCreateModal } from '../components/StoryCreateModal';
import { PostCard } from '../components/PostCard';
import { AdCard } from '../components/AdCard';
import { postsApi, storiesApi, adsApi } from '../services/api';
import { Post, StoriesGroup, Ad, ReactionType } from '../types/feed';
import { showToast } from '../components/CustomToast';

export function FeedScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

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
      setLoading(true);
      await Promise.all([
        fetchPosts(1),
        fetchStories(),
        fetchAds(),
      ]);
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

      if (response.success) {
        const newPosts = response.data.posts || [];

        // Filtrar posts inválidos
        const validPosts = newPosts.filter((p: Post) => {
          return p && 
                 p._id && 
                 p.userId && 
                 typeof p.userId === 'object' && 
                 p.userId._id &&
                 (p.userId.username || typeof p.userId.username === 'string');
        });

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
              .filter((group: any) => group && group.user && group.user._id) // Filtrar grupos inválidos
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

  // Fetch Ads
  const fetchAds = async () => {
    try {
      console.log('[FEED] Buscando anúncios...');
      const response = await adsApi.getAds(true, 10);
      console.log('[FEED] Resposta de anúncios:', response);

      if (response.success && response.data) {
        console.log('[FEED] ✅ Anúncios encontrados:', response.data.length);
        // Randomizar ordem
        const shuffled = [...response.data].sort(() => Math.random() - 0.5);
        setAds(shuffled);
        setAdIndices({});
      } else {
        console.log('[FEED] ⚠️ Nenhum anúncio retornado');
      }
    } catch (error) {
      console.error('[FEED] ❌ Erro ao buscar anúncios:', error);
    }
  };

  // Pull to Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, []);

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

        const prevReaction = p.userReaction;
        const prevCounts = p.reactionsCount;
        const newCounts = { ...prevCounts };
        let newReaction: ReactionType | null = prevReaction;

        if (prevReaction === reactionType) {
          // Remover reação
          newReaction = null;
          if (newCounts[reactionType] > 0) {
            newCounts[reactionType] -= 1;
          }
          if (newCounts.total > 0) {
            newCounts.total -= 1;
          }
        } else if (prevReaction === null) {
          // Adicionar reação
          newReaction = reactionType;
          newCounts[reactionType] += 1;
          newCounts.total += 1;
        } else {
          // Trocar reação
          if (newCounts[prevReaction] > 0) {
            newCounts[prevReaction] -= 1;
          }
          newCounts[reactionType] += 1;
          newReaction = reactionType;
        }

        return {
          ...p,
          reactionsCount: newCounts,
          userReaction: newReaction,
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
      // Atualização otimista
      setPosts((prevPosts) => prevPosts.filter((p) => p._id !== postId));

      await postsApi.deletePost(postId);
      showToast.success('Sucesso', 'Post deletado com sucesso');
    } catch (error) {
      console.error('Erro ao deletar post:', error);
      showToast.error('Erro', 'Não foi possível deletar o post');
      // Reverter em caso de erro
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

  const handleAdView = async (adId: string) => {
    try {
      await adsApi.viewAd(adId);
    } catch (error) {
      // Ignorar erros silenciosamente
    }
  };

  const handleAdClick = async (adId: string) => {
    try {
      await adsApi.clickAd(adId);
    } catch (error) {
      // Ignorar erros silenciosamente
    }
  };

  const handleNextAd = (adPosition: number) => {
    if (ads.length > 1) {
      const currentIndex = adIndices[adPosition] ?? 0;
      const nextIndex = (currentIndex + 1) % ads.length;
      setAdIndices((prev) => ({
        ...prev,
        [adPosition]: nextIndex,
      }));
    }
  };

  // Render Item
  const renderItem = ({ item, index }: { item: Post; index: number }) => {
    // Validação adicional antes de renderizar
    if (!item || !item._id || !item.userId || typeof item.userId !== 'object' || !item.userId._id) {
      return null;
    }

    return (
      <View>
        <PostCard
          post={item}
          onReact={handleReact}
          onComment={handleComment}
          onShare={handleShare}
          onDelete={handleDelete}
        />

        {/* Anúncio a cada 2 posts (mais frequente para garantir visibilidade) */}
        {ads.length > 0 && (index + 1) % 2 === 0 && (() => {
          const adPosition = Math.floor((index + 1) / 2);
          const currentIndex = adIndices[adPosition] ?? Math.floor(Math.random() * ads.length);
          const currentAd = ads[currentIndex % ads.length];

          return (
            <AdCard
              key={`ad-${adPosition}-${currentAd._id}`}
              ad={currentAd}
              onView={handleAdView}
              onClick={handleAdClick}
              onSkip={() => handleNextAd(adPosition)}
            />
          );
        })()}
      </View>
    );
  };

  // Header Component
  const ListHeaderComponent = () => (
    <View style={styles.header}>
      {/* Stories - sempre mostrar (tem botão criar) */}
      <StoriesCarousel
        storiesGroups={storiesGroups}
        onStoryClick={handleStoryClick}
        onCreateStory={handleCreateStory}
      />

      {/* Botão Criar Post */}
      <View style={styles.createPostContainer}>
        <Button onPress={handleCreatePost} style={styles.createPostButton}>
          Criar Post
        </Button>
      </View>
    </View>
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator 
          size="large" 
          color="#d946ef"
          animating={true}
        />
        <Text style={styles.loadingText}>Carregando feed...</Text>
      </View>
    );
  }

         return (
           <View style={styles.container}>
             {/* Header fixo */}
             <Header 
               onLogoPress={() => {
                 // Refresh ao clicar no logo
                 onRefresh();
               }}
             />

             {/* Lista de Posts */}
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
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
});
