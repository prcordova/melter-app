import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { MenuCard } from '../components/MenuCard';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { Button } from '../components/Button';
import { COLORS } from '../theme/colors';
import { storiesApi, userApi } from '../services/api';
import { StoriesGroup } from '../types/feed';
import { showToast } from '../components/CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';

type UserStatus = 'online' | 'busy' | 'offline';

import { Avatar } from '../components/Avatar';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

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

  // Carregar links do usuário
  React.useEffect(() => {
    const fetchUserLinks = async () => {
      try {
        if (!user?.id) return;
        const response = await userApi.getMyProfile();
        if (response.success && response.data) {
          setUserLinks(response.data.links || []);
        }
      } catch (e) {
        console.error('Erro ao buscar links:', e);
      }
    };
    if (user?.id) fetchUserLinks();
  }, [user?.id]);

  // Recarregar links quando voltar da tela de links
  useFocusEffect(
    useCallback(() => {
      const fetchUserLinks = async () => {
        try {
          if (!user?.id) return;
          const response = await userApi.getMyProfile();
          if (response.success && response.data) {
            setUserLinks(response.data.links || []);
          }
        } catch (e) {
          console.error('Erro ao buscar links:', e);
        }
      };
      if (user?.id) fetchUserLinks();
    }, [user?.id])
  );

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
    { id: 'profile', title: 'Ver Perfil', icon: '👤', onPress: () => handleMenuPress('profile') },
    { id: 'shop', title: 'Minha Loja', icon: '🏪', onPress: () => handleMenuPress('shop') },
    { id: 'purchases', title: 'Compras', icon: '🛍️', onPress: () => handleMenuPress('purchases') },
    { id: 'wallet', title: 'Carteira', icon: '💰', onPress: () => handleMenuPress('wallet'), badgeCount: 0 },
    { id: 'promotions', title: 'Promoções', icon: '🎁', onPress: () => handleMenuPress('promotions') },
    { id: 'referral', title: 'Indique e Ganhe', icon: '🎯', onPress: () => handleMenuPress('referral') },
    { id: 'settings', title: 'Configurações', icon: '⚙️', onPress: () => handleMenuPress('settings') },
    { id: 'plans', title: user?.plan?.type === 'FREE' ? 'Upgrade' : 'Planos', icon: '⭐', onPress: () => handleMenuPress('plans') },
    { id: 'terms', title: 'Termos', icon: '📄', onPress: () => handleMenuPress('terms') },
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
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarContainer}>
              <View style={[
                styles.avatarInnerContainer,
                userStories && styles.avatarContainerWithStory
              ]}>
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
              {/* Botão de compartilhar */}
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareProfile}
              >
                <Ionicons name="share-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
              
              {/* Balão de status (mensagem de status) */}
              {statusMessage && statusMessage.trim() && (
                <View style={styles.statusBalloonContainer}>
                  <View style={styles.statusBalloon}>
                    <Text style={styles.statusBalloonText} numberOfLines={2}>
                      {statusMessage}
                    </Text>
                  </View>
                  {/* Seta do balão apontando para o avatar */}
                  <View style={styles.statusBalloonArrow} />
                </View>
              )}
            </View>
            {/* Botão de editar status (estilo balão de fala) */}
            <TouchableOpacity
              style={styles.editStatusButton}
              onPress={() => {
                // Focar no campo de mensagem de status
                setTimeout(() => {
                  statusMessageInputRef.current?.focus();
                }, 100);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.primary.main} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => handleMenuPress('profile')}>
            <Text style={styles.username}>@{user?.username}</Text>
          </TouchableOpacity>
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary.main} />
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
                        <ActivityIndicator size="small" color="#ffffff" />
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
          <Text style={styles.sectionTitle}>Links</Text>
          {userLinks.length > 0 ? (
            userLinks.map((link) => (
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
                {link.icon && (
                  <View style={styles.linkIconContainer}>
                    <Text style={styles.linkIconEmoji}>{link.icon}</Text>
                  </View>
                )}
                <Text style={styles.linkTitle}>{link.title}</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
              </TouchableOpacity>
            ))
          ) : (
            <TouchableOpacity
              style={styles.addLinkButton}
              onPress={() => {
                (navigation as any).navigate('LinksSettings');
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color={COLORS.primary.main} />
              <Text style={styles.addLinkText}>Cadastrar Link</Text>
            </TouchableOpacity>
          )}
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
              />
            </View>
          ))}
        </View>

        {/* Botão Sair */}
        <View style={styles.logoutButtonContainer}>
          <Button
            variant="ghost"
            size="md"
            onPress={handleLogout}
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
    alignItems: 'center',
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
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 0,
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
    position: 'absolute',
    left: 100, // Avatar width (80) + padding (20)
    top: '50%',
    marginTop: -20, // Aproximadamente metade da altura do balão
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBalloon: {
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
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
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
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuCardWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  logoutButtonContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  linksSection: {
    marginTop: 24,
    marginBottom: 16,
    gap: 12,
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
});
