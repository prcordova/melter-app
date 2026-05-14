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
import { DonationModal } from '../components/DonationModal';
import { userApi, postsApi, storiesApi } from '../services/api';
import { COLORS } from '../theme/colors';
import { getAvatarUrl, getUserInitials, getImageUrl } from '../utils/image';
import { useAuth } from '../contexts/AuthContext';
import { StoriesGroup } from '../types/feed';
import { showToast } from '../components/CustomToast';
import * as Clipboard from 'expo-clipboard';
import { API_CONFIG } from '../config/api.config';
import { emitSocialGraphChanged } from '../lib/social-events';
import { shouldShowVerifiedBadgeOnProfile } from '../utils/verified-badge';
import { PLAN_LIMITS, type PlanType } from '../config/plan-features';

const { width } = Dimensions.get('window');
const FREE_PLAN_DEFAULT_BG = require('../../public/assets/imgs/bgMelter.jpg');

type UserProfileRouteParams = {
  username: string;
};

type UserProfileRouteProp = RouteProp<{ UserProfile: UserProfileRouteParams }, 'UserProfile'>;

import { Avatar } from '../components/Avatar';
import { UsernameGradientText } from '../components/UsernameGradientText';
import { normalizeUsernameDisplayEffect } from '../types/username-display-effect';

