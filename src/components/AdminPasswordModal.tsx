import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { COLORS } from '../theme/colors';
import { setAdminSessionToken } from '../lib/admin-session';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (adminSessionToken: string) => void;
};

export function AdminPasswordModal({ visible, onClose, onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setPassword('');
      setError('');
    }
  }, [visible]);

  const submit = async () => {
    const p = password.trim();
    if (!p) {
      setError('Digite a senha de administrador');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/api/admin/verify-password', { password });
      const data = response.data as { success?: boolean; data?: { adminSessionToken?: string }; message?: string };
      if (data?.success && data.data?.adminSessionToken) {
        await setAdminSessionToken(data.data.adminSessionToken);
        onSuccess(data.data.adminSessionToken);
        onClose();
      } else {
        setError(data?.message || 'Senha incorreta');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erro ao verificar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.card, { marginBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.title}>Senha de administrador</Text>
          <Text style={styles.subtitle}>Necessário para moderar conteúdo de outros utilizadores.</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="Senha"
            placeholderTextColor={COLORS.text.tertiary}
            editable={!loading}
            autoCapitalize="none"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.row}>
            <TouchableOpacity style={styles.btnGhost} onPress={onClose} disabled={loading}>
              <Text style={styles.btnGhostText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={submit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Confirmar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  error: {
    color: COLORS.states.error,
    fontSize: 13,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  btnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  btnGhostText: {
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: COLORS.secondary.main,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    minWidth: 110,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
