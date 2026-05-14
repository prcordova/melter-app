import React, { useState } from 'react';
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
import { COLORS } from '../theme/colors';

type Props = {
  visible: boolean;
  onUnlocked: () => void;
  onLogout: () => void;
};

export function BiometricUnlockModal({ visible, onUnlocked, onLogout }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tryUnlock = async () => {
    setError(null);
    setBusy(true);
    try {
      const ok = await verifyBiometricIdentity();
      if (ok) {
        onUnlocked();
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
          <Ionicons name="finger-print" size={48} color={COLORS.secondary.main} style={styles.icon} />
          <Text style={styles.title}>Melter bloqueado</Text>
          <Text style={styles.subtitle}>
            Confirme com {Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'impressão digital ou rosto'} para continuar.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#ffffff',
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
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: COLORS.secondary.main,
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
    color: '#64748b',
    fontSize: 15,
    fontWeight: '500',
  },
});
