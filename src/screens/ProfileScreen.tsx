import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { MenuCard } from '../components/MenuCard';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { COLORS } from '../theme/colors';
import { storiesApi, userApi } from '../services/api';
import { StoriesGroup } from '../types/feed';
import { showToast } from '../components/CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';

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
        const response = await storiesApi.getStories(true);
        if (response.success) {
          const storiesData = response.data?.stories || response.data || [];
          const group = storiesData.find((g: any) => g.user._id === user?.id);
          if (group) setUserStories(group);
        }
      } catch (e) {}
    };
    if (user?.id) fetchMyStories();
  }, [user?.id]);

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

  // Opções do menu (baseado no dropdown do Melter web)
  const menuOptions = [
    { id: 'profile', title: 'Ver Perfil', icon: '👤', onPress: () => handleMenuPress('profile') },
    { id: 'shop', title: 'Minha Loja', icon: '🏪', onPress: () => handleMenuPress('shop') },
    { id: 'purchases', title: 'Compras', icon: '🛍️', onPress: () => handleMenuPress('purchases') },
    { id: 'wallet', title: 'Carteira', icon: '💰', onPress: () => handleMenuPress('wallet'), badgeCount: 0 },
    { id: 'settings', title: 'Configurações', icon: '⚙️', onPress: () => handleMenuPress('settings') },
    { id: 'plans', title: user?.plan?.type === 'FREE' ? 'Upgrade' : 'Planos', icon: '⭐', onPress: () => handleMenuPress('plans') },
    { id: 'download', title: 'Download', icon: '📱', onPress: () => handleMenuPress('download') },
    { id: 'terms', title: 'Termos', icon: '📄', onPress: () => handleMenuPress('terms') },
    { id: 'logout', title: 'Sair', icon: '🚪', onPress: handleLogout, variant: 'danger' as const },
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
            <View style={[
              styles.avatarContainer,
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
            {/* Botão de editar status (estilo balão de fala) */}
            <TouchableOpacity
              style={styles.editStatusButton}
              onPress={() => {
                // Scroll para a seção de status
                // Por enquanto, apenas mostra um toast
                showToast.info('Status', 'Use os botões abaixo para alterar seu status');
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

        {/* Status Selector */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Status Atual</Text>
          {loadingStatus ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary.main} />
            </View>
          ) : (
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
          )}
        </View>

        {/* Mensagem de Status */}
        <View style={styles.statusMessageSection}>
          <Text style={styles.sectionTitle}>Mensagem de Status</Text>
          <TextInput
            style={styles.statusMessageInput}
            placeholder="Digite uma mensagem..."
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

        {/* Grid de Cards */}
        <View style={styles.menuGrid}>
          {menuOptions.map((option, index) => (
            <View key={option.id} style={styles.menuCardWrapper}>
              <MenuCard
                title={option.title}
                icon={option.icon}
                onPress={option.onPress}
                badgeCount={option.badgeCount}
                variant={option.variant}
              />
            </View>
          ))}
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
    marginBottom: 0,
  },
  avatarContainerWithStory: {
    borderWidth: 3,
    borderColor: COLORS.secondary.main,
    borderRadius: 44,
    padding: 2,
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
  statusMessageSection: {
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
    marginHorizontal: -6,
  },
  menuCardWrapper: {
    width: '50%', // 2 cards por linha
  },
});
