import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import { SURFACE_RADIUS, type AppPalette } from '../../theme/palettes';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { CustomModal, useCustomModal } from '../../components/CustomModal';
import { showToast } from '../../components/CustomToast';
import { authApi, type DeviceCredentialSummary } from '../../services/auth';
import {
  clearBiometricLogin,
  enableBiometricLogin,
  getCurrentDeviceCredentialId,
  hasBiometricLoginConfigured,
  isBiometricLoginSupported,
  subscribeBiometricLogin,
  verifyBiometricIdentity,
  type BiometricError,
} from '../../services/biometricLogin';

type StepUpState = { requires2FA: boolean; password: string; code: string; error: string };

function formatDate(iso: string | null): string {
  if (!iso) return 'nunca';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Segurança → acesso biométrico deste aparelho + aparelhos com biometria ativa (revogáveis). */
export function BiometricAccessSection() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { modalProps, hideModal, showConfirm } = useCustomModal();

  const [supported, setSupported] = useState(false);
  const [enabledHere, setEnabledHere] = useState(false);
  const [currentCredentialId, setCurrentCredentialId] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceCredentialSummary[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [busy, setBusy] = useState(false);

  const refreshLocal = useCallback(async () => {
    const [isSupported, isEnabled, credentialId] = await Promise.all([
      isBiometricLoginSupported(),
      hasBiometricLoginConfigured(),
      getCurrentDeviceCredentialId(),
    ]);
    setSupported(isSupported);
    setEnabledHere(isEnabled);
    setCurrentCredentialId(credentialId);
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      setLoadingDevices(true);
      const res = await authApi.listDeviceCredentials();
      if (res.success && res.data) setDevices(res.data.devices);
    } catch {
      /* lista é informativa */
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    void refreshLocal();
    void refreshDevices();
    return subscribeBiometricLogin(() => {
      void refreshLocal();
      void refreshDevices();
    });
  }, [refreshLocal, refreshDevices]);

  const [stepUp, setStepUp] = useState<StepUpState | null>(null);

  const handleEnable = async (confirmation?: { password: string; twoFactorCode?: string }) => {
    if (!user?.username) return;
    setBusy(true);
    try {
      await enableBiometricLogin(user.username, { stepUp: confirmation });
      setStepUp(null);
      showToast.success('Biometria', 'Acesso por biometria ativado neste aparelho.');
    } catch (e) {
      const err = e as BiometricError;
      if (err?.code === 'STEP_UP_REQUIRED') {
        setStepUp((prev) => ({
          requires2FA: err.requires2FA === true,
          password: prev?.password ?? '',
          code: '',
          error: confirmation ? err.message : '',
        }));
      } else if (err?.code !== 'BIOMETRIC_CANCELLED') {
        setStepUp(null);
        showToast.error('Biometria', err?.message || 'Não foi possível ativar a biometria.');
      }
    } finally {
      setBusy(false);
    }
  };

  const submitStepUp = () => {
    if (!stepUp?.password) return;
    void handleEnable({
      password: stepUp.password,
      twoFactorCode: stepUp.requires2FA ? stepUp.code : undefined,
    });
  };

  /** Desligar a proteção exige a biometria do dono — quem só pegou o celular desbloqueado não consegue. */
  const removeHereWithBiometric = async () => {
    setBusy(true);
    try {
      const result = await verifyBiometricIdentity();
      if (result === 'cancelled') {
        showToast.error('Biometria', 'Confirme com sua biometria para remover o acesso.');
        return;
      }
      await clearBiometricLogin();
      showToast.success('Biometria', 'Acesso biométrico removido.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDisableHere = () => {
    showConfirm(
      'Remover biometria deste aparelho',
      'O acesso por biometria e o bloqueio por inatividade serão desativados aqui. Você continuará logado. Para confirmar, use sua biometria.',
      () => void removeHereWithBiometric(),
      { confirmText: 'Remover', destructive: true }
    );
  };

  const confirmRevoke = (device: DeviceCredentialSummary) => {
    const isCurrent = device.id === currentCredentialId;
    showConfirm(
      'Remover aparelho',
      `“${device.deviceName}” não poderá mais entrar com biometria. ${
        isCurrent ? 'Este é o aparelho que você está usando.' : 'Use isso se perdeu o aparelho ou não o reconhece.'
      }`,
      async () => {
        if (isCurrent) {
          await removeHereWithBiometric();
          return;
        }
        const res = await authApi.revokeDeviceCredential(device.id).catch(() => null);
        if (res?.success) {
          showToast.success('Aparelhos', 'Aparelho removido.');
          setDevices((prev) => prev.filter((d) => d.id !== device.id));
        } else {
          showToast.error('Aparelhos', res?.message || 'Não foi possível remover o aparelho.');
        }
      },
      { confirmText: 'Remover', destructive: true }
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="finger-print" size={24} color="#ffffff" />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>Biometria e aparelhos</Text>
          <Text style={styles.sectionSubtitle}>
            Entre com digital ou rosto sem guardar sua senha no aparelho. O bloqueio por inatividade é configurado
            em Preferências.
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {enabledHere ? (
        <View style={styles.statusRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.states.success} />
          <Text style={styles.statusText}>Ativa neste aparelho</Text>
        </View>
      ) : null}

      {enabledHere ? (
        <Button variant="outline" onPress={confirmDisableHere} disabled={busy} responsive={false}>
          Remover biometria deste aparelho
        </Button>
      ) : supported ? (
        <Button onPress={() => void handleEnable()} loading={busy} disabled={busy} responsive={false}>
          Ativar biometria neste aparelho
        </Button>
      ) : (
        <Text style={styles.mutedText}>
          Este aparelho não tem biometria cadastrada (ou não é compatível com armazenamento protegido).
        </Text>
      )}

      <Text style={styles.listTitle}>Aparelhos com biometria ativa</Text>
      <Text style={styles.mutedText}>
        Perdeu o celular? Remova o aparelho aqui (ou pelo site, em Segurança) para cortar o acesso por biometria.
      </Text>

      {loadingDevices ? (
        <ActivityIndicator color={colors.secondary.main} style={styles.loader} />
      ) : devices.length === 0 ? (
        <Text style={styles.emptyText}>Nenhum aparelho com biometria ativa.</Text>
      ) : (
        devices.map((device) => {
          const isCurrent = device.id === currentCredentialId;
          return (
            <View key={device.id} style={styles.deviceRow}>
              <Ionicons
                name={device.platform === 'ios' ? 'logo-apple' : 'logo-android'}
                size={22}
                color={colors.text.secondary}
              />
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>
                  {device.deviceName}
                  {isCurrent ? <Text style={styles.currentBadge}>  · este aparelho</Text> : null}
                </Text>
                <Text style={styles.deviceMeta}>
                  Ativado em {formatDate(device.createdAt)} · Último uso {formatDate(device.lastUsedAt)}
                </Text>
              </View>
              <Button variant="ghost" size="sm" onPress={() => confirmRevoke(device)} responsive={false}>
                Remover
              </Button>
            </View>
          );
        })
      )}

      <CustomModal {...modalProps} onClose={hideModal} />

      <CustomModal visible={stepUp !== null} onClose={() => (busy ? undefined : setStepUp(null))}>
        <Pressable style={styles.stepUpCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.sectionTitle}>Confirme que é você</Text>
          <Text style={[styles.mutedText, styles.stepUpIntro]}>
            {stepUp?.requires2FA
              ? 'Para ativar a biometria, digite sua senha e o código do seu autenticador (2FA).'
              : 'Para ativar a biometria, digite sua senha. Recomendamos ativar o 2FA para proteger ainda mais a conta.'}
          </Text>
          <Input
            label="Senha"
            value={stepUp?.password ?? ''}
            onChangeText={(password) => setStepUp((prev) => (prev ? { ...prev, password, error: '' } : prev))}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />
          {stepUp?.requires2FA ? (
            <Input
              label="Código do autenticador"
              value={stepUp.code}
              onChangeText={(code) => setStepUp((prev) => (prev ? { ...prev, code: code.trim(), error: '' } : prev))}
              placeholder="000000 ou código de backup"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
              editable={!busy}
            />
          ) : null}
          {stepUp?.error ? <Text style={styles.stepUpError}>{stepUp.error}</Text> : null}
          <View style={styles.stepUpActions}>
            <Button variant="ghost" onPress={() => setStepUp(null)} disabled={busy} responsive={false}>
              Cancelar
            </Button>
            <Button
              onPress={submitStepUp}
              loading={busy}
              disabled={busy || !stepUp?.password || (stepUp.requires2FA && stepUp.code.length < 6)}
              responsive={false}
            >
              Confirmar
            </Button>
          </View>
        </Pressable>
      </CustomModal>
    </View>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    section: {
      backgroundColor: c.background.paper,
      borderRadius: SURFACE_RADIUS,
      borderWidth: 1,
      borderColor: c.divider,
      padding: 16,
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#a855f7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionHeaderText: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: c.text.primary,
      marginBottom: 2,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: c.text.secondary,
      lineHeight: 18,
    },
    divider: {
      height: 1,
      backgroundColor: c.divider,
      marginVertical: 14,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.states.success,
    },
    listTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text.primary,
      marginTop: 18,
      marginBottom: 4,
    },
    mutedText: {
      fontSize: 13,
      color: c.text.secondary,
      lineHeight: 18,
      marginBottom: 8,
    },
    loader: {
      marginVertical: 12,
    },
    emptyText: {
      fontSize: 13,
      color: c.text.tertiary,
      marginTop: 4,
    },
    deviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    deviceInfo: {
      flex: 1,
    },
    deviceName: {
      fontSize: 14,
      fontWeight: '600',
      color: c.text.primary,
    },
    currentBadge: {
      fontSize: 12,
      fontWeight: '600',
      color: c.secondary.main,
    },
    deviceMeta: {
      fontSize: 12,
      color: c.text.secondary,
      marginTop: 2,
    },
    stepUpCard: {
      width: '90%',
      maxWidth: 400,
      backgroundColor: c.background.paper,
      borderRadius: SURFACE_RADIUS,
      padding: 20,
    },
    stepUpIntro: {
      marginTop: 4,
      marginBottom: 16,
    },
    stepUpError: {
      fontSize: 13,
      color: c.states.error,
      marginBottom: 12,
    },
    stepUpActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
  });
