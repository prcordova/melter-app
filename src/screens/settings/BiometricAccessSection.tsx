import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import { SURFACE_RADIUS, type AppPalette } from '../../theme/palettes';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button';
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
} from '../../services/biometricLogin';

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

  const handleEnable = async () => {
    if (!user?.username) return;
    setBusy(true);
    try {
      await enableBiometricLogin(user.username);
      showToast.success('Biometria', 'Acesso por biometria ativado neste aparelho.');
    } catch (e: any) {
      if (e?.code !== 'BIOMETRIC_CANCELLED') {
        showToast.error('Biometria', e?.message || 'Não foi possível ativar a biometria.');
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmDisableHere = () => {
    showConfirm(
      'Remover biometria deste aparelho',
      'O acesso por biometria e o bloqueio por inatividade serão desativados aqui. Você continuará logado.',
      async () => {
        setBusy(true);
        try {
          await clearBiometricLogin();
          showToast.success('Biometria', 'Acesso biométrico removido.');
        } finally {
          setBusy(false);
        }
      },
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
          await clearBiometricLogin();
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
  });
