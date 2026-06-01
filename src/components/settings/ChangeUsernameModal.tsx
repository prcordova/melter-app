import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { userApi } from '../../services/api';
import { showToast } from '../CustomToast';
import { Button } from '../Button';
import { COLORS } from '../../theme/colors';
import { validateUsername } from '../../lib/validation/username';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type AvailabilityState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available' }
  | { status: 'unavailable'; message: string }
  | { status: 'invalid'; message: string };

type ChangeStatus = {
  canChange: boolean;
  currentUsername: string;
  nextChangeAt: string | null;
  cooldownDays: number;
};

export function ChangeUsernameModal({ visible, onClose }: Props) {
  const { user, refreshUser } = useAuth();

  const [loadingStatus, setLoadingStatus] = useState(false);
  const [changeStatus, setChangeStatus] = useState<ChangeStatus | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [password, setPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityState>({ status: 'idle' });
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const resetForm = useCallback(() => {
    setNewUsername('');
    setPassword('');
    setEmailCode('');
    setShowPassword(false);
    setAvailability({ status: 'idle' });
    setCodeSent(false);
  }, []);

  const loadChangeStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await userApi.getUsernameChangeStatus();
      if (res.success && res.data) {
        setChangeStatus(res.data as ChangeStatus);
      }
    } catch {
      showToast.error('Erro', 'Não foi possível carregar o status da troca de @.');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      resetForm();
      void loadChangeStatus();
    }
  }, [visible, resetForm, loadChangeStatus]);

  const checkAvailability = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        setAvailability({ status: 'idle' });
        return;
      }

      const parsed = validateUsername(trimmed);
      if (!parsed.ok) {
        setAvailability({ status: 'invalid', message: parsed.message });
        return;
      }

      const current = (changeStatus?.currentUsername || user?.username || '').toLowerCase();
      if (trimmed.toLowerCase() === current) {
        setAvailability({ status: 'unavailable', message: 'É o mesmo @ atual' });
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setAvailability({ status: 'checking' });
      try {
        const res = await userApi.checkUsernameAvailability(trimmed, controller.signal);
        if (controller.signal.aborted) return;

        const data = res.data as { available?: boolean; reason?: string; message?: string };
        if (data?.available) {
          setAvailability({ status: 'available' });
        } else if (data?.reason === 'cooldown') {
          setAvailability({
            status: 'unavailable',
            message: 'Este @ está em período de reserva após troca recente.',
          });
        } else {
          setAvailability({
            status: 'unavailable',
            message: data?.message || 'Este @ já está em uso',
          });
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        if ((err as { code?: string })?.code === 'ERR_CANCELED') return;
        setAvailability({ status: 'idle' });
      }
    },
    [changeStatus?.currentUsername, user?.username]
  );

  const handleUsernameChange = (value: string) => {
    setNewUsername(value);
    setCodeSent(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void checkAvailability(value);
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const handleSendCode = async () => {
    if (availability.status !== 'available') {
      showToast.error('Erro', 'Escolha um @ disponível antes de solicitar o código.');
      return;
    }
    setSendingCode(true);
    try {
      const res = await userApi.sendUsernameChangeCode(newUsername.trim());
      if (res.success) {
        setCodeSent(true);
        showToast.success('Código enviado', res.message || 'Verifique seu e-mail.');
      }
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      showToast.error('Erro', msg || 'Não foi possível enviar o código.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleConfirm = async () => {
    if (!changeStatus?.canChange) return;
    if (availability.status !== 'available') {
      showToast.error('Erro', 'Escolha um @ disponível.');
      return;
    }
    if (!password || emailCode.trim().length !== 6) {
      showToast.error('Erro', 'Informe a senha e o código de 6 dígitos do e-mail.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await userApi.updateUsername({
        newUsername: newUsername.trim(),
        password,
        emailCode: emailCode.trim(),
      });

      if (res.success) {
        if (res.newToken) {
          await AsyncStorage.setItem('token', res.newToken);
        }
        await refreshUser();
        showToast.success('Sucesso', res.message || '@ atualizado com sucesso.');
        onClose();
      }
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      showToast.error('Erro', msg || 'Não foi possível alterar o @.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatNextChangeDate = (iso: string | null) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const availabilityHint = (() => {
    switch (availability.status) {
      case 'checking':
        return 'Verificando disponibilidade…';
      case 'available':
        return 'Disponível';
      case 'invalid':
      case 'unavailable':
        return availability.message;
      default:
        return null;
    }
  })();

  const availabilityColor =
    availability.status === 'available'
      ? COLORS.states.success
      : availability.status === 'invalid' || availability.status === 'unavailable'
        ? COLORS.states.error
        : COLORS.text.secondary;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={submitting ? undefined : onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Alterar @</Text>
          <TouchableOpacity onPress={onClose} disabled={submitting}>
            <Ionicons name="close" size={28} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {loadingStatus ? (
            <ActivityIndicator color={COLORS.primary.main} style={{ marginVertical: 24 }} />
          ) : (
            <>
              <Text style={styles.info}>
                Você pode trocar o @ a cada {changeStatus?.cooldownDays ?? 14} dias. Será necessário
                confirmar com senha e código por e-mail.
              </Text>

              {!changeStatus?.canChange && changeStatus?.nextChangeAt ? (
                <View style={styles.alert}>
                  <Text style={styles.alertText}>
                    Próxima troca disponível em: {formatNextChangeDate(changeStatus.nextChangeAt)}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.label}>@ atual</Text>
              <Text style={styles.currentUser}>@{user?.username || changeStatus?.currentUsername}</Text>

              <Text style={styles.label}>Novo @</Text>
              <TextInput
                style={styles.input}
                value={newUsername}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
                editable={changeStatus?.canChange && !submitting}
                placeholder="novo_username"
              />
              {availabilityHint ? (
                <Text style={[styles.hint, { color: availabilityColor }]}>{availabilityHint}</Text>
              ) : null}

              {changeStatus?.canChange && availability.status === 'available' ? (
                <Button
                  variant="outline"
                  onPress={() => void handleSendCode()}
                  disabled={sendingCode || codeSent}
                  loading={sendingCode}
                  style={{ marginTop: 12 }}
                >
                  {codeSent ? 'Código enviado' : 'Enviar código por e-mail'}
                </Button>
              ) : null}

              {codeSent ? (
                <>
                  <Text style={[styles.label, { marginTop: 16 }]}>Código do e-mail</Text>
                  <TextInput
                    style={styles.input}
                    value={emailCode}
                    onChangeText={setEmailCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!submitting}
                    placeholder="000000"
                  />

                  <Text style={[styles.label, { marginTop: 16 }]}>Senha</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      editable={!submitting}
                      placeholder="Sua senha"
                    />
                    <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color={COLORS.text.secondary}
                      />
                    </TouchableOpacity>
                  </View>

                  <Button
                    onPress={() => void handleConfirm()}
                    disabled={submitting}
                    loading={submitting}
                    style={{ marginTop: 20 }}
                  >
                    Confirmar alteração
                  </Button>
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  info: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  alert: {
    backgroundColor: COLORS.states.warning + '25',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  alertText: {
    fontSize: 14,
    color: COLORS.states.warning,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  currentUser: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary.main,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.paper,
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    marginTop: 4,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeBtn: {
    padding: 8,
  },
});
