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
  Modal,
} from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Header } from '../components/Header';
import { PostCard } from '../components/PostCard';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { ReportUserModal } from '../components/ReportUserModal';
import { userApi, postsApi, storiesApi } from '../services/api';
import { COLORS } from '../theme/colors';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { useAuth } from '../contexts/AuthContext';
import { StoriesGroup } from '../types/feed';
import { showToast } from '../components/CustomToast';
import * as Clipboard from 'expo-clipboard';
import { API_CONFIG } from '../config/api.config';
import { emitSocialGraphChanged } from '../lib/social-events';
import { shouldShowVerifiedBadgeOnProfile } from '../utils/verified-badge';

const { width } = Dimensions.get('window');
const FREE_PLAN_DEFAULT_BG = require('../../public/assets/imgs/bgMelter.jpg');

type UserProfileRouteParams = {
  username: string;
};

type UserProfileRouteProp = RouteProp<{ UserProfile: UserProfileRouteParams }, 'UserProfile'>;

import { Avatar } from '../components/Avatar';
import { UsernameGradientText } from '../components/UsernameGradientText';

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
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const renderProfileSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonCover} />

      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonHeaderText}>
          <View style={styles.skeletonLineLg} />
          <View style={styles.skeletonLineMd} />
        </View>
      </View>

      <View style={styles.skeletonStatsRow}>
        <View style={styles.skeletonStat} />
        <View style={styles.skeletonStat} />
        <View style={styles.skeletonStat} />
      </View>

      <View style={styles.skeletonActions}>
        <View style={styles.skeletonButtonHalf} />
        <View style={styles.skeletonButtonHalf} />
        <View style={styles.skeletonButtonFull} />
      </View>

      <View style={styles.skeletonLinks}>
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
      </View>
    </View>
  );

  const loadData = async (options?: { background?: boolean }) => {
    const isBackground = options?.background === true;
    try {
      if (!isBackground) {
        setLoading(true);
      }
      const response = await userApi.getUserProfile(username);

      if (response.success) {
        setProfileError(null);
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
        
        // Garantir que followersCount e followingCount sejam calculados se não existirem
        // A API pode retornar os arrays ou os contadores diretamente
        // Primeiro, tenta usar os valores diretos da API
        let followersCount = userData.followersCount;
        let followingCount = userData.followingCount;
        
        // Se não existirem, tenta calcular dos arrays
        if (followersCount === undefined || followersCount === null || followersCount === '') {
          if (Array.isArray(userData.followers)) {
            followersCount = userData.followers.length;
          } else {
            followersCount = 0;
          }
        }
        
        if (followingCount === undefined || followingCount === null || followingCount === '') {
          if (Array.isArray(userData.following)) {
            followingCount = userData.following.length;
          } else {
            followingCount = 0;
          }
        }
        
        // Garantir que sejam números válidos (não strings, não null, não undefined)
        followersCount = Number(followersCount);
        followingCount = Number(followingCount);
        
        // Se Number() retornar NaN, usar 0
        if (isNaN(followersCount)) followersCount = 0;
        if (isNaN(followingCount)) followingCount = 0;
        
        // Atualizar os dados
        userData.followersCount = followersCount;
        userData.followingCount = followingCount;
        
        setUser(userData);
        setLinks(userData.links || []);
        setIsFollowing(userData.isFollowing);
        setFriendshipStatus(userData.friendshipStatus || 'NONE');
        setFriendshipId(userData.friendshipId || null);

        const targetUserId = userData._id || userData.id;

        // Carregamentos secundários em paralelo para reduzir tempo total percebido.
        const secondaryTasks: Promise<void>[] = [];

        secondaryTasks.push(
          (async () => {
            try {
              const blockRes = await userApi.getBlockStatus(username);
              if (blockRes.success) {
                setIsBlocked(blockRes.data.isBlocked || false);
              }
            } catch (error) {
              console.error('Erro ao verificar bloqueio:', error);
            }
          })()
        );

        secondaryTasks.push(
          (async () => {
            try {
              if (!targetUserId) return;
              const storiesRes = await storiesApi.getStoriesByUser(targetUserId);
              if (!storiesRes.success) return;

              const storiesData = storiesRes.data || [];
              if (!Array.isArray(storiesData) || storiesData.length === 0) {
                setUserStories(null);
                return;
              }

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
            } catch (e) {
              console.error('Erro ao buscar stories:', e);
            }
          })()
        );

        secondaryTasks.push(
          (async () => {
            try {
              if (response.data.profile?.showPosts === false) {
                setPosts([]);
                return;
              }

              const postsRes = await postsApi.getUserPosts(username, 1, 10);
              if (!postsRes.success) return;

              const postsData = postsRes.data.posts || postsRes.data || [];
              const validPosts = postsData.filter((post: any) =>
                post &&
                post._id &&
                post.userId &&
                typeof post.userId === 'object' &&
                post.userId.username
              );
              setPosts(validPosts);
            } catch (e) {
              console.error('Erro ao buscar posts:', e);
            }
          })()
        );

        await Promise.allSettled(secondaryTasks);
      } else {
        const apiMessage = response.message || 'Perfil indisponível no momento';
        setProfileError(apiMessage);
        if (!isBackground) {
          setUser(null);
          setPosts([]);
          setLinks([]);
        }
        console.warn('[UserProfileScreen] Perfil não carregado:', {
          username,
          message: apiMessage,
        });
      }
      setHasLoadedOnce(true);
    } catch (error) {
      console.error('[UserProfileScreen] Erro:', error);
      setProfileError('Não foi possível carregar o perfil');
      Alert.alert('Erro', 'Não foi possível carregar o perfil');
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [username]);

  // Recarregar em background ao focar, evitando spinner pesado.
  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnce) return;
      loadData({ background: true });
    }, [username])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, [username]);

  /** Mesma regra do web (`profile-content.tsx` → `canViewShop`). */
  const canViewShop = useCallback(() => {
    if (!user?.shop) return false;
    if (!user.shop.isEnabled) return false;

    const isSelf =
      (currentUser?.id && (currentUser.id === user.id || currentUser.id === user._id)) ||
      (currentUser?.username && currentUser.username === user.username);

    if (isSelf) return true;

    const visibility = user.shop.visibility || 'preview';
    if (visibility === 'public') return true;
    if (visibility === 'followers') return Boolean(isFollowing);
    if (visibility === 'friends') {
      return friendshipStatus === 'FRIENDS' || friendshipStatus === 'FRIENDLY';
    }
    return false;
  }, [user, currentUser, isFollowing, friendshipStatus]);

  const donationsEnabled = Boolean((user as any)?.donationsEnabled ?? (user as any)?.donationEnabled);

  const handleFollowAction = async () => {
    if (followLoading) return;
    try {
      setFollowLoading(true);
      if (isFollowing) {
        await userApi.unfollowUser(username);
        setIsFollowing(false);
        emitSocialGraphChanged({
          username,
          targetUserId: user?._id,
          isFollowing: false,
        });
      } else {
        await userApi.followUser(username);
        setIsFollowing(true);
        emitSocialGraphChanged({
          username,
          targetUserId: user?._id,
          isFollowing: true,
        });
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
          showToast.success('Sucesso', 'Solicitação de amizade enviada');
          emitSocialGraphChanged({ username, targetUserId: user?._id, friendshipStatus: 'PENDING_SENT' });
        }
      } else if (friendshipStatus === 'PENDING_RECEIVED') {
        if (!friendshipId) return;
        const res = await userApi.acceptFriendRequest(friendshipId);
        if (res.success) {
          setFriendshipStatus('FRIENDS');
          showToast.success('Sucesso', 'Agora vocês são amigos!');
          emitSocialGraphChanged({ username, targetUserId: user?._id, friendshipStatus: 'FRIENDS' });
        }
      } else if (friendshipStatus === 'PENDING_SENT') {
        if (!friendshipId) return;
        const res = await userApi.cancelFriendRequest(friendshipId);
        if (res.success) {
          setFriendshipStatus('NONE');
          setFriendshipId(null);
          showToast.success('Sucesso', 'Solicitação cancelada');
          emitSocialGraphChanged({ username, targetUserId: user?._id, friendshipStatus: 'NONE' });
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
                  emitSocialGraphChanged({ username, targetUserId: user?._id, friendshipStatus: 'NONE' });
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
      showToast.error('Aviso', 'Você só pode enviar mensagens para seus amigos.');
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

  const handleShareProfile = async () => {
    try {
      const profileUrl = `https://melter.com.br/user/${username}`;
      await Clipboard.setStringAsync(profileUrl);
      showToast.success('Copiado!', 'Link do perfil copiado para a área de transferência');
      setShowMenu(false);
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      showToast.error('Erro', 'Não foi possível copiar o link');
    }
  };

  const handleBlockUser = async () => {
    setShowMenu(false);
    
    if (isBlocked) {
      // Desbloquear
      Alert.alert(
        'Desbloquear',
        `Desbloquear @${username}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desbloquear',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await userApi.unblockUser(username);
                if (response.success) {
                  setIsBlocked(false);
                  showToast.success('Sucesso', 'Usuário desbloqueado');
                  loadData(); // Recarregar dados
                }
              } catch (error: any) {
                showToast.error('Erro', error.response?.data?.message || 'Não foi possível desbloquear');
              }
            },
          },
        ]
      );
    } else {
      // Bloquear
      Alert.alert(
        'Bloquear',
        `Bloquear @${username}? Vocês não poderão mais interagir.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Bloquear',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await userApi.blockUser(username);
                if (response.success) {
                  setIsBlocked(true);
                  showToast.success('Sucesso', 'Usuário bloqueado');
                  loadData(); // Recarregar dados
                }
              } catch (error: any) {
                showToast.error('Erro', error.response?.data?.message || 'Não foi possível bloquear');
              }
            },
          },
        ]
      );
    }
  };

  if (loading && !refreshing) {
    return renderProfileSkeleton();
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Não foi possível abrir este perfil</Text>
        <Text style={styles.errorMessage}>
          {profileError || 'Este usuário pode estar com perfil privado ou indisponível.'}
        </Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
          <Text style={styles.errorButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
  const hasCustomBackgroundImage =
    typeof profile.backgroundImage === 'string' && profile.backgroundImage.trim() !== '';
  const isFreePlanUser = (user.plan?.type || 'FREE') === 'FREE';
  const shouldUseFreeDefaultBackground = !hasCustomBackgroundImage && isFreePlanUser;
  const bgImageSource = hasCustomBackgroundImage
    ? { uri: profile.backgroundImage }
    : shouldUseFreeDefaultBackground
      ? FREE_PLAN_DEFAULT_BG
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
    if (!canViewShop()) {
      showToast.info('Loja', 'Você não tem permissão para ver esta loja (visibilidade ou loja desativada).');
      return;
    }
    const tabNav = navigation.getParent?.();
    if (tabNav && typeof (tabNav as any).navigate === 'function') {
      (tabNav as any).navigate('ProfileStack', {
        screen: 'MyShop',
        params: { username },
      });
      return;
    }
    (navigation as any).navigate('ProfileStack', {
      screen: 'MyShop',
      params: { username },
    });
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
          {/* Avatar à esquerda */}
          <View style={styles.avatarContainer}>
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
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: user.status?.isOnline ? '#10b981' : '#94a3b8' }
                ]}
              />
            </View>
            
            {/* Balão de status à direita do avatar, um pouco acima da metade */}
            {user.status?.customMessage && user.status.customMessage.trim() && (
              <View style={styles.statusBalloon}>
                <Text style={[styles.statusBalloonText, dynamicStyles.text]} numberOfLines={2}>
                  {user.status.customMessage}
                </Text>
              </View>
            )}
          </View>

          {/* Informações do usuário à direita do avatar */}
          <View style={styles.userInfo}>
            {/* Nome, plano e 3 pontinhos na mesma linha */}
            <View style={styles.nameRow}>
              <UsernameGradientText
                username={user.username}
                prefix="@"
                effect={user.profile?.usernameDisplayEffect ?? null}
                fontSize={22}
                fontWeight="bold"
                style={[styles.username, dynamicStyles.text, { flexShrink: 1 }]}
              />
              {shouldShowVerifiedBadgeOnProfile(user) && (
                <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
              )}
              <Text style={[styles.planType, { color: getSafeColor(profile.buttonBackgroundColor, COLORS.secondary.main) }]}>
                {user.plan?.type || 'FREE'}
              </Text>
              {/* Menu de 3 pontinhos */}
              {currentUser?.id !== (user.id || user._id) && (
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => setShowMenu(true)}
                >
                  <Ionicons name="ellipsis-vertical" size={24} color={getSafeColor(profile.textColor, COLORS.text.primary)} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Bio */}
            {user.bio ? <Text style={[styles.bio, dynamicStyles.text]}>{user.bio}</Text> : null}
          </View>
        </View>

        {/* Ações Rápidas (Loja e Doação) */}
        {(canViewShop() || donationsEnabled) && (
          <View style={styles.quickActions}>
            {canViewShop() && (
              <TouchableOpacity 
                style={[styles.quickActionButton, dynamicStyles.card]} 
                onPress={handleShopPress}
              >
                <Ionicons name="storefront-outline" size={20} color={getSafeColor(profile.cardTextColor, COLORS.text.primary)} />
                <Text style={[styles.quickActionText, dynamicStyles.cardText]}>Loja</Text>
              </TouchableOpacity>
            )}
            {donationsEnabled && (
              <TouchableOpacity 
                style={[styles.quickActionButton, dynamicStyles.card]} 
                onPress={handleDonatePress}
              >
                <Ionicons name="heart-outline" size={20} color={getSafeColor(profile.cardTextColor, COLORS.text.primary)} />
                <Text style={[styles.quickActionText, dynamicStyles.cardText]}>Doar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Stats (Seguidores, Seguindo, Posts, Likes, Views) */}
        <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, dynamicStyles.text]}>
                {user.followersCount !== undefined && user.followersCount !== null 
                  ? String(user.followersCount) 
                  : '0'}
              </Text>
              <Text style={[styles.statLabel, dynamicStyles.text, { opacity: 0.7 }]}>Seguidores</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, dynamicStyles.text]}>
                {user.followingCount !== undefined && user.followingCount !== null 
                  ? String(user.followingCount) 
                  : '0'}
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

        {/* Ações Principais */}
        {currentUser?.id !== (user.id || user._id) && (
          <View style={styles.actions}>
            <View style={styles.actionRow}>
              {/* Botão Seguir */}
              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  isFollowing 
                    ? { backgroundColor: getSafeColor(profile.buttonBackgroundColor, COLORS.secondary.main) + '80', opacity: 0.7 }
                    : dynamicStyles.button
                ]}
                onPress={handleFollowAction}
                disabled={followLoading}
              >
                <Ionicons 
                  name={isFollowing ? "person-remove" : "person-add"} 
                  size={18} 
                  color={getSafeColor(profile.buttonTextColor, '#ffffff')} 
                />
                <Text style={[styles.buttonText, dynamicStyles.buttonText]}>
                  {isFollowing ? 'Seguindo' : 'Seguir'}
                </Text>
              </TouchableOpacity>

              {/* Botão Amizade */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  dynamicStyles.button
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
                  color={getSafeColor(profile.buttonTextColor, '#ffffff')} 
                />
                <Text style={[styles.buttonText, dynamicStyles.buttonText]}>
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
                dynamicStyles.button,
                friendshipStatus !== 'FRIENDS' && { opacity: 0.5 }
              ]} 
              onPress={handleMessagePress}
              disabled={friendshipStatus !== 'FRIENDS'}
            >
              <Ionicons 
                name="chatbubble-ellipses" 
                size={18} 
                color={getSafeColor(profile.buttonTextColor, '#ffffff')} 
              />
              <Text style={[styles.buttonText, dynamicStyles.buttonText]}>Enviar Mensagem</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Links do Usuário */}
        {links.length > 0 ? (
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
        ) : currentUser?.id === (user.id || user._id) ? (
          <View style={styles.linksSection}>
            <TouchableOpacity
              style={[styles.addLinksButton, dynamicStyles.card]}
              onPress={() => {
                // Navegar diretamente para ProfileStack > LinksSettings
                const tabNavigator = navigation.getParent()?.getParent();
                if (tabNavigator) {
                  (tabNavigator as any).navigate('ProfileStack', {
                    screen: 'LinksSettings',
                  });
                } else {
                  // Fallback: tentar navegar diretamente
                  navigation.navigate('ProfileStack' as never, {
                    screen: 'LinksSettings' as never,
                  } as never);
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={24} color={getSafeColor(profile.buttonBackgroundColor, COLORS.secondary.main)} />
              <Text style={[styles.addLinksButtonText, { color: getSafeColor(profile.buttonBackgroundColor, COLORS.secondary.main) }]}>
                Adicionar seus links
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Posts do Usuário */}
        {profile.showPosts !== false && (
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

      <ReportUserModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetUsername={username}
      />

      {/* Menu de 3 pontinhos */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleShareProfile}
            >
              <Ionicons name="share-outline" size={20} color={COLORS.primary.main} />
              <Text style={[styles.menuItemText, { color: COLORS.primary.main }]}>
                Compartilhar Perfil
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowReportModal(true);
              }}
            >
              <Ionicons name="flag-outline" size={20} color={COLORS.states.warning} />
              <Text style={[styles.menuItemText, { color: COLORS.states.warning }]}>
                Denunciar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleBlockUser}
            >
              <Ionicons 
                name={isBlocked ? "lock-open-outline" : "lock-closed-outline"} 
                size={20} 
                color={isBlocked ? COLORS.primary.main : COLORS.states.error} 
              />
              <Text style={[
                styles.menuItemText, 
                { color: isBlocked ? COLORS.primary.main : COLORS.states.error }
              ]}>
                {isBlocked ? 'Desbloquear' : 'Bloquear'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  skeletonContainer: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  skeletonCover: {
    height: 180,
    backgroundColor: '#e5e7eb',
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: -30,
    gap: 12,
  },
  skeletonAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#d1d5db',
    borderWidth: 4,
    borderColor: COLORS.background.default,
  },
  skeletonHeaderText: {
    flex: 1,
    gap: 10,
  },
  skeletonLineLg: {
    width: '70%',
    height: 18,
    borderRadius: 9,
    backgroundColor: '#d1d5db',
  },
  skeletonLineMd: {
    width: '45%',
    height: 14,
    borderRadius: 7,
    backgroundColor: '#e5e7eb',
  },
  skeletonStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  skeletonStat: {
    width: 70,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  skeletonActions: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 10,
  },
  skeletonButtonHalf: {
    width: '48%',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#d1d5db',
    alignSelf: 'flex-start',
  },
  skeletonButtonFull: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#d1d5db',
  },
  skeletonLinks: {
    paddingHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  skeletonCard: {
    width: '100%',
    height: 68,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 50, // Começa abaixo da metade do avatar (avatar tem 100px, metade = 50px)
  },
  avatarContainer: {
    position: 'relative',
    marginTop: -50, // Move o avatar para cima para sobrepor o cover
  },
  avatarWrapper: {
    position: 'relative',
    padding: 4,
    backgroundColor: COLORS.background.default,
    borderRadius: 60,
  },
  statusBalloonContainer: {
    position: 'absolute',
    left: 120, // Avatar width (100) + padding (20)
    top: '50%',
    marginTop: -20, // Aproximadamente metade da altura do balão
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBalloon: {
    position: 'absolute',
    left: 110, // À direita do avatar (100px + 10px de gap)
    top: -30, // Na metade superior do avatar (sobreposto ao cover background)
    maxWidth: 200,
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    zIndex: 10,
  },
  statusBalloonArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
    borderRightWidth: 8,
    borderRightColor: COLORS.background.paper,
    marginLeft: -1,
  },
  statusBalloonText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text.primary,
  },
  menuButton: {
    padding: 4,
    marginLeft: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: 8,
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
    flex: 1,
    marginTop: 50, // Começa abaixo da metade do avatar (50px = metade de 100px)
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  planType: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary.main,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  bio: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'left',
    marginTop: 8,
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
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.states.error,
    gap: 8,
    marginTop: 10,
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
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
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
    paddingTop: 32,
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
  addLinksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: COLORS.background.paper,
    borderRadius: 16,
    gap: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border.medium,
  },
  addLinksButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: COLORS.background.default,
    gap: 10,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorButton: {
    marginTop: 8,
    backgroundColor: COLORS.secondary.main,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});

