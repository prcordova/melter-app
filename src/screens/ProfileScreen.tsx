import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Linking,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { MenuCard } from '../components/MenuCard';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { Button } from '../components/Button';
import { CustomModal, useCustomModal } from '../components/CustomModal';
import { COLORS } from '../theme/colors';
import { linksApi, storiesApi, userApi, sellerVerificationApi } from '../services/api';
import { StoriesGroup } from '../types/feed';
import { showToast } from '../components/CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { ModalBottom } from '../components/ModalBottom';
import { SelectRow } from '../components/SelectRow';

type UserStatus = 'online' | 'busy' | 'offline';

import { Avatar } from '../components/Avatar';
import { shouldShowVerifiedBadgeOnProfile } from '../utils/verified-badge';
import { getImageUrl } from '../utils/image';
import { UsernameGradientText } from '../components/UsernameGradientText';
import { normalizeUsernameDisplayEffect } from '../types/username-display-effect';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const { modalProps, showConfirm, hideModal } = useCustomModal();

  const [status, setStatus] = useState<UserStatus>('online');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusMessageHasChanges, setStatusMessageHasChanges] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [userStories, setUserStories] = useState<StoriesGroup | null>(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const statusMessageInputRef = useRef<TextInput>(null);
  const [userLinks, setUserLinks] = useState<any[]>([]);
  const [publicProfile, setPublicProfile] = useState<Record<string, any> | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingLink, setEditingLink] = useState<any | null>(null);
  const [savingLink, setSavingLink] = useState(false);
  const [linksSortMode, setLinksSortMode] = useState<'custom' | 'date' | 'name' | 'likes'>('custom');
  const [linkForm, setLinkForm] = useState({
    title: '',
    url: '',
    visible: true,
  });
  const [accountVerification, setAccountVerification] = useState<any | null>(null);
  const [accountVerificationLoading, setAccountVerificationLoading] = useState(true);
  const currentPlanType = user?.plan?.type || 'FREE';
  const canRequestAccountVerification =
    currentPlanType === 'PRO' || currentPlanType === 'PRO_PLUS';
  const maxLinksByPlan: Record<string, number> = {
    FREE: 3,
    STARTER: 10,
    PRO: 50,
    PRO_PLUS: 50,
  };
  const maxLinksAllowed = maxLinksByPlan[currentPlanType] || 3;
  const hasReachedLinksLimit = userLinks.length >= maxLinksAllowed;

  const isValidColor = (color: unknown): boolean => {
    if (!color || typeof color !== 'string') return false;
    const trimmed = color.trim();
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(trimmed)) return true;
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(trimmed)) return true;
    return false;
  };

  const getSafeColor = (color: unknown, fallback: string): string => {
    if (isValidColor(color)) return String(color).trim();
    return fallback;
  };

  const loadUserLinks = useCallback(async () => {
    try {
      if (!user?.id) return;
      const response = await userApi.getMyProfile({ scope: 'full' });
      if (response.success && response.data) {
        setPublicProfile(response.data.profile || null);
        const links = response.data.links || [];
        const profileSortMode = response.data.profile?.sortMode || 'custom';
        setLinksSortMode(profileSortMode);
        if (profileSortMode === 'custom') {
          setUserLinks([...links].sort((a, b) => (a.order || 0) - (b.order || 0)));
        } else if (profileSortMode === 'date') {
          setUserLinks([...links].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
        } else if (profileSortMode === 'name') {
          setUserLinks([...links].sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''))));
        } else {
          setUserLinks([...links].sort((a, b) => (b.likes || 0) - (a.likes || 0)));
        }
      }
    } catch (e) {
      console.error('Erro ao buscar links:', e);
    }
  }, [user?.id]);

  const loadAccountVerification = useCallback(async () => {
    if (!user?.id) {
      setAccountVerification(null);
      setAccountVerificationLoading(false);
      return;
    }
    setAccountVerificationLoading(true);
    try {
      const res = await sellerVerificationApi.getVerification();
      if (res.success) {
        setAccountVerification(res.data ?? null);
      } else {
        setAccountVerification(null);
      }
    } catch (e) {
      console.error('Erro ao buscar verificação:', e);
      setAccountVerification(null);
    } finally {
      setAccountVerificationLoading(false);
    }
  }, [user?.id]);

  // Função para carregar status
  const loadStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const response = await userApi.getStatus();
      if (response.success && response.data) {
        setStatus(response.data.visibility || 'online');
        setStatusMessage(response.data.customMessage || '');
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // Carregar status do usuário ao montar e ao focar na tela
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Recarregar status quando a tela receber foco (mas não imediatamente após salvar)
  useFocusEffect(
    useCallback(() => {
      // Pequeno delay para evitar recarregar imediatamente após salvar
      const timer = setTimeout(() => {
        loadStatus();
      }, 500);
      return () => clearTimeout(timer);
    }, [loadStatus])
  );

  React.useEffect(() => {
    const fetchMyStories = async () => {
      try {
        if (!user?.id) return;
        const response = await storiesApi.getStoriesByUser(user.id);
        if (response.success) {
          const storiesData = response.data || [];
          // Se retornar array de stories individuais, criar grupo
          if (Array.isArray(storiesData) && storiesData.length > 0) {
            const group: StoriesGroup = {
              user: {
                _id: user.id,
                username: user.username || 'Você',
                avatar: user.avatar,
              },
              stories: storiesData.map((story: any) => ({
                _id: story._id,
                userId: {
                  _id: story.userId?._id || user.id,
                  username: story.userId?.username || user.username || 'Você',
                  avatar: story.userId?.avatar || user.avatar,
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
      } catch (e) {
        console.error('Erro ao buscar stories:', e);
      }
    };
    if (user?.id) fetchMyStories();
  }, [user?.id]);

  // Carregar links e status de verificação (selo / documentos)
  React.useEffect(() => {
    if (user?.id) {
      loadUserLinks();
      loadAccountVerification();
    }
  }, [user?.id, loadUserLinks, loadAccountVerification]);

  // Recarregar ao focar no perfil
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadUserLinks();
        loadAccountVerification();
      }
    }, [user?.id, loadUserLinks, loadAccountVerification])
  );

  const openAddLinkModal = () => {
    setEditingLink(null);
    setLinkForm({ title: '', url: '', visible: true });
    setShowLinkModal(true);
  };

  const openEditLinkModal = (link: any) => {
    setEditingLink(link);
    setLinkForm({
      title: link.title || '',
      url: link.url || '',
      visible: link.visible !== false,
    });
    setShowLinkModal(true);
  };

  const closeLinkModal = () => {
    if (savingLink) return;
    setShowLinkModal(false);
    setEditingLink(null);
    setLinkForm({ title: '', url: '', visible: true });
  };

  const handleSaveLink = async () => {
    const title = linkForm.title.trim();
    const url = linkForm.url.trim();
    if (!title || !url) {
      showToast.error('Erro', 'Preencha título e URL');
      return;
    }
    if (!editingLink && hasReachedLinksLimit) {
      showToast.info('Limite atingido', `Seu plano ${currentPlanType} permite até ${maxLinksAllowed} links.`);
      return;
    }
    try {
      setSavingLink(true);
      if (editingLink?._id) {
        await linksApi.updateLink(editingLink._id, {
          title,
          url,
          visible: linkForm.visible,
        });
        showToast.success('Sucesso', 'Link atualizado');
      } else {
        await linksApi.createLink({
          title,
          url,
          visible: linkForm.visible,
        });
        showToast.success('Sucesso', 'Link adicionado');
      }
      await loadUserLinks();
      closeLinkModal();
    } catch (error) {
      console.error('Erro ao salvar link:', error);
      showToast.error('Erro', 'Não foi possível salvar o link');
    } finally {
      setSavingLink(false);
    }
  };

  const handleDeleteLink = (link: any) => {
    showConfirm(
      'Excluir link',
      `Deseja excluir "${link.title}"?`,
      async () => {
        try {
          await linksApi.deleteLink(link._id);
          setUserLinks((prev) => prev.filter((item) => item._id !== link._id));
          showToast.success('Sucesso', 'Link excluído');
        } catch (error) {
          console.error('Erro ao excluir link:', error);
          showToast.error('Erro', 'Não foi possível excluir o link');
        }
      },
      {
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        destructive: true,
      }
    );
  };

  const handleMoveLink = async (index: number, direction: 'up' | 'down') => {
    if (linksSortMode !== 'custom') return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= userLinks.length) return;

    const updated = [...userLinks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setUserLinks(updated);
    try {
      const orderedIds = updated.map((item: any) => item._id);
      await linksApi.reorderLinks(orderedIds);
    } catch (error) {
      console.error('Erro ao reordenar links:', error);
      showToast.error('Erro', 'Não foi possível atualizar a ordem');
      await loadUserLinks();
    }
  };

  const handleLinksSortChange = (mode: 'custom' | 'date' | 'name' | 'likes') => {
    setLinksSortMode(mode);
    const sorted = [...userLinks];
    if (mode === 'custom') {
      sorted.sort((a, b) => (a.order || 0) - (b.order || 0));
    } else if (mode === 'date') {
      sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (mode === 'name') {
      sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    } else {
      sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    setUserLinks(sorted);
  };

  // Handlers (declarados antes para evitar erros de referência)
  const handleMenuPress = (screen: string) => {
    if (screen === 'settings') {
      (navigation as any).navigate('Settings');
    } else if (screen === 'profile') {
      if (user?.username) {
        (navigation as any).navigate('UserProfile', { username: user.username });
      }
    } else if (screen === 'plans') {
      (navigation as any).navigate('Plans');
    } else if (screen === 'terms') {
      (navigation as any).navigate('Terms');
    } else if (screen === 'appearance') {
      (navigation as any).navigate('AppearanceSettings');
    } else if (screen === 'wallet') {
      (navigation as any).navigate('WalletSettings');
    } else if (screen === 'shop') {
      if (user?.username) {
        (navigation as any).navigate('MyShop', { username: user.username });
      }
    } else if (screen === 'purchases') {
      (navigation as any).navigate('Purchases');
    } else if (screen === 'promotions') {
      (navigation as any).navigate('PromotionsSettings');
    } else if (screen === 'referral') {
      (navigation as any).navigate('Referral');
    } else if (screen === 'supportTickets') {
      (navigation as any).navigate('SupportTickets');
    } else {
      showToast.info('Em breve', `Tela de ${screen} será implementada`);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const handleShareProfile = async () => {
    try {
      if (!user?.username) return;
      const profileUrl = `https://melter.com.br/user/${user.username}`;
      await Clipboard.setStringAsync(profileUrl);
      showToast.success('Copiado!', 'Link do perfil copiado para a área de transferência');
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      showToast.error('Erro', 'Não foi possível copiar o link');
    }
  };

  // Opções do menu (baseado no dropdown do Melter web)
  const menuOptions = [
    { id: 'profile', title: 'Ver Perfil', icon: 'person-outline', onPress: () => handleMenuPress('profile') },
    { id: 'shop', title: 'Minha Loja', icon: 'storefront-outline', onPress: () => handleMenuPress('shop') },
    { id: 'purchases', title: 'Compras', icon: 'bag-handle-outline', onPress: () => handleMenuPress('purchases') },
    { id: 'wallet', title: 'Carteira', icon: 'wallet-outline', onPress: () => handleMenuPress('wallet'), badgeCount: 0 },
    { id: 'promotions', title: 'Promoções', icon: 'gift-outline', onPress: () => handleMenuPress('promotions') },
    { id: 'referral', title: 'Indique e Ganhe', icon: 'megaphone-outline', onPress: () => handleMenuPress('referral') },
    {
      id: 'supportTickets',
      title: 'Tickets / Suporte',
      icon: 'help-circle-outline',
      onPress: () => handleMenuPress('supportTickets'),
    },
    { id: 'settings', title: 'Configurações', icon: 'settings-outline', onPress: () => handleMenuPress('settings') },
    { id: 'plans', title: user?.plan?.type === 'FREE' ? 'Upgrade' : 'Planos', icon: 'ribbon-outline', onPress: () => handleMenuPress('plans') },
    { id: 'terms', title: 'Termos', icon: 'document-text-outline', onPress: () => handleMenuPress('terms') },
  ];

  const handleStatusChange = async (newStatus: UserStatus) => {
    const previousStatus = status;
    setSavingStatus(true);

    try {
      const response = await userApi.updateStatus({ visibility: newStatus });
      if (response.success && response.data) {
        // Atualizar estado com o valor retornado pela API para garantir sincronização
        const updatedVisibility = response.data.visibility || newStatus;
        setStatus(updatedVisibility as UserStatus);
        showToast.success('Sucesso', 'Status atualizado');
      } else {
        // Reverter se falhar
        setStatus(previousStatus);
        showToast.error('Erro', 'Não foi possível atualizar o status');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      // Reverter se falhar
      setStatus(previousStatus);
      showToast.error('Erro', 'Não foi possível atualizar o status');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleStatusMessageChange = (message: string) => {
    setStatusMessage(message);
    setStatusMessageHasChanges(true);
  };

  const handleSaveStatusMessage = async () => {
    setSavingMessage(true);
    try {
      const response = await userApi.updateStatus({ customMessage: statusMessage });
      if (response.success) {
        setStatusMessageHasChanges(false);
        showToast.success('Sucesso', 'Mensagem de status salva');
      } else {
        showToast.error('Erro', 'Não foi possível salvar a mensagem');
      }
    } catch (error) {
      console.error('Erro ao salvar mensagem de status:', error);
      showToast.error('Erro', 'Não foi possível salvar a mensagem');
    } finally {
      setSavingMessage(false);
    }
  };

  const pp = publicProfile || {};
  const statusBalloonOuterBg = getSafeColor(pp.statusMessageContainerBg, COLORS.background.paper);
  const statusBalloonInnerBg =
    typeof pp.statusMessageBubbleBg === 'string' && pp.statusMessageBubbleBg.trim()
      ? getSafeColor(pp.statusMessageBubbleBg, COLORS.background.paper)
      : null;
  const statusMessageSolidColor = getSafeColor(pp.statusMessageTextColor, COLORS.text.primary);
  const statusMessageGradientOn = Boolean(
    normalizeUsernameDisplayEffect(pp.statusMessageDisplayEffect ?? null)?.enabled
  );

  return (
    <View style={styles.container}>
      {/* Header fixo */}
      <Header 
        onLogoPress={() => {
          const parent = navigation.getParent();
          if (parent) {
            parent.navigate('FeedTab' as never);
          }
        }}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar e Info do Usuário */}
        <View style={styles.userSection}>
          <View style={styles.avatarStatusRow}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                <View
                  style={[
                    styles.avatarInnerContainer,
                    userStories && styles.avatarContainerWithStory,
                  ]}
                >
                  <Avatar
                    user={{ username: user?.username, avatar: user?.avatar }}
                    size={80}
                    onPress={() => {
                      if (userStories) {
                        setShowStoryViewer(true);
                      } else {
                        handleMenuPress('profile');
                      }
                    }}
                  />
                </View>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareProfile}>
                  <Ionicons name="share-outline" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.editStatusButton}
                onPress={() => {
                  setTimeout(() => {
                    statusMessageInputRef.current?.focus();
                  }, 100);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.primary.main} />
              </TouchableOpacity>
            </View>

            {statusMessage && statusMessage.trim() ? (
              <View style={styles.statusBalloonContainer}>
                <View style={[styles.statusBalloon, { backgroundColor: statusBalloonOuterBg }]}>
                  <View
                    style={[
                      styles.statusBalloonInner,
                      statusBalloonInnerBg ? { backgroundColor: statusBalloonInnerBg } : null,
                    ]}
                  >
                    <UsernameGradientText
                      username={statusMessage}
                      prefix=""
                      effect={pp.statusMessageDisplayEffect ?? null}
                      fontSize={13}
                      fontWeight="600"
                      numberOfLines={4}
                      style={
                        statusMessageGradientOn
                          ? styles.statusMessageText
                          : { color: statusMessageSolidColor, ...styles.statusMessageText }
                      }
                    />
                  </View>
                </View>
                <View
                  style={[styles.statusBalloonArrow, { borderRightColor: statusBalloonOuterBg }]}
                />
              </View>
            ) : null}
          </View>
          <View style={styles.usernameRow}>
            <TouchableOpacity onPress={() => handleMenuPress('profile')}>
              <Text style={styles.username}>@{user?.username}</Text>
            </TouchableOpacity>
            {shouldShowVerifiedBadgeOnProfile(user) && (
              <Ionicons name="checkmark-circle" size={20} color="#3b82f6" style={styles.verifiedIcon} />
            )}
          </View>
          <View style={styles.planAndEditRow}>
            <Text style={styles.planType}>{user?.plan?.type || 'FREE'}</Text>
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => handleMenuPress('appearance')}
            >
              <Ionicons name="create-outline" size={16} color={COLORS.primary.main} />
              <Text style={styles.editProfileText}>Editar Perfil</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status e Mensagem */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Status</Text>
          
          {/* Status Atual e Mensagem */}
          {!loadingStatus && (
            <View style={styles.statusHeader}>
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>
                  {status === 'online' && '🟢 Online'}
                  {status === 'busy' && '🟡 Ausente'}
                  {status === 'offline' && '⚪ Offline'}
                  {statusMessage && `, ${statusMessage}`}
                </Text>
              </View>
            </View>
          )}

          {loadingStatus ? (
            <View style={styles.statusSkeletonContainer}>
              <View style={styles.statusSkeletonButtonsRow}>
                <View style={styles.statusSkeletonButton} />
                <View style={styles.statusSkeletonButton} />
                <View style={styles.statusSkeletonButton} />
              </View>
              <View style={styles.statusSkeletonInput} />
            </View>
          ) : (
            <>
              {/* Botões de Status */}
              <View style={styles.statusButtons}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    status === 'online' && styles.statusButtonActive,
                    savingStatus && styles.statusButtonDisabled,
                  ]}
                  onPress={() => handleStatusChange('online')}
                  disabled={savingStatus}
                >
                  <Text style={styles.statusIcon}>🟢</Text>
                  <Text style={[
                    styles.statusButtonText,
                    status === 'online' && styles.statusButtonTextActive,
                  ]}>
                    Online
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    status === 'busy' && styles.statusButtonActive,
                    savingStatus && styles.statusButtonDisabled,
                  ]}
                  onPress={() => handleStatusChange('busy')}
                  disabled={savingStatus}
                >
                  <Text style={styles.statusIcon}>🟡</Text>
                  <Text style={[
                    styles.statusButtonText,
                    status === 'busy' && styles.statusButtonTextActive,
                  ]}>
                    Ausente
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    status === 'offline' && styles.statusButtonActive,
                    savingStatus && styles.statusButtonDisabled,
                  ]}
                  onPress={() => handleStatusChange('offline')}
                  disabled={savingStatus}
                >
                  <Text style={styles.statusIcon}>⚪</Text>
                  <Text style={[
                    styles.statusButtonText,
                    status === 'offline' && styles.statusButtonTextActive,
                  ]}>
                    Offline
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Mensagem de Status */}
              <View style={styles.statusMessageContainer}>
                <TextInput
                  ref={statusMessageInputRef}
                  style={styles.statusMessageInput}
                  placeholder="Digite uma mensagem de status..."
                  placeholderTextColor={COLORS.text.tertiary}
                  value={statusMessage}
                  onChangeText={handleStatusMessageChange}
                  maxLength={100}
                  multiline
                  editable={!savingMessage}
                />
                <View style={styles.statusMessageFooter}>
                  <Text style={styles.statusMessageCount}>
                    {statusMessage.length}/100
                  </Text>
                  {statusMessageHasChanges && (
                    <TouchableOpacity
                      style={[styles.saveMessageButton, savingMessage && styles.saveMessageButtonDisabled]}
                      onPress={handleSaveStatusMessage}
                      disabled={savingMessage}
                    >
                      {savingMessage ? (
                        <Text style={styles.saveMessageButtonText}>Salvando...</Text>
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={16} color="#ffffff" />
                          <Text style={styles.saveMessageButtonText}>Salvar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}
        </View>

        {/* Links do Usuário */}
        <View style={styles.linksSection}>
          <View style={styles.linksHeaderRow}>
            <Text style={styles.sectionTitle}>Links</Text>
          </View>
          <View style={styles.linksSortRow}>
            <View style={styles.linksSortLeft}>
              <Text style={styles.linksSortLabel}>Ordenar por</Text>
              <View style={styles.linksSortSelect}>
                <SelectRow
                  label="Ordenar links"
                  value={linksSortMode}
                  options={[
                    { label: 'Personalizado', value: 'custom' },
                    { label: 'Data', value: 'date' },
                    { label: 'Nome', value: 'name' },
                    { label: 'Likes', value: 'likes' },
                  ]}
                  onChange={(value) => handleLinksSortChange(value as 'custom' | 'date' | 'name' | 'likes')}
                />
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.inlineAddLinkButton,
                hasReachedLinksLimit && styles.inlineAddLinkButtonDisabled,
              ]}
              onPress={openAddLinkModal}
              activeOpacity={0.8}
              disabled={hasReachedLinksLimit}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.inlineAddLinkText}>Novo</Text>
            </TouchableOpacity>
          </View>
          {hasReachedLinksLimit && (
            <TouchableOpacity
              style={styles.linksLimitCta}
              onPress={() => handleMenuPress('plans')}
              activeOpacity={0.8}
            >
              <Ionicons name="lock-closed-outline" size={14} color={COLORS.secondary.main} />
              <Text style={styles.linksLimitCtaText}>
                Limite do plano atingido ({userLinks.length}/{maxLinksAllowed}) • Adicionar plano
              </Text>
            </TouchableOpacity>
          )}
          {userLinks.length > 0 ? (
            userLinks.map((link, index) => {
              const thumbUri = link.imageUrl ? getImageUrl(link.imageUrl) : undefined;
              const hasThumb = Boolean(thumbUri);
              const desc =
                typeof link.description === 'string' && link.description.trim()
                  ? link.description.trim()
                  : '';

              const linkActions = (
                <View style={styles.linkActions}>
                  {linksSortMode === 'custom' && (
                    <>
                      <TouchableOpacity
                        style={[styles.linkActionButton, index === 0 && styles.linkActionButtonDisabled]}
                        onPress={(event) => {
                          event.stopPropagation();
                          handleMoveLink(index, 'up');
                        }}
                        disabled={index === 0}
                      >
                        <Ionicons name="chevron-up" size={16} color={COLORS.secondary.main} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.linkActionButton,
                          index === userLinks.length - 1 && styles.linkActionButtonDisabled,
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();
                          handleMoveLink(index, 'down');
                        }}
                        disabled={index === userLinks.length - 1}
                      >
                        <Ionicons name="chevron-down" size={16} color={COLORS.secondary.main} />
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={styles.linkActionButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      openEditLinkModal(link);
                    }}
                  >
                    <Ionicons name="create-outline" size={16} color={COLORS.secondary.main} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.linkActionButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      handleDeleteLink(link);
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.secondary.main} />
                  </TouchableOpacity>
                </View>
              );

              if (hasThumb) {
                return (
                  <TouchableOpacity
                    key={link._id}
                    style={[styles.linkCard, styles.linkCardStacked]}
                    onPress={() => {
                      if (link.url) {
                        Linking.openURL(link.url.startsWith('http') ? link.url : `https://${link.url}`);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: thumbUri }} style={styles.linkThumb} resizeMode="cover" />
                    <View style={styles.linkStackedFooter}>
                      {link.icon ? (
                        <View style={styles.linkIconRowCenteredOwn}>
                          <View style={styles.linkIconContainerSmall}>
                            <Text style={styles.linkIconEmoji}>{link.icon}</Text>
                          </View>
                        </View>
                      ) : null}
                      <View style={styles.linkTitleRowCenteredOwn}>
                        <Text style={[styles.linkTitle, styles.linkTitleStackedCenterOwn]} numberOfLines={2}>
                          {link.title}
                        </Text>
                        <View style={styles.linkActionsStackedAbs}>{linkActions}</View>
                      </View>
                      {desc ? (
                        <Text style={styles.linkDescriptionOwn} numberOfLines={2}>
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
                  style={styles.linkCard}
                  onPress={() => {
                    if (link.url) {
                      Linking.openURL(link.url.startsWith('http') ? link.url : `https://${link.url}`);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  {link.icon ? (
                    <View style={styles.linkIconContainer}>
                      <Text style={styles.linkIconEmoji}>{link.icon}</Text>
                    </View>
                  ) : null}
                  <View style={styles.linkRowNoThumbOwn}>
                    <Text style={styles.linkTitle} numberOfLines={2}>
                      {link.title}
                    </Text>
                    {desc ? (
                      <Text style={styles.linkDescriptionInlineOwn} numberOfLines={2}>
                        {desc}
                      </Text>
                    ) : null}
                  </View>
                  {linkActions}
                </TouchableOpacity>
              );
            })
          ) : (
            hasReachedLinksLimit ? (
              <View style={styles.addLinkButtonDisabled}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.tertiary} />
                <Text style={styles.addLinkTextDisabled}>Limite de links atingido</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.addLinkButton} onPress={openAddLinkModal}>
                <Ionicons name="add-circle-outline" size={24} color={COLORS.primary.main} />
                <Text style={styles.addLinkText}>Cadastrar Link</Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Selo verificado — mesmo fluxo do web (PRO ou PRO+, 2FA, POST /api/users/verification/submit) */}
        <View style={styles.verificationSection}>
          <View style={styles.linksHeaderRow}>
            <Text style={styles.sectionTitle}>Conta verificada</Text>
          </View>
          {accountVerificationLoading ? (
            <Text style={styles.verificationMuted}>Carregando status…</Text>
          ) : shouldShowVerifiedBadgeOnProfile(user) ? (
            <View style={styles.verificationCard}>
              <View style={styles.verificationCardHeader}>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.states.success} />
                <Text style={styles.verificationCardTitle}>Selo ativo</Text>
              </View>
              <Text style={styles.verificationBody}>
                Sua conta exibe o selo verificado ao lado do nome, alinhado ao que você vê no site.
              </Text>
            </View>
          ) : accountVerification?.status === 'pending' ? (
            <View style={styles.verificationCard}>
              <View style={styles.verificationCardHeader}>
                <Ionicons name="time-outline" size={22} color={COLORS.states.warning} />
                <Text style={styles.verificationCardTitle}>Em análise</Text>
              </View>
              <Text style={styles.verificationBody}>
                Nossa equipe analisa em até 48 horas. Você será notificado quando a análise terminar.
              </Text>
            </View>
          ) : accountVerification?.status === 'rejected' ? (
            <View style={styles.verificationCard}>
              <View style={styles.verificationCardHeader}>
                <Ionicons name="close-circle-outline" size={22} color={COLORS.states.error} />
                <Text style={styles.verificationCardTitle}>Solicitação não aprovada</Text>
              </View>
              {!!accountVerification?.rejectionReason && (
                <Text style={styles.verificationRejection}>
                  Motivo: {accountVerification.rejectionReason}
                </Text>
              )}
              <Text style={styles.verificationBody}>
                Corrija os pontos indicados e envie novamente. No site o fluxo está em Planos › Verificação de conta.
              </Text>
              {canRequestAccountVerification && user?.twoFactor?.enabled ? (
                <TouchableOpacity
                  style={styles.verificationCtaPrimary}
                  onPress={() => (navigation as any).navigate('AccountVerification')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="refresh-outline" size={18} color="#ffffff" />
                  <Text style={styles.verificationCtaPrimaryText}>Tentar novamente</Text>
                </TouchableOpacity>
              ) : !canRequestAccountVerification ? (
                <TouchableOpacity
                  style={styles.verificationCta}
                  onPress={() => (navigation as any).navigate('Plans')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.secondary.main} />
                  <Text style={styles.verificationCtaText}>Plano PRO ou PRO+ necessário</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.verificationCta}
                  onPress={() => (navigation as any).navigate('SecuritySettings')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.secondary.main} />
                  <Text style={styles.verificationCtaText}>Ativar 2FA em Segurança</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : accountVerification?.status === 'needs_review' ? (
            <View style={styles.verificationCard}>
              <Text style={styles.verificationBody}>
                Ajuste os documentos ou dados solicitados pela equipe. Depois você pode reenviar pela verificação de
                conta.
              </Text>
              {canRequestAccountVerification && user?.twoFactor?.enabled ? (
                <TouchableOpacity
                  style={styles.verificationCtaPrimary}
                  onPress={() => (navigation as any).navigate('AccountVerification')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="document-text-outline" size={18} color="#ffffff" />
                  <Text style={styles.verificationCtaPrimaryText}>Reenviar documentos</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.verificationCard}>
              <Text style={styles.verificationBody}>
                Obtenha o selo verificado com documentos e análise da equipe. Requisitos: plano PRO ou PRO+ e 2FA ativo,
                como no site (Configurações › Segurança).
              </Text>
              {!canRequestAccountVerification ? (
                <TouchableOpacity
                  style={styles.verificationCta}
                  onPress={() => (navigation as any).navigate('Plans')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.secondary.main} />
                  <Text style={styles.verificationCtaText}>Ver planos PRO / PRO+</Text>
                </TouchableOpacity>
              ) : !user?.twoFactor?.enabled ? (
                <TouchableOpacity
                  style={styles.verificationCta}
                  onPress={() => (navigation as any).navigate('SecuritySettings')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.secondary.main} />
                  <Text style={styles.verificationCtaText}>Ativar 2FA</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.verificationCtaPrimary}
                  onPress={() => (navigation as any).navigate('AccountVerification')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="document-text-outline" size={18} color="#ffffff" />
                  <Text style={styles.verificationCtaPrimaryText}>Enviar documentos</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Seção de Atalhos */}
        <View style={styles.shortcutsSectionHeader}>
          <Text style={styles.sectionTitle}>Atalhos</Text>
        </View>

        {/* Grid de Cards */}
        <View style={styles.menuGrid}>
          {menuOptions.map((option, index) => (
            <View key={option.id} style={styles.menuCardWrapper}>
              <MenuCard
                title={option.title}
                icon={option.icon}
                onPress={option.onPress}
                badgeCount={option.badgeCount}
                fullWidth
              />
            </View>
          ))}
        </View>

        {/* Botão Sair */}
        <View style={styles.logoutButtonContainer}>
          <Button
            variant="primary"
            size="md"
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            Sair
          </Button>
        </View>

        {/* Espaço extra no final */}
        <View style={{ height: 24 }} />
      </ScrollView>

      {userStories && (
        <StoryViewerModal
          visible={showStoryViewer}
          onClose={() => setShowStoryViewer(false)}
          storiesGroups={[userStories]}
          initialGroupIndex={0}
        />
      )}

      <ModalBottom visible={showLinkModal} onClose={closeLinkModal} maxHeight="65%">
        <View style={styles.linkModalHeader}>
          <Text style={styles.linkModalTitle}>{editingLink ? 'Editar Link' : 'Adicionar Link'}</Text>
          <TouchableOpacity onPress={closeLinkModal} disabled={savingLink}>
            <Ionicons name="close" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.linkModalContent}>
          <Text style={styles.linkModalLabel}>Título</Text>
          <TextInput
            style={styles.linkModalInput}
            value={linkForm.title}
            onChangeText={(text) => setLinkForm((prev) => ({ ...prev, title: text }))}
            placeholder="Ex: Meu Instagram"
            placeholderTextColor={COLORS.text.tertiary}
          />
          <Text style={styles.linkModalLabel}>URL</Text>
          <TextInput
            style={styles.linkModalInput}
            value={linkForm.url}
            onChangeText={(text) => setLinkForm((prev) => ({ ...prev, url: text }))}
            placeholder="https://..."
            autoCapitalize="none"
            keyboardType="url"
            placeholderTextColor={COLORS.text.tertiary}
          />
          <TouchableOpacity
            style={styles.linkVisibilityRow}
            onPress={() => setLinkForm((prev) => ({ ...prev, visible: !prev.visible }))}
            activeOpacity={0.7}
          >
            <Ionicons
              name={linkForm.visible ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={COLORS.secondary.main}
            />
            <Text style={styles.linkVisibilityText}>{linkForm.visible ? 'Link visível no perfil' : 'Link oculto'}</Text>
          </TouchableOpacity>
          <View style={styles.linkModalActions}>
            <Button variant="outline" size="md" onPress={closeLinkModal} style={styles.linkModalButton}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              onPress={handleSaveLink}
              loading={savingLink}
              style={styles.linkModalButton}
            >
              {editingLink ? 'Salvar' : 'Adicionar'}
            </Button>
          </View>
        </View>
      </ModalBottom>
      <CustomModal {...modalProps} onClose={hideModal} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  scrollContent: {
    padding: 16,
  },
  userSection: {
    alignItems: 'stretch',
    backgroundColor: COLORS.background.paper,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    minWidth: 0,
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  avatarInnerContainer: {
    position: 'relative',
  },
  avatarContainerWithStory: {
    borderWidth: 3,
    borderColor: COLORS.secondary.main,
    borderRadius: 44,
    padding: 2,
  },
  shareButton: {
    position: 'absolute',
    top: 0,
    right: -10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  statusBalloonContainer: {
    flexGrow: 0,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '72%',
  },
  statusBalloon: {
    flexGrow: 0,
    flexShrink: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  statusBalloonInner: {
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusMessageText: {
    flexShrink: 1,
  },
  statusBalloonText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text.primary,
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
  editStatusButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background.paper,
    borderWidth: 2,
    borderColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  verifiedIcon: {
    marginBottom: 2,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  planAndEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planType: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  statusSection: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  statusSkeletonContainer: {
    marginTop: 4,
    gap: 12,
  },
  statusSkeletonButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusSkeletonButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.background.tertiary,
  },
  statusSkeletonInput: {
    height: 92,
    borderRadius: 12,
    backgroundColor: COLORS.background.tertiary,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border.medium,
    backgroundColor: 'transparent',
  },
  statusButtonActive: {
    borderColor: COLORS.secondary.main,
    backgroundColor: `${COLORS.secondary.main}10`, // 10% opacity
  },
  statusButtonDisabled: {
    opacity: 0.5,
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  statusButtonTextActive: {
    color: COLORS.secondary.main,
  },
  statusHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.primary,
    flex: 1,
  },
  statusMessageContainer: {
    marginTop: 12,
  },
  statusMessageInput: {
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  statusMessageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusMessageCount: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  saveMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary.main,
  },
  saveMessageButtonDisabled: {
    opacity: 0.6,
  },
  saveMessageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  menuGrid: {
    alignItems: 'stretch',
    gap: 8,
  },
  shortcutsSectionHeader: {
    marginTop: 8,
    marginBottom: 10,
  },
  menuCardWrapper: {
    width: '100%',
    marginBottom: 8,
  },
  logoutButtonContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  logoutButton: {
    width: '100%',
  },
  verificationSection: {
    marginTop: 8,
    marginBottom: 8,
    gap: 10,
  },
  verificationMuted: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    paddingHorizontal: 4,
  },
  verificationCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    gap: 10,
  },
  verificationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verificationCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  verificationBody: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  verificationRejection: {
    fontSize: 14,
    color: COLORS.states.error,
    lineHeight: 20,
  },
  verificationCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.secondary.main,
    backgroundColor: `${COLORS.secondary.main}12`,
  },
  verificationCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.secondary.main,
  },
  verificationCtaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.secondary.main,
  },
  verificationCtaPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  linksSection: {
    marginTop: 24,
    marginBottom: 16,
    gap: 12,
  },
  linksHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  linksSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  linksSortLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linksSortLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    minWidth: 72,
  },
  linksSortSelect: {
    width: 150,
  },
  linksLimitCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.secondary.main,
    backgroundColor: `${COLORS.secondary.main}10`,
  },
  linksLimitCtaText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.secondary.main,
  },
  inlineAddLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.secondary.main,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  inlineAddLinkButtonDisabled: {
    opacity: 0.5,
  },
  inlineAddLinkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  linkCardStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 0,
    gap: 0,
  },
  linkThumb: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.background.tertiary,
  },
  linkStackedFooter: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
  },
  linkIconRowCenteredOwn: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  linkTitleRowCenteredOwn: {
    position: 'relative',
    width: '100%',
    paddingHorizontal: 12,
    paddingRight: 112,
    minHeight: 32,
    justifyContent: 'center',
  },
  linkTitleStackedCenterOwn: {
    flex: 0,
    width: '100%',
    textAlign: 'center',
  },
  linkActionsStackedAbs: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  linkIconContainerSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkRowNoThumbOwn: {
    flex: 1,
    minWidth: 0,
  },
  linkDescriptionOwn: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text.secondary,
  },
  linkDescriptionInlineOwn: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text.secondary,
  },
  linkIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkIconEmoji: {
    fontSize: 20,
  },
  linkTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  linkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkActionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkActionButtonDisabled: {
    opacity: 0.35,
  },
  addLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 20,
    gap: 12,
    borderWidth: 2,
    borderColor: COLORS.primary.main,
    borderStyle: 'dashed',
  },
  addLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  addLinkButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  addLinkTextDisabled: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.tertiary,
  },
  linkModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  linkModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  linkModalContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  linkModalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  linkModalInput: {
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: COLORS.text.primary,
  },
  linkVisibilityRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkVisibilityText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  linkModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  linkModalButton: {
    flex: 1,
  },
});
