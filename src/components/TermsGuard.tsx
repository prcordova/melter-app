import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { CURRENT_TERMS_VERSION } from '../constants/terms';
import { COLORS } from '../theme/colors';

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

  const needsAcceptance = useMemo(() => {
    if (!user) return false;
    const userTermsVersion = user.termsAndPrivacy?.terms?.version || '1.0';
    const hasAccepted = user.termsAndPrivacy?.terms?.accepted || false;
    return !hasAccepted || userTermsVersion !== CURRENT_TERMS_VERSION;
  }, [user]);

  const onTermsScreen = isOnTermsRoute(navState);

  useEffect(() => {
    if (!needsAcceptance || onTermsScreen) return;
    navigation.navigate('ProfileStack', { screen: 'Terms' });
  }, [needsAcceptance, onTermsScreen, navigation]);

  if (!needsAcceptance || onTermsScreen) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={() => undefined}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Aceite os Termos para continuar</Text>
          <Text style={styles.body}>
            Nossos Termos de Uso foram atualizados. Leia e aceite a nova versão para usar a plataforma.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('ProfileStack', { screen: 'Terms' })}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Ler e aceitar termos</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.background.paper,
    borderRadius: 16,
    padding: 24,
    gap: 12,
    zIndex: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    backgroundColor: COLORS.secondary.main,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
