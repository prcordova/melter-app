import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { verifyBiometricIdentity } from '../services/biometricLogin';
import { formatBiometricLockTimeout, getBiometricLockTimeout } from '../lib/biometric-lock';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';

type Props = {
  visible: boolean;
  onUnlocked: () => void;
  onLogout: () => void;
};

export function BiometricUnlockModal({ visible, onUnlocked, onLogout }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockTimeout, setLockTimeout] = useState(getBiometricLockTimeout);
  const [invalidated, setInvalidated] = useState(false);

  useEffect(() => {
    if (visible) {
      setLockTimeout(getBiometricLockTimeout());
      setInvalidated(false);
      setError(null);
    }
  }, [visible]);

  const tryUnlock = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await verifyBiometricIdentity();
      if (result === 'success') {
        onUnlocked();
      } else if (result === 'invalidated') {
        setInvalidated(true);
        setError(
          'A biometria deste aparelho mudou (ex.: nova digital cadastrada). Por segurança, entre de novo com sua senha.'
        );
      } else {
        setError('Não foi possível confirmar a biometria.');
      }
    } catch {
      setError('Erro ao usar biometria. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Ionicons name="finger-print" size={48} color={colors.secondary.main} style={styles.icon} />
          <Text style={styles.title}>Melter bloqueado</Text>
          <Text style={styles.subtitle}>
            Confirme com {Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'impressão digital ou rosto'} para continuar.
          </Text>

          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.secondary.main} />
            <Text style={styles.infoText}>
              Proteção extra do login por biometria: pedimos sua confirmação ao abrir o app e após{' '}
              {lockTimeout === null ? 'um período' : formatBiometricLockTimeout(lockTimeout)} sem uso. Você pode
              alterar ou desativar esse bloqueio em{' '}
              <Text style={styles.infoBold}>Perfil → Configurações → Preferências</Text>.
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {invalidated ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={onLogout} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Entrar com senha</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.primaryBtn, busy && styles.btnDisabled]}
                onPress={tryUnlock}
                disabled={busy}
                activeOpacity={0.85}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Desbloquear</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={onLogout} disabled={busy}>
                <Text style={styles.secondaryBtnText}>Sair da conta</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: c.background.paper,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: c.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: c.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
    backgroundColor: c.background.tertiary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: c.text.secondary,
  },
  infoBold: {
    fontWeight: '600',
    color: c.text.primary,
  },
  error: {
    color: c.states.error,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: c.secondary.main,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: c.text.secondary,
    fontSize: 15,
    fontWeight: '500',
  },
});
