import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BackButton } from '../../components/BackButton';
import { COLORS } from '../../theme/colors';
import { userApi } from '../../services/api';
import { showToast } from '../../components/CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { useCustomModal } from '../../components/CustomModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BlockedUser {
  userId: string;
  username: string;
  avatar?: string;
  blockedAt: string;
}

export function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { showConfirm } = useCustomModal();

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const response = await userApi.getBlockedUsers();

      if (response.success && response.data) {
        setBlockedUsers(response.data);
      }
    } catch (error: any) {
      console.error('Erro ao buscar usuários bloqueados:', error);
      showToast.error('Erro', 'Erro ao carregar usuários bloqueados');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (user: BlockedUser) => {
    try {
      setUnblocking(user.userId);
      const response = await userApi.unblockUser(user.username);

      if (response.success) {
        showToast.success('Sucesso', response.message || 'Usuário desbloqueado com sucesso');
        setBlockedUsers(prev => prev.filter(u => u.userId !== user.userId));
      } else {
        showToast.error('Erro', response.message || 'Erro ao desbloquear usuário');
      }
    } catch (error: any) {
      console.error('Erro ao desbloquear usuário:', error);
      showToast.error('Erro', error.response?.data?.message || 'Erro ao desbloquear usuário');
    } finally {
      setUnblocking(null);
    }
  };

  const openUnblockDialog = (user: BlockedUser) => {
    showConfirm(
      'Desbloquear Usuário',
      `Tem certeza que deseja desbloquear @${user.username}? Você poderá ver o conteúdo e interagir com este usuário novamente.`,
      () => handleUnblock(user),
      {
        confirmText: 'Desbloquear',
        cancelText: 'Cancelar',
      }
    );
  };

  const handleUserPress = (username: string) => {
    (navigation as any).navigate('UserProfile', { username });
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <BackButton title="Configurações" />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>👁️ Privacidade</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.secondary.main} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton title="Configurações" />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>👁️ Privacidade</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          Gerencie os usuários que você bloqueou. Usuários bloqueados não podem ver seu conteúdo nem interagir com você.
        </Text>

        {blockedUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-off-outline" size={64} color={COLORS.text.tertiary} />
            <Text style={styles.emptyTitle}>Nenhum usuário bloqueado</Text>
            <Text style={styles.emptyDescription}>
              Você ainda não bloqueou nenhum usuário. Quando bloquear alguém, eles aparecerão aqui.
            </Text>
          </View>
        ) : (
          <View style={styles.usersList}>
            {blockedUsers.map((user) => (
              <View key={user.userId} style={styles.userCard}>
                <TouchableOpacity
                  style={styles.userInfo}
                  onPress={() => handleUserPress(user.username)}
                  activeOpacity={0.7}
                >
                  <Avatar
                    user={{ username: user.username, avatar: user.avatar }}
                    size={48}
                  />
                  <View style={styles.userDetails}>
                    <Text style={styles.username}>@{user.username}</Text>
                    <Text style={styles.blockedDate}>
                      Bloqueado em {format(new Date(user.blockedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </Text>
                  </View>
                </TouchableOpacity>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => openUnblockDialog(user)}
                  disabled={unblocking === user.userId}
                  loading={unblocking === user.userId}
                  style={styles.unblockButton}
                >
                  {unblocking === user.userId ? 'Desbloqueando...' : 'Desbloquear'}
                </Button>
              </View>
            ))}
          </View>
        )}
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
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  scrollContent: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    gap: 12,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  blockedDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  unblockButton: {
    minWidth: 100,
  },
});

