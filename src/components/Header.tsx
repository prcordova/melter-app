import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { WalletButton } from './WalletButton';
import { NotificationButton } from './NotificationButton';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../theme/colors';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { userApi } from '../services/api';
import { API_CONFIG } from '../config/api.config';
import { showToast } from './CustomToast';
import { getTabNavigator } from '../navigation/get-tab-navigator';

interface HeaderProps {
  onLogoPress?: () => void;
}

type UserVisibility = 'online' | 'busy' | 'offline';

export function Header({ 
  onLogoPress,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [statusVisibility, setStatusVisibility] = useState<UserVisibility>('online');

  const closeMenu = useCallback(() => setMenuVisible(false), []);

  const loadStatus = useCallback(async () => {
    try {
      const response = await userApi.getStatus();
      if (response.success && response.data?.visibility) {
        setStatusVisibility(response.data.visibility as UserVisibility);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (menuVisible && user) {
      loadStatus();
    }
  }, [menuVisible, user, loadStatus]);

  const tabNavigator = getTabNavigator(navigation);

  const goProfileStack = useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      closeMenu();
      try {
        const payload =
          params !== undefined && Object.keys(params).length > 0
            ? { screen, params }
            : { screen };
        if (tabNavigator) {
          (tabNavigator as any).navigate('ProfileStack', payload);
        } else {
          navigation.navigate('ProfileStack', payload);
        }
      } catch (e) {
        console.error('[Header] Navegação ProfileStack:', e);
      }
    },
    [navigation, tabNavigator, closeMenu]
  );

  const goUserProfile = useCallback(() => {
    if (!user?.username) return;
    closeMenu();
    try {
      if (tabNavigator) {
        (tabNavigator as any).navigate('UserProfile', { username: user.username });
      } else {
        navigation.navigate('UserProfile', { username: user.username });
      }
    } catch (e) {
      console.error('[Header] Navegação UserProfile:', e);
    }
  }, [navigation, tabNavigator, user?.username, closeMenu]);

  const statusLabel = (v: UserVisibility) => {
    if (v === 'online') return 'Online';
    if (v === 'busy') return 'Ocupado';
    return 'Oculto';
  };

  const handleStatusPress = () => {
    Alert.alert('Status', 'Escolha sua visibilidade', [
      {
        text: 'Online',
        onPress: async () => {
          try {
            const res = await userApi.updateStatus({ visibility: 'online' });
            if (res.success) {
              setStatusVisibility('online');
              showToast.success('Sucesso', 'Status atualizado');
            } else showToast.error('Erro', 'Não foi possível atualizar o status');
          } catch {
            showToast.error('Erro', 'Não foi possível atualizar o status');
          }
        },
      },
      {
        text: 'Ocupado',
        onPress: async () => {
          try {
            const res = await userApi.updateStatus({ visibility: 'busy' });
            if (res.success) {
              setStatusVisibility('busy');
              showToast.success('Sucesso', 'Status atualizado');
            } else showToast.error('Erro', 'Não foi possível atualizar o status');
          } catch {
            showToast.error('Erro', 'Não foi possível atualizar o status');
          }
        },
      },
      {
        text: 'Oculto',
        onPress: async () => {
          try {
            const res = await userApi.updateStatus({ visibility: 'offline' });
            if (res.success) {
              setStatusVisibility('offline');
              showToast.success('Sucesso', 'Status atualizado');
            } else showToast.error('Erro', 'Não foi possível atualizar o status');
          } catch {
            showToast.error('Erro', 'Não foi possível atualizar o status');
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const openWebPath = async (path: string) => {
    closeMenu();
    const base = (API_CONFIG.APP_URL || 'https://melter.com.br').replace(/\/$/, '');
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else showToast.error('Erro', 'Não foi possível abrir o link');
    } catch {
      showToast.error('Erro', 'Não foi possível abrir o link');
    }
  };

  const handleLogoutPress = () => {
    closeMenu();
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  const handleWalletPress = () => {
    goProfileStack('WalletSettings');
  };

  const avatarSource = getAvatarUrl(user?.avatar);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* Logo Esquerda */}
      <TouchableOpacity onPress={onLogoPress} activeOpacity={0.7} style={styles.logoContainer}>
        <Text style={styles.logo}>Melter</Text>
      </TouchableOpacity>

      {/* Centro: Carteira */}
      <View style={styles.centerContainer}>
        <WalletButton onPress={handleWalletPress} />
      </View>

      {/* Direita: Notificações e Avatar */}
      <View style={styles.rightContainer}>
        <NotificationButton />
        
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
          style={styles.avatarButton}
        >
          {avatarSource ? (
            <Image source={{ uri: avatarSource }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {getUserInitials(user?.username)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {user && (
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={closeMenu}
        >
          <Pressable style={styles.menuOverlay} onPress={closeMenu}>
            <View
              style={[
                styles.menuPanel,
                {
                  top: insets.top + 52,
                },
              ]}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <ScrollView
                  style={styles.menuScroll}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                >
                  <TouchableOpacity style={styles.menuHeaderRow} onPress={goUserProfile} activeOpacity={0.7}>
                    {avatarSource ? (
                      <Image source={{ uri: avatarSource }} style={styles.menuAvatar} />
                    ) : (
                      <View style={[styles.menuAvatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarText}>{getUserInitials(user.username)}</Text>
                      </View>
                    )}
                    <View style={styles.menuHeaderText}>
                      <Text style={styles.menuUsername} numberOfLines={1}>
                        {user.username}
                      </Text>
                      <Text style={styles.menuPlan}>{user.plan?.type || 'FREE'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
                  </TouchableOpacity>

                  <View style={styles.menuDivider} />

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => goProfileStack('AppearanceSettings')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="color-palette-outline" size={20} color={COLORS.text.secondary} />
                    <Text style={styles.menuRowLabel}>Editar perfil</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => goProfileStack('LinksSettings')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="link-outline" size={20} color={COLORS.text.secondary} />
                    <Text style={styles.menuRowLabel}>Editar links</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuRow} onPress={handleStatusPress} activeOpacity={0.7}>
                    <Ionicons name="radio-button-on-outline" size={20} color={COLORS.text.secondary} />
                    <Text style={styles.menuRowLabel}>
                      Status: {statusLabel(statusVisibility)}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={COLORS.text.tertiary} style={styles.menuRowChevron} />
                  </TouchableOpacity>

                  <View style={styles.menuDivider} />

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() =>
                      user.username &&
                      goProfileStack('MyShop', { username: user.username })
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons name="storefront-outline" size={20} color={COLORS.text.secondary} />
                    <Text style={styles.menuRowLabel}>Minha loja</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => goProfileStack('Purchases')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="bag-handle-outline" size={20} color={COLORS.text.secondary} />
                    <Text style={styles.menuRowLabel}>Minhas compras</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => goProfileStack('Settings')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="settings-outline" size={20} color={COLORS.text.secondary} />
                    <Text style={styles.menuRowLabel}>Configurações</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => goProfileStack('Plans')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="ribbon-outline" size={20} color={COLORS.text.secondary} />
                    <Text style={styles.menuRowLabel}>
                      {user.plan?.type === 'FREE' ? 'Upgrade' : 'Gerenciar plano'}
                    </Text>
                  </TouchableOpacity>

                  {user.accountType === 'admin' && (
                    <TouchableOpacity
                      style={styles.menuRow}
                      onPress={() => openWebPath('/admin')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="shield-outline" size={20} color={COLORS.states.error} />
                      <Text style={[styles.menuRowLabel, styles.menuRowAdmin]}>Painel admin</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => openWebPath('/download')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="download-outline" size={20} color={COLORS.text.secondary} />
                    <Text style={styles.menuRowLabel}>Baixar app</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => goProfileStack('Terms')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="document-text-outline" size={20} color={COLORS.text.secondary} />
                    <Text style={styles.menuRowLabel}>Termos</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuRow} onPress={handleLogoutPress} activeOpacity={0.7}>
                    <Ionicons name="log-out-outline" size={20} color={COLORS.states.error} />
                    <Text style={[styles.menuRowLabel, styles.menuRowDanger]}>Sair</Text>
                  </TouchableOpacity>
                </ScrollView>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  logoContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 2,
    alignItems: 'center',
  },
  rightContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary.main,
    letterSpacing: -0.5,
  },
  avatarButton: {
    marginLeft: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background.tertiary,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.secondary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  menuPanel: {
    position: 'absolute',
    right: 12,
    width: 280,
    maxHeight: '72%',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  menuScroll: {
    maxHeight: 440,
  },
  menuHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  menuAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.tertiary,
  },
  menuHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  menuUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  menuPlan: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
    marginHorizontal: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  menuRowLabel: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  menuRowChevron: {
    marginLeft: 'auto',
  },
  menuRowDanger: {
    color: COLORS.states.error,
    fontWeight: '600',
  },
  menuRowAdmin: {
    color: COLORS.states.error,
    fontWeight: '700',
  },
});


