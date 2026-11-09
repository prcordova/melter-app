import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import { CURRENT_TERMS_VERSION } from '../constants/terms';
import { SURFACE_RADIUS, type AppPalette } from '../theme/palettes';
import { CustomModal } from './CustomModal';
import { Button } from './Button';

function isOnTermsRoute(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;

  const walk = (navState: { routes?: { name: string; state?: unknown }[]; index?: number }): boolean => {
    const route = navState.routes?.[navState.index ?? 0];
    if (!route) return false;
    if (route.name === 'Terms') return true;
    if (route.state) return walk(route.state as { routes?: { name: string; state?: unknown }[]; index?: number });
    return false;
  };

  return walk(state as { routes?: { name: string; state?: unknown }[]; index?: number });
}

export function TermsGuard() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const navState = useNavigationState((state) => state);
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  const needsAcceptance = useMemo(() => {
    if (!user) return false;
    const userTermsVersion = user.termsAndPrivacy?.terms?.version || '1.0';
    const hasAccepted = user.termsAndPrivacy?.terms?.accepted || false;
    return !hasAccepted || userTermsVersion !== CURRENT_TERMS_VERSION;
  }, [user]);

  const onTermsScreen = isOnTermsRoute(navState);

  // Renderizado fora do Tab.Navigator: `navigation` é o stack raiz, então entra pela rota 'Main'.
  const openTerms = useCallback(() => {
    navigation.navigate('Main', { screen: 'ProfileStack', params: { screen: 'Terms' } });
  }, [navigation]);

  // Sempre montado e controlado por `visible`: desmontar um Modal aberto no Android pode deixá-lo preso na tela.
  return (
    <CustomModal visible={needsAcceptance && !onTermsScreen} closeOnBackdropPress={false} onClose={() => {}}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="document-text-outline" size={32} color={colors.secondary.main} />
        </View>
        <Text style={styles.title}>Aceite os Termos para continuar</Text>
        <Text style={styles.description}>
          Nossos Termos de Uso foram atualizados. Leia e aceite a nova versão para usar a plataforma.
        </Text>
        <Button variant="primary" responsive={false} onPress={openTerms} style={styles.button}>
          Ler e aceitar termos
        </Button>
      </View>
    </CustomModal>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    card: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: c.background.paper,
      borderRadius: SURFACE_RADIUS,
      borderWidth: 1,
      borderColor: c.divider,
      padding: 24,
      alignItems: 'center',
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.action.hover,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: c.text.primary,
      textAlign: 'center',
      marginBottom: 8,
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
      color: c.text.secondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    button: {
      width: '100%',
    },
  });
