import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import { SURFACE_RADIUS, type AppPalette } from '../../theme/palettes';
import {
  hasBiometricLoginConfigured,
  isBiometricLoginEnabledSync,
  subscribeBiometricLogin,
  verifyBiometricIdentity,
} from '../../services/biometricLogin';
import {
  BIOMETRIC_LOCK_TIMEOUT_OPTIONS,
  ensureBiometricHideContentLoaded,
  ensureBiometricLockTimeoutLoaded,
  getBiometricHideContent,
  getBiometricLockTimeout,
  setBiometricHideContent,
  setBiometricLockTimeout,
  subscribeBiometricLockTimeout,
  type BiometricLockTimeout,
} from '../../lib/biometric-lock';
import { showToast } from '../CustomToast';

export function BiometricLockPreferencesSection() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useAppTheme();
  const [timeout, setTimeoutValue] = useState<BiometricLockTimeout>(getBiometricLockTimeout);
  const [hideContent, setHideContent] = useState(getBiometricHideContent);
  const [biometricActive, setBiometricActive] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refreshBiometric = async () => {
      const active = await hasBiometricLoginConfigured();
      if (!cancelled) setBiometricActive(active);
    };
    void (async () => {
      const [value, hide] = await Promise.all([
        ensureBiometricLockTimeoutLoaded(),
        ensureBiometricHideContentLoaded(),
        refreshBiometric(),
      ]);
      if (cancelled) return;
      setTimeoutValue(value);
      setHideContent(hide);
    })();
    const unsubscribeLock = subscribeBiometricLockTimeout(() => {
      setTimeoutValue(getBiometricLockTimeout());
      setHideContent(getBiometricHideContent());
    });
    const unsubscribeLogin = subscribeBiometricLogin(() => void refreshBiometric());
    return () => {
      cancelled = true;
      unsubscribeLock();
      unsubscribeLogin();
    };
  }, []);

  /** Afrouxar a proteção exige a biometria do dono (quem pegou o celular desbloqueado não consegue). */
  const confirmWeakening = async (): Promise<boolean> => {
    if (!isBiometricLoginEnabledSync()) return true;
    const result = await verifyBiometricIdentity();
    if (result === 'success') return true;
    if (result === 'cancelled') {
      showToast.error('Biometria', 'Confirme com sua biometria para reduzir a proteção.');
    }
    return false;
  };

  const handleToggleHideContent = async (enabled: boolean) => {
    if (!enabled && !(await confirmWeakening())) return;
    setHideContent(enabled);
    try {
      await setBiometricHideContent(enabled);
    } catch {
      setHideContent(!enabled);
      showToast.error('Erro', 'Não foi possível salvar a preferência.');
    }
  };

  const handleSelect = async (value: BiometricLockTimeout) => {
    if (value === timeout) return;
    const previous = timeout;
    const weakens = value === null || (previous !== null && value > previous);
    if (weakens && !(await confirmWeakening())) return;
    setTimeoutValue(value);
    try {
      await setBiometricLockTimeout(value);
    } catch {
      setTimeoutValue(previous);
      showToast.error('Erro', 'Não foi possível salvar o bloqueio por biometria.');
    }
  };

  const disabled = biometricActive === false;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🔐 Bloqueio por biometria</Text>
      <Text style={styles.sectionDescription}>
        Proteção extra para quem usa o login por biometria neste aparelho. Se você ficar sem usar o app pelo
        tempo escolhido — com ele em segundo plano ou aberto sem mexer — pedimos sua digital ou rosto de novo
        antes de continuar. Ao abrir o app, a biometria também é pedida.
      </Text>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary.main} />
        <Text style={styles.infoText}>
          Quem entra só com senha não é bloqueado: o login continua válido normalmente. Escolha{' '}
          <Text style={styles.infoBold}>Desativado</Text> para nunca pedir a biometria para desbloquear. Para
          aumentar o tempo ou desativar, confirmamos com a sua biometria.
        </Text>
      </View>

      {disabled ? (
        <View style={styles.warningBox}>
          <Ionicons name="finger-print" size={18} color={colors.states.warning} />
          <Text style={styles.warningText}>
            O login por biometria não está ativo neste aparelho. Para usar o bloqueio, ative em Configurações →
            Segurança ou em “Guardar acesso com biometria” na tela de login.
          </Text>
        </View>
      ) : null}

      <View style={[styles.item, disabled && styles.itemDisabled]}>
        <View style={styles.itemText}>
          <Text style={styles.itemTitle}>Ocultar conteúdo do app</Text>
          <Text style={styles.itemDesc}>
            Esconde o Melter na tela de apps recentes e bloqueia prints e gravação de tela. Só vale enquanto o
            bloqueio estiver ativo. As notificações não mudam — isso fica em Notificações, acima.
          </Text>
        </View>
        <Switch
          value={hideContent}
          onValueChange={(v) => void handleToggleHideContent(v)}
          disabled={disabled || timeout === null}
          trackColor={{ false: colors.border.medium, true: colors.secondary.main }}
          thumbColor="#ffffff"
        />
      </View>

      <Text style={styles.groupLabel}>Pedir biometria após</Text>

      {BIOMETRIC_LOCK_TIMEOUT_OPTIONS.map((option) => {
        const selected = timeout === option.value;
        return (
          <TouchableOpacity
            key={option.label}
            style={[styles.item, selected && styles.itemSelected, disabled && styles.itemDisabled]}
            onPress={() => void handleSelect(option.value)}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
          >
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>{option.label}</Text>
              <Text style={styles.itemDesc}>{option.description}</Text>
            </View>
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={selected ? colors.secondary.main : colors.text.tertiary}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: c.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: c.primary.light + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: c.text.secondary,
    lineHeight: 19,
  },
  infoBold: {
    fontWeight: '600',
    color: c.text.primary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: c.states.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: c.states.warning,
    lineHeight: 19,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.background.paper,
    borderRadius: SURFACE_RADIUS,
    padding: 16,
    borderWidth: 1,
    borderColor: c.divider,
    marginBottom: 12,
  },
  itemSelected: {
    borderColor: c.secondary.main,
    backgroundColor: c.action.selected,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text.primary,
    marginTop: 4,
    marginBottom: 8,
  },
  itemText: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 13,
    color: c.text.secondary,
    lineHeight: 18,
  },
});
