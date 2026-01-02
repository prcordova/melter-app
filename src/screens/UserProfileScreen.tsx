import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ImageBackground,
  Dimensions,
  Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Header } from '../components/Header';
import { PostCard } from '../components/PostCard';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { userApi, postsApi, storiesApi } from '../services/api';
import { COLORS } from '../theme/colors';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { useAuth } from '../contexts/AuthContext';
import { StoriesGroup } from '../types/feed';

const { width } = Dimensions.get('window');

type UserProfileRouteParams = {
  username: string;
};

type UserProfileRouteProp = RouteProp<{ UserProfile: UserProfileRouteParams }, 'UserProfile'>;

import { Avatar } from '../components/Avatar';

export function UserProfileScreen() {
  const route = useRoute<UserProfileRouteProp>();
  const navigation = useNavigation<any>();
  const { user: currentUser } = useAuth();
  const { username } = route.params;

  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<string>('NONE');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [friendshipLoading, setFriendshipLoading] = useState(false);
  const [userStories, setUserStories] = useState<StoriesGroup | null>(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await userApi.getUserProfile(username);

      if (response.success) {
        // Validar e normalizar dados do perfil antes de definir o estado
        const userData = response.data;
        if (userData.profile) {
          // Função auxiliar para validar cor hexadecimal, RGB, RGBA ou nome de cor
          const isValidColor = (color: any): boolean => {
            if (!color || typeof color !== 'string') return false;
            const trimmed = color.trim();
            // Hex color (#fff, #ffffff)
            if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(trimmed)) return true;
            // RGB/RGBA (rgb(255,255,255) ou rgba(255,255,255,0.5))
            if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(trimmed)) return true;
            // Nomes de cores CSS básicos (opcional, mas pode ser útil)
            const cssColorNames = ['transparent', 'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'gray', 'grey'];
            if (cssColorNames.includes(trimmed.toLowerCase())) return true;
            return false;
          };

          // Validar cores
          if (userData.profile.backgroundColor && !isValidColor(userData.profile.backgroundColor)) {
            userData.profile.backgroundColor = null;
          }
          if (userData.profile.textColor && !isValidColor(userData.profile.textColor)) {
            userData.profile.textColor = null;
          }
          if (userData.profile.cardColor && !isValidColor(userData.profile.cardColor)) {
            userData.profile.cardColor = null;
          }
          if (userData.profile.cardTextColor && !isValidColor(userData.profile.cardTextColor)) {
            userData.profile.cardTextColor = null;
          }
          if (userData.profile.buttonBackgroundColor && !isValidColor(userData.profile.buttonBackgroundColor)) {
            userData.profile.buttonBackgroundColor = null;
          }
          if (userData.profile.buttonTextColor && !isValidColor(userData.profile.buttonTextColor)) {
            userData.profile.buttonTextColor = null;
          }
          if (userData.profile.likesColor && !isValidColor(userData.profile.likesColor)) {
            userData.profile.likesColor = null;
          }

          // Garantir que backgroundOverlayOpacity seja um número válido
          if (userData.profile.backgroundOverlayOpacity !== undefined && userData.profile.backgroundOverlayOpacity !== null) {
            userData.profile.backgroundOverlayOpacity = Math.max(0, Math.min(100, Number(userData.profile.backgroundOverlayOpacity) || 50));
          }
          // Garantir que backgroundOverlay seja um booleano
          if (userData.profile.backgroundOverlay !== undefined && userData.profile.backgroundOverlay !== null) {
            userData.profile.backgroundOverlay = userData.profile.backgroundOverlay === true || userData.profile.backgroundOverlay === 'true';
          }
          // Garantir que backgroundImage seja uma string válida ou null
          if (userData.profile.backgroundImage !== undefined && userData.profile.backgroundImage !== null) {
            if (typeof userData.profile.backgroundImage !== 'string' || userData.profile.backgroundImage.trim() === '') {
              userData.profile.backgroundImage = null;
            }
          }
          // Garantir que cardStyle seja um valor válido
          if (userData.profile.cardStyle && !['rounded', 'square', 'pill'].includes(userData.profile.cardStyle)) {
            userData.profile.cardStyle = 'rounded';
          }
          // Garantir que displayMode seja um valor válido
          if (userData.profile.displayMode && !['list', 'grid'].includes(userData.profile.displayMode)) {
            userData.profile.displayMode = 'list';
          }
          // Garantir que gridAlignment seja um valor válido
          if (userData.profile.gridAlignment && !['left', 'center', 'right'].includes(userData.profile.gridAlignment)) {
            userData.profile.gridAlignment = 'center';
          }
        }
        setUser(userData);
        setLinks(userData.links || []);
        setIsFollowing(userData.isFollowing);
        setFriendshipStatus(userData.friendshipStatus || 'NONE');
        setFriendshipId(userData.friendshipId || null);
        
        // Buscar stories do usuário
        try {
          const targetUserId = userData._id || userData.id;
          if (targetUserId) {
            const storiesRes = await storiesApi.getStoriesByUser(targetUserId);
            if (storiesRes.success) {
              const storiesData = storiesRes.data || [];
              // Se retornar array de stories individuais, criar grupo
              if (Array.isArray(storiesData) && storiesData.length > 0) {
                const group: StoriesGroup = {
                  user: {
                    _id: targetUserId,
                    username: userData.username || username,
                    avatar: userData.avatar,
                  },
                  stories: storiesData.map((story: any) => ({
                    _id: story._id,
                    userId: {
                      _id: story.userId?._id || targetUserId,
                      username: story.userId?.username || userData.username || username,
                      avatar: story.userId?.avatar || userData.avatar,
                    },
                    content: story.content || { type: 'image', mediaUrl: '' },
                    duration: story.duration || 10,
                    views: story.views || [],
                    createdAt: story.createdAt || new Date().toISOString(),
                  })),
                };
                setUserStories(group);
              }
            }
          }
        } catch (e) {
          console.error('Erro ao buscar stories:', e);
        }

        // Se posts estiverem habilitados no perfil
        if (response.data.profile?.showPosts) {
          const postsRes = await postsApi.getUserPosts(username, 1, 10);
          if (postsRes.success) {
            const postsData = postsRes.data.posts || postsRes.data || [];
            // Filtrar posts inválidos (sem userId ou sem estrutura básica)
            const validPosts = postsData.filter((post: any) => 
              post && 
              post._id && 
              post.userId && 
              typeof post.userId === 'object' &&
              post.userId.username
            );
            setPosts(validPosts);
          }
        }
      }
    } catch (error) {
      console.error('[UserProfileScreen] Erro:', error);
      Alert.alert('Erro', 'Não foi possível carregar o perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [username]);

  // Recarregar dados ao focar na tela (garante status atualizado)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [username])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, [username]);

  const handleFollowAction = async () => {
    if (followLoading) return;
    try {
      setFollowLoading(true);
      if (isFollowing) {
        await userApi.unfollowUser(username);
        setIsFollowing(false);
      } else {
        await userApi.followUser(username);
        setIsFollowing(true);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível realizar esta ação');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleFriendshipAction = async () => {
    if (friendshipLoading) return;
    setFriendshipLoading(true);

    try {
      if (friendshipStatus === 'NONE') {
        const res = await userApi.sendFriendRequest(user.id || user._id);
        if (res.success) {
          setFriendshipStatus('PENDING_SENT');
          setFriendshipId(res.data?._id || res.data?.id);
          Alert.alert('Sucesso', 'Solicitação de amizade enviada');
        }
      } else if (friendshipStatus === 'PENDING_RECEIVED') {
        if (!friendshipId) return;
        const res = await userApi.acceptFriendRequest(friendshipId);
        if (res.success) {
          setFriendshipStatus('FRIENDS');
          Alert.alert('Sucesso', 'Agora vocês são amigos!');
        }
      } else if (friendshipStatus === 'PENDING_SENT') {
        if (!friendshipId) return;
        const res = await userApi.cancelFriendRequest(friendshipId);
        if (res.success) {
          setFriendshipStatus('NONE');
          setFriendshipId(null);
          Alert.alert('Sucesso', 'Solicitação cancelada');
        }
      } else if (friendshipStatus === 'FRIENDS') {
        Alert.alert(
          'Remover Amigo',
          `Tem certeza que deseja remover @${username} dos seus amigos?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Remover', 
              style: 'destructive',
              onPress: async () => {
                if (!friendshipId) return;
                const res = await userApi.removeFriend(friendshipId);
                if (res.success) {
                  setFriendshipStatus('NONE');
                  setFriendshipId(null);
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Erro na ação de amizade:', error);
      Alert.alert('Erro', 'Não foi possível completar a ação');
    } finally {
      setFriendshipLoading(false);
    }
  };

  const handleMessagePress = () => {
    if (friendshipStatus !== 'FRIENDS') {
      Alert.alert('Aviso', 'Você só pode enviar mensagens para seus amigos.');
      return;
    }
    navigation.navigate('MessagesStack', {
      screen: 'Chat',
      params: {
        userId: user.id || user._id,
        username: user.username,
        avatar: user.avatar,
      },
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.secondary.main} />
      </View>
    );
  }

  if (!user) return null;

  const profile = user.profile || {};
  const avatarSource = getAvatarUrl(user.avatar);
  
  // Função auxiliar para validar cor hexadecimal, RGB, RGBA ou nome de cor
  const isValidColor = (color: any): boolean => {
    if (!color || typeof color !== 'string') return false;
    const trimmed = color.trim();
    // Hex color (#fff, #ffffff)
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(trimmed)) return true;
    // RGB/RGBA (rgb(255,255,255) ou rgba(255,255,255,0.5))
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(trimmed)) return true;
    // Nomes de cores CSS básicos (opcional, mas pode ser útil)
    const cssColorNames = ['transparent', 'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'gray', 'grey'];
    if (cssColorNames.includes(trimmed.toLowerCase())) return true;
    return false;
  };

  // Função auxiliar para obter cor segura
  const getSafeColor = (color: any, fallback: string): string => {
    if (isValidColor(color)) return color;
    return fallback;
  };

  // Validar backgroundImage para garantir que seja uma string válida
  const bgImageSource = profile.backgroundImage && typeof profile.backgroundImage === 'string' && profile.backgroundImage.trim() !== ''
    ? { uri: profile.backgroundImage }
    : null;

  // Validar backgroundOverlayOpacity para garantir que seja um número válido entre 0 e 100
  const safeOverlayOpacity = profile.backgroundOverlayOpacity !== undefined && profile.backgroundOverlayOpacity !== null
    ? Math.max(0, Math.min(100, Number(profile.backgroundOverlayOpacity) || 50))
    : 50;
  
  // Validar backgroundOverlay para garantir que seja um booleano
  const hasOverlay = profile.backgroundOverlay === true || profile.backgroundOverlay === 'true';

  // Validar cardStyle para garantir que seja um valor válido
  const safeCardStyle = profile.cardStyle === 'rounded' || profile.cardStyle === 'square' || profile.cardStyle === 'pill'
    ? profile.cardStyle
    : 'rounded';

  // Estilos Dinâmicos baseados no perfil do usuário (com validações robustas)
  const dynamicStyles = {
    container: {
      backgroundColor: getSafeColor(profile.backgroundColor, COLORS.background.default),
    },
    text: {
      color: getSafeColor(profile.textColor, COLORS.text.primary),
    },
    card: {
      backgroundColor: getSafeColor(profile.cardColor, COLORS.background.paper),
      borderRadius: safeCardStyle === 'rounded' ? 16 : safeCardStyle === 'pill' ? 999 : 4,
    },
    cardText: {
      color: getSafeColor(profile.cardTextColor, COLORS.text.primary),
    },
    button: {
      backgroundColor: getSafeColor(profile.buttonBackgroundColor, COLORS.secondary.main),
    },
    buttonText: {
      color: getSafeColor(profile.buttonTextColor, '#ffffff'),
    },
  };

  const handleLinkPress = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o link'));
    }
  };

  const handleShopPress = () => {
    // Navegar para a tab ShopsTab diretamente
    const tabNavigator = navigation.getParent()?.getParent();
    if (tabNavigator) {
      (tabNavigator as any).navigate('ShopsTab');
    } else {
      navigation.navigate('ShopsTab' as never);
    }
  };

  const handleDonatePress = () => {
    Alert.alert('Doação', `Sistema de doação para @${username} será implementado.`);
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Header onLogoPress={() => navigation.navigate('FeedTab')} />
      
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={getSafeColor(profile.buttonBackgroundColor, COLORS.secondary.main)} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Background do Perfil */}
        <View style={styles.coverContainer}>
          {bgImageSource ? (
            <Image source={bgImageSource} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: getSafeColor(profile.backgroundColor, COLORS.primary.main) }]} />
          )}
          {hasOverlay && (
            <View style={[styles.overlay, { opacity: safeOverlayOpacity / 100 }]} />
          )}
        </View>

        {/* Info do Usuário */}
        <View style={styles.profileHeader}>
          <View 
            style={[
              styles.avatarWrapper,
              userStories && styles.avatarWrapperWithStory
            ]}
          >
            <Avatar 
              user={{ username: user.username, avatar: user.avatar }} 
              size={100}
              onPress={() => userStories && setShowStoryViewer(true)}
              disableNavigation // Já estamos no perfil
            />
            <View style={[styles.statusIndicator, { backgroundColor: user.status?.visibility === 'online' ? '#10b981' : '#94a3b8' }]} />
          </View>

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.username, dynamicStyles.text]}>@{user.username}</Text>
              {user.verifiedBadge?.isVerified && (
                <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
              )}
            </View>
            <Text style={[styles.planType, { color: getSafeColor(profile.buttonBackgroundColor, COLORS.secondary.main) }]}>
              {user.plan?.type || 'FREE'}
            </Text>
            {user.bio ? <Text style={[styles.bio, dynamicStyles.text]}>{user.bio}</Text> : null}
          </View>

          {/* Ações Rápidas (Loja e Doação) */}
          <View style={styles.quickActions}>
            {user.shop?.isEnabled && (
              <TouchableOpacity 
                style={[styles.quickActionButton, dynamicStyles.card]} 
                onPress={handleShopPress}
              >
                <Ionicons name="storefront-outline" size={20} color={getSafeColor(profile.cardTextColor, COLORS.text.primary)} />
                <Text style={[styles.quickActionText, dynamicStyles.cardText]}>Loja</Text>
              </TouchableOpacity>
            )}
            {user.donationEnabled && (
              <TouchableOpacity 
                style={[styles.quickActionButton, dynamicStyles.card]} 
                onPress={handleDonatePress}
              >
                <Ionicons name="heart-outline" size={20} color={getSafeColor(profile.cardTextColor, COLORS.text.primary)} />
                <Text style={[styles.quickActionText, dynamicStyles.cardText]}>Doar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Ações Principais */}
          {currentUser?.id !== (user.id || user._id) && (
            <View style={styles.actions}>
              <View style={styles.actionRow}>
                {/* Botão Seguir */}
                <TouchableOpacity
                  style={[styles.actionButton, isFollowing ? styles.buttonSecondary : dynamicStyles.button]}
                  onPress={handleFollowAction}
                  disabled={followLoading}
                >
                  <Ionicons 
                    name={isFollowing ? "person-remove" : "person-add"} 
                    size={18} 
                    color="#fff" 
                  />
                  <Text style={styles.buttonText}>
                    {isFollowing ? 'Seguindo' : 'Seguir'}
                  </Text>
                </TouchableOpacity>

                {/* Botão Amizade */}
                <TouchableOpacity
                  style={[
                    styles.actionButton, 
                    friendshipStatus === 'FRIENDS' ? styles.buttonFriends : styles.buttonPrimary
                  ]}
                  onPress={handleFriendshipAction}
                  disabled={friendshipLoading}
                >
                  <Ionicons 
                    name={
                      friendshipStatus === 'FRIENDS' ? "people" :
                      friendshipStatus === 'PENDING_SENT' ? "time" :
                      friendshipStatus === 'PENDING_RECEIVED' ? "checkmark-circle" :
                      "person-add-outline"
                    } 
                    size={18} 
                    color="#fff" 
                  />
                  <Text style={styles.buttonText}>
                    {friendshipStatus === 'FRIENDS' ? 'Amigos' :
                     friendshipStatus === 'PENDING_SENT' ? 'Pendente' :
                     friendshipStatus === 'PENDING_RECEIVED' ? 'Aceitar' :
                     'Add Amigo'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[
                  styles.messageButtonFull, 
                  friendshipStatus !== 'FRIENDS' && styles.buttonDisabled
                ]} 
                onPress={handleMessagePress}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                <Text style={styles.buttonText}>Enviar Mensagem</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Stats (Seguidores, Seguindo, Posts, Likes, Views) */}
          <View style={[styles.statsRow, { borderColor: COLORS.border.light + '40' }]}>
            {(profile.showFollowers !== false) && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, dynamicStyles.text]}>
                  {user.followersCount || 0}
                </Text>
                <Text style={[styles.statLabel, dynamicStyles.text, { opacity: 0.7 }]}>Seguidores</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Text style={[styles.statValue, dynamicStyles.text]}>
                {user.followingCount || 0}
              </Text>
              <Text style={[styles.statLabel, dynamicStyles.text, { opacity: 0.7 }]}>Seguindo</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, dynamicStyles.text]}>{user.postsCount || 0}</Text>
              <Text style={[styles.statLabel, dynamicStyles.text, { opacity: 0.7 }]}>Posts</Text>
            </View>
            {profile.showLikes && user.stats?.likesCount !== undefined && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, dynamicStyles.text]}>{user.stats.likesCount}</Text>
                <Text style={[styles.statLabel, dynamicStyles.text, { opacity: 0.7 }]}>Likes</Text>
              </View>
            )}
            {profile.showViews && user.stats?.viewsCount !== undefined && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, dynamicStyles.text]}>{user.stats.viewsCount}</Text>
                <Text style={[styles.statLabel, dynamicStyles.text, { opacity: 0.7 }]}>Views</Text>
              </View>
            )}
          </View>
        </View>

        {/* Links do Usuário */}
        {links.length > 0 && (
          <View style={styles.linksSection}>
            {links.map((link) => (
              <TouchableOpacity
                key={link._id}
                style={[styles.linkCard, dynamicStyles.card]}
                onPress={() => handleLinkPress(link.url)}
                activeOpacity={0.8}
              >
                {link.icon && (
                  <View style={styles.linkIconContainer}>
                    <Text style={styles.linkIconEmoji}>{link.icon}</Text>
                  </View>
                )}
                <Text style={[styles.linkTitle, dynamicStyles.cardText]}>{link.title}</Text>
                <Ionicons name="chevron-forward" size={18} color={getSafeColor(profile.cardTextColor, COLORS.text.tertiary)} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Posts do Usuário */}
        {profile.showPosts && (
          <View style={styles.postsSection}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Posts Recentes</Text>
            {posts.length > 0 ? (
              posts.map(post => (
                <PostCard 
                  key={post._id} 
                  post={post} 
                  onReact={() => {}} 
                  onComment={() => {}} 
                  onShare={() => {}} 
                />
              ))
            ) : (
              <View style={styles.emptyPosts}>
                <Ionicons name="images-outline" size={48} color={getSafeColor(profile.textColor, COLORS.text.tertiary)} style={{ opacity: 0.5 }} />
                <Text style={[styles.emptyText, dynamicStyles.text, { opacity: 0.6 }]}>Nenhum post publicado ainda.</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {userStories && (
        <StoryViewerModal
          visible={showStoryViewer}
          onClose={() => setShowStoryViewer(false)}
          storiesGroups={[userStories]}
          initialGroupIndex={0}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  profileHeader: {
    marginTop: -50,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    padding: 4,
    backgroundColor: COLORS.background.default,
    borderRadius: 60,
  },
  avatarWrapperWithStory: {
    borderWidth: 3,
    borderColor: COLORS.secondary.main,
    padding: 2,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.secondary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#fff',
  },
  userInfo: {
    alignItems: 'center',
    marginTop: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  planType: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary.main,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  bio: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  actions: {
    marginTop: 20,
    gap: 10,
    width: '100%',
    paddingHorizontal: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  messageButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: COLORS.secondary.main,
  },
  buttonSecondary: {
    backgroundColor: '#94a3b8',
  },
  buttonFriends: {
    backgroundColor: '#10b981',
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border.light,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  linksSection: {
    padding: 16,
    gap: 12,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background.paper,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  linkIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkIconEmoji: {
    fontSize: 24,
  },
  linkTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  postsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  emptyPosts: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    color: COLORS.text.tertiary,
    fontSize: 15,
  },
});