export function UserProfileScreen() {
  const route = useRoute<UserProfileRouteProp>();
  const navigation = useNavigation<any>();
  const { user: currentUser, refreshUser } = useAuth();
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
  const [donationModalVisible, setDonationModalVisible] = useState(false);
  const [shareLinksModalVisible, setShareLinksModalVisible] = useState(false);

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
            userData.profile.backgroundOverlayOpacity = Math.max(0, Math.min(100, Number(userData.profile.backgroundOverlayOpacity) || 0));
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
              const validPosts = postsData.filter((post: any) => {
                if (!post?._id || !post.userId || typeof post.userId !== 'object') return false;
                const uid = post.userId._id ?? post.userId.id;
                if (!uid) return false;
                const u = post.userId.username;
                const fn = post.userId.fullName;
                return (
                  (typeof u === 'string' && u.trim().length > 0) ||
                  (typeof fn === 'string' && fn.trim().length > 0)
                );
              });
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
  const isSelfProfile = Boolean(
    currentUser &&
      user &&
      (String(currentUser.id) === String((user as any)._id || (user as any).id) ||
        (currentUser.username && user.username && currentUser.username === user.username))
  );

  const ownerPlanType = (((user as any)?.plan?.type ?? 'FREE') as PlanType);
  const planCanHideFollowLists = PLAN_LIMITS[ownerPlanType].canControlFollowListsPrivacy;
  const followListsPublic = !planCanHideFollowLists || (user as any)?.profile?.showFollowersFollowing !== false;
  const isAdminModerator = currentUser?.accountType === 'admin';
  const canOpenFollowLists = isSelfProfile || followListsPublic || Boolean(isAdminModerator);

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
      showToast.info('Mensagens', 'Apenas amigos podem enviar mensagens.');
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

  const shareSiteBase = (API_CONFIG.APP_URL || 'https://melter.com.br').replace(/\/$/, '');
  const shareProfileUrl = `${shareSiteBase}/user/${encodeURIComponent(username)}`;
  const sharePublicFeedUrl = `${shareSiteBase}/user/${encodeURIComponent(username)}/posts`;
  const shareHandleLine = `@${username}.melter.com.br`;

  const openShareLinksModal = () => {
    setShowMenu(false);
    setShareLinksModalVisible(true);
  };

  const copyShareLine = async (text: string, description: string) => {
    try {
      await Clipboard.setStringAsync(text);
      showToast.success('Copiado!', description);
      setShareLinksModalVisible(false);
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
  const safeOverlayOpacity =
    profile.backgroundOverlayOpacity !== undefined && profile.backgroundOverlayOpacity !== null
      ? Math.max(0, Math.min(100, Number(profile.backgroundOverlayOpacity) || 0))
      : 0

  const showCoverColorOverlay = profile.backgroundOverlay !== false && safeOverlayOpacity > 0

  const statusBalloonOuterBg = getSafeColor(
    profile.statusMessageContainerBg,
    COLORS.background.paper
  );
  const statusBalloonInnerBg =
    typeof profile.statusMessageBubbleBg === 'string' && profile.statusMessageBubbleBg.trim()
      ? getSafeColor(profile.statusMessageBubbleBg, COLORS.background.paper)
      : null;
  const statusMessageSolidColor = getSafeColor(
    profile.statusMessageTextColor,
    getSafeColor(profile.textColor, COLORS.text.primary)
  );
  const statusMessageGradientOn = Boolean(
    normalizeUsernameDisplayEffect(profile.statusMessageDisplayEffect ?? null)?.enabled
  );

  /** Alinhado ao web: `full` = imagem em toda a área rolável; `top` = só na faixa do cover. */
  const backgroundMode = profile.backgroundMode === 'top' ? 'top' : 'full'
  const isFullPageBackground = backgroundMode === 'full' && !!bgImageSource

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
    if (!currentUser) {
      showToast.info('Conta', 'Entre na sua conta para enviar uma doação.');
      return;
    }
    if (isSelfProfile) {
      showToast.info('Doação', 'Você não pode enviar doação para o próprio perfil.');
      return;
    }
    setDonationModalVisible(true);
  };

  return (
    <View style={{ flex: 1 }}>
      {isFullPageBackground && bgImageSource ? (
        <Image
          source={bgImageSource}
          style={[StyleSheet.absoluteFillObject, styles.fullPageBgImage]}
          resizeMode="cover"
        />
      ) : null}
      {isFullPageBackground && bgImageSource && showCoverColorOverlay ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              zIndex: 1,
              backgroundColor: getSafeColor(profile.backgroundColor, COLORS.primary.main),
              opacity: safeOverlayOpacity / 100,
            },
          ]}
        />
      ) : null}

      <View
        style={[
          styles.container,
          isFullPageBackground && bgImageSource
            ? { backgroundColor: 'transparent' }
            : dynamicStyles.container,
          { zIndex: 2, flex: 1 },
        ]}
      >
      <Header onLogoPress={() => navigation.navigate('FeedTab')} />
      
      <ScrollView
        style={isFullPageBackground && bgImageSource ? styles.scrollTransparent : undefined}
        contentContainerStyle={
          isFullPageBackground && bgImageSource ? styles.scrollContentTransparent : undefined
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={getSafeColor(profile.buttonBackgroundColor, COLORS.secondary.main)} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Background do Perfil: modo top = faixa com imagem; modo full = imagem fixa atrás (só espaçador aqui) */}
        <View style={styles.coverContainer}>
          {!isFullPageBackground && bgImageSource ? (
            <Image source={bgImageSource} style={styles.coverImage} resizeMode="cover" />
          ) : !isFullPageBackground ? (
            <View style={[styles.coverPlaceholder, { backgroundColor: getSafeColor(profile.backgroundColor, COLORS.primary.main) }]} />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: 'transparent' }]} />
          )}
          {!isFullPageBackground && showCoverColorOverlay && (
            <View
              style={[
                styles.overlay,
                {
                  backgroundColor: getSafeColor(profile.backgroundColor, COLORS.primary.main),
                  opacity: safeOverlayOpacity / 100,
                },
              ]}
            />
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
              <View
                style={[
                  styles.statusBalloon,
                  { backgroundColor: statusBalloonOuterBg, borderColor: COLORS.border.light },
                ]}
              >
                <View
                  style={
                    statusBalloonInnerBg
                      ? {
                          backgroundColor: statusBalloonInnerBg,
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                        }
                      : { paddingVertical: 2 }
                  }
                >
                  <UsernameGradientText
                    username={user.status.customMessage}
                    prefix=""
                    effect={profile.statusMessageDisplayEffect ?? null}
                    fontSize={13}
                    fontWeight="600"
                    numberOfLines={2}
                    style={
                      statusMessageGradientOn
                        ? { maxWidth: 200 }
                        : { color: statusMessageSolidColor, maxWidth: 200 }
                    }
                  />
                </View>
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
              <TouchableOpacity
                onPress={() => setShareLinksModalVisible(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Copiar links do perfil e feed público"
              >
                <Ionicons
                  name="share-outline"
                  size={20}
                  color={getSafeColor(profile.textColor, COLORS.primary.main)}
                />
              </TouchableOpacity>
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
        {(canViewShop() || (donationsEnabled && !isSelfProfile)) && (
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
            {donationsEnabled && !isSelfProfile && (
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
            <TouchableOpacity
              style={styles.statItem}
              activeOpacity={0.75}
              onPress={() => {
                if (!canOpenFollowLists) {
                  showToast.error(
                    'Privacidade',
                    'Este perfil não permite ver a lista de seguidores.'
                  );
                  return;
                }
                navigation.navigate('FollowList', { username, list: 'followers' });
              }}
            >
              <Text style={[styles.statValue, dynamicStyles.text]}>
                {user.followersCount !== undefined && user.followersCount !== null 
                  ? String(user.followersCount) 
                  : '0'}
              </Text>
              <Text style={[styles.statLabel, dynamicStyles.text, { opacity: 0.7 }]}>Seguidores</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              activeOpacity={0.75}
              onPress={() => {
                if (!canOpenFollowLists) {
                  showToast.error(
                    'Privacidade',
                    'Este perfil não permite ver a lista de contas que segue.'
                  );
                  return;
                }
                navigation.navigate('FollowList', { username, list: 'following' });
              }}
            >
              <Text style={[styles.statValue, dynamicStyles.text]}>
                {user.followingCount !== undefined && user.followingCount !== null 
                  ? String(user.followingCount) 
                  : '0'}
              </Text>
              <Text style={[styles.statLabel, dynamicStyles.text, { opacity: 0.7 }]}>Seguindo</Text>
            </TouchableOpacity>
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
                style={[styles.actionButton, dynamicStyles.button]}
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
              ]} 
              onPress={handleMessagePress}
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
            {links.map((link) => {
              const thumbUri = link.imageUrl ? getImageUrl(link.imageUrl) : undefined;
              const hasThumb = Boolean(thumbUri);
              const desc =
                typeof link.description === 'string' && link.description.trim()
                  ? link.description.trim()
                  : '';

              if (hasThumb) {
                return (
                  <TouchableOpacity
                    key={link._id}
                    style={[styles.linkCard, styles.linkCardStacked, dynamicStyles.card]}
                    onPress={() => handleLinkPress(link.url)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: thumbUri }} style={styles.linkThumb} resizeMode="cover" />
                    <View style={styles.linkStackedFooter}>
                      {link.icon ? (
                        <View style={styles.linkIconRowCentered}>
                          <View style={styles.linkIconContainerSmall}>
                            <Text style={styles.linkIconEmojiSmall}>{link.icon}</Text>
                          </View>
                        </View>
                      ) : null}
                      <View style={styles.linkTitleRowCentered}>
                        <Text
                          style={[styles.linkTitle, styles.linkTitleStackedCenter, dynamicStyles.cardText]}
                          numberOfLines={2}
                        >
                          {link.title}
                        </Text>
                        <View style={styles.linkChevronHit}>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={getSafeColor(profile.cardTextColor, COLORS.text.tertiary)}
                          />
                        </View>
                      </View>
                      {desc ? (
                        <Text
                          style={[styles.linkDescription, dynamicStyles.cardText]}
                          numberOfLines={2}
                        >
                          {desc}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={link._id}
                  style={[styles.linkCard, dynamicStyles.card]}
                  onPress={() => handleLinkPress(link.url)}
                  activeOpacity={0.8}
                >
                  {link.icon ? (
                    <View style={styles.linkIconContainer}>
                      <Text style={styles.linkIconEmoji}>{link.icon}</Text>
                    </View>
                  ) : null}
                  <View style={styles.linkRowNoThumb}>
                    <Text style={[styles.linkTitle, dynamicStyles.cardText]} numberOfLines={2}>
                      {link.title}
                    </Text>
                    {desc ? (
                      <Text
                        style={[styles.linkDescriptionInline, dynamicStyles.cardText]}
                        numberOfLines={2}
                      >
                        {desc}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={getSafeColor(profile.cardTextColor, COLORS.text.tertiary)}
                  />
                </TouchableOpacity>
              );
            })}
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
            <View style={styles.postsSectionHeader}>
              <Text style={[styles.sectionTitle, dynamicStyles.text, styles.postsSectionTitleFlex]}>
                Posts Recentes
              </Text>
              <TouchableOpacity
                onPress={() => setShareLinksModalVisible(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Copiar links do perfil e feed público"
              >
                <Ionicons
                  name="share-outline"
                  size={22}
                  color={getSafeColor(profile.textColor, COLORS.primary.main)}
                />
              </TouchableOpacity>
            </View>
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

      <DonationModal
        visible={donationModalVisible}
        onClose={() => setDonationModalVisible(false)}
        recipientUsername={username}
        onSuccess={() => {
          void refreshUser();
        }}
      />

      <Modal
        visible={shareLinksModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShareLinksModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShareLinksModalVisible(false)}
        >
          <View style={styles.shareSheetContainer}>
            <Text style={styles.shareSheetHeading}>Copiar para área de transferência</Text>
            <Text style={styles.shareSheetHint}>
              O link do perfil abre sempre. O da lista pública (/user/…/posts) também é válido mesmo sem posts
              públicos — a página e a API mostram lista vazia. Só entram posts com visibilidade pública.
            </Text>
            <TouchableOpacity
              style={styles.shareSheetRow}
              onPress={() => void copyShareLine(shareProfileUrl, 'URL do perfil')}
            >
              <Ionicons name="person-outline" size={22} color={COLORS.primary.main} />
              <View style={styles.shareSheetRowText}>
                <Text style={styles.shareSheetRowTitle}>URL do perfil</Text>
                <Text style={styles.shareSheetRowUrl} numberOfLines={1}>
                  {shareProfileUrl}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareSheetRow}
              onPress={() => void copyShareLine(sharePublicFeedUrl, 'URL do feed público')}
            >
              <Ionicons name="newspaper-outline" size={22} color={COLORS.primary.main} />
              <View style={styles.shareSheetRowText}>
                <Text style={styles.shareSheetRowTitle}>Feed público (só posts públicos)</Text>
                <Text style={styles.shareSheetRowUrl} numberOfLines={1}>
                  {sharePublicFeedUrl}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareSheetRow}
              onPress={() => void copyShareLine(shareHandleLine, 'Identificador @usuario.melter.com.br')}
            >
              <Ionicons name="at-outline" size={22} color={COLORS.primary.main} />
              <View style={styles.shareSheetRowText}>
                <Text style={styles.shareSheetRowTitle}>Identificador estilo Mastodon</Text>
                <Text style={styles.shareSheetRowUrl} numberOfLines={1}>
                  {shareHandleLine}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareSheetCancel}
              onPress={() => setShareLinksModalVisible(false)}
            >
              <Text style={styles.shareSheetCancelText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
              onPress={openShareLinksModal}
            >
              <Ionicons name="share-outline" size={20} color={COLORS.primary.main} />
              <Text style={[styles.menuItemText, { color: COLORS.primary.main }]}>
                Copiar links do perfil
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  fullPageBgImage: {
    zIndex: 0,
  },
  scrollTransparent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContentTransparent: {
    flexGrow: 1,
    backgroundColor: 'transparent',
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
    borderRadius: 12,
    padding: 4,
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
  shareSheetContainer: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 4,
  },
  shareSheetHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  shareSheetHint: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  shareSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
  },
  shareSheetRowText: {
    flex: 1,
    minWidth: 0,
  },
  shareSheetRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  shareSheetRowUrl: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  shareSheetCancel: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareSheetCancelText: {
    fontSize: 16,
    color: COLORS.primary.main,
    fontWeight: '600',
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
    overflow: 'hidden',
  },
  linkCardStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 0,
  },
  linkThumb: {
    width: '100%',
    height: 148,
    backgroundColor: COLORS.border.light,
  },
  linkStackedFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  linkIconRowCentered: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  linkTitleRowCentered: {
    position: 'relative',
    width: '100%',
    paddingHorizontal: 36,
    minHeight: 26,
    justifyContent: 'center',
  },
  linkTitleStackedCenter: {
    flex: 0,
    width: '100%',
    textAlign: 'center',
  },
  linkChevronHit: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkIconContainerSmall: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkIconEmojiSmall: {
    fontSize: 20,
  },
  linkRowNoThumb: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  linkDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.72,
  },
  linkDescriptionInline: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.72,
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
  postsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  postsSectionTitleFlex: {
    marginBottom: 0,
    flex: 1,
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

