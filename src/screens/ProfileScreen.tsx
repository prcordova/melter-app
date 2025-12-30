import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { MenuCard } from '../components/MenuCard';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { COLORS } from '../theme/colors';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { storiesApi } from '../services/api';
import { StoriesGroup } from '../types/feed';
import { showToast } from '../components/CustomToast';

type UserStatus = 'online' | 'busy' | 'offline';

import { Avatar } from '../components/Avatar';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  const [status, setStatus] = useState<UserStatus>('online');
  const [statusMessage, setStatusMessage] = useState('');
  const [userStories, setUserStories] = useState<StoriesGroup | null>(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);

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

  // Se for admin, adicionar painel admin
  if (user?.accountType === 'admin') {
    menuOptions.splice(6, 0, {
      id: 'admin',
      title: 'Admin',
      icon: '👑',
      onPress: () => handleMenuPress('admin'),
    });
  }

  const handleStatusChange = (newStatus: UserStatus) => {
    setStatus(newStatus);
    // TODO: Enviar para API
    console.log('Status alterado para:', newStatus);
  };

  const handleStatusMessageChange = (message: string) => {
    setStatusMessage(message);
    // TODO: Debounce e enviar para API
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
          <TouchableOpacity onPress={() => handleMenuPress('profile')}>
            <Text style={styles.username}>@{user?.username}</Text>
          </TouchableOpacity>
          <Text style={styles.planType}>{user?.plan?.type || 'FREE'}</Text>
        </View>

        {/* Status Selector */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Status Atual</Text>
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === 'online' && styles.statusButtonActive,
              ]}
              onPress={() => handleStatusChange('online')}
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
              ]}
              onPress={() => handleStatusChange('busy')}
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
              ]}
              onPress={() => handleStatusChange('offline')}
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
          />
          <Text style={styles.statusMessageCount}>
            {statusMessage.length}/100
          </Text>
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
  avatarContainer: {
    marginBottom: 12,
  },
  avatarContainerWithStory: {
    borderWidth: 3,
    borderColor: COLORS.secondary.main,
    borderRadius: 44,
    padding: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secondary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background.tertiary,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  planType: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
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
  statusMessageCount: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    textAlign: 'right',
    marginTop: 4,
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

