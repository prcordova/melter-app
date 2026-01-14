import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { WalletButton } from './WalletButton';
import { NotificationButton } from './NotificationButton';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../theme/colors';
import { getAvatarUrl, getUserInitials } from '../utils/image';

interface HeaderProps {
  onLogoPress?: () => void;
}

export function Header({ 
  onLogoPress,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const handleProfilePress = () => {
    try {
      // Verificar se estamos dentro do ProfileStackNavigator
      const currentRouteName = navigation.getState()?.routes?.[navigation.getState()?.index || 0]?.name;
      const isInProfileStack = currentRouteName === 'MyShop' || currentRouteName === 'Product' || 
                               currentRouteName === 'Settings' || currentRouteName === 'ProfileMain';
      
      if (isInProfileStack) {
        // Estamos dentro do ProfileStackNavigator
        // O navigation já é o ProfileStackNavigator, então podemos resetar diretamente
        try {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'ProfileMain' }],
            })
          );
          return;
        } catch (resetError) {
          // Se não conseguir resetar, tentar navegar normalmente
          console.log('[Header] Erro ao resetar stack, tentando navegar:', resetError);
        }
      }
      
      // Se não estiver dentro do ProfileStackNavigator, navegar normalmente
      // Obter o TabNavigator: se estiver em uma tab, o parent direto é o TabNavigator
      const tabNavigator = navigation.getParent();
      
      if (tabNavigator) {
        // Navegar para ProfileStack (sem especificar screen, vai para a tela inicial)
        (tabNavigator as any).navigate('ProfileStack');
      } else {
        // Fallback: navegar diretamente
        navigation.navigate('ProfileStack');
      }
    } catch (error) {
      console.error('[Header] Erro ao navegar para perfil:', error);
      // Fallback: navegar diretamente
      try {
        navigation.navigate('ProfileStack');
      } catch (finalError) {
        console.error('[Header] Erro final na navegação:', finalError);
      }
    }
  };

  const handleWalletPress = () => {
    navigation.navigate('ProfileStack', {
      screen: 'Profile',
    });
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
          onPress={handleProfilePress} 
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
});


