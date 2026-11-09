import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Switch,
  Linking,
} from 'react-native';
import { API_CONFIG } from '../../config/api.config';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import { showToast } from '../CustomToast';
import { sellerVerificationApi } from '../../services/api';
import Ionicons from '@expo/vector-icons/Ionicons';

interface AppealModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** `sellerVerification.rejectionReason` — motivo da desabilitação. */
  disabledReason?: string | null;
}

export function AppealModal({ visible, onClose, onSuccess, disabledReason }: AppealModalProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [appealReason, setAppealReason] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!appealReason.trim()) {
      showToast.error('Erro', 'Por favor, preencha a justificativa');
      return;
    }

    if (!termsAccepted) {
      showToast.error('Erro', 'Você deve aceitar os termos para continuar');
      return;
    }

    try {
      setSubmitting(true);
      const response = await sellerVerificationApi.submitAppeal(appealReason.trim());

      if (response.success) {
        showToast.success('Sucesso', 'Solicitação de reativação enviada! Aguarde a análise de um administrador.');
        setAppealReason('');
        setTermsAccepted(false);
        onSuccess();
        onClose();
      } else {
        showToast.error('Erro', response.message || 'Erro ao enviar solicitação');
      }
    } catch (error: any) {
      console.error('[AppealModal] Erro ao enviar appeal:', error);
      showToast.error(
        'Erro',
        error.response?.data?.message || 'Erro ao enviar solicitação'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setAppealReason('');
      setTermsAccepted(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Solicitar Reativação da Loja</Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={submitting}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Importante</Text>
              <Text style={styles.description}>
                Sua loja foi desabilitada por violação dos termos de uso. Para solicitar a
                reativação, explique o que aconteceu e confirme que entendeu e aceita os termos.
              </Text>
            </View>

            {disabledReason?.trim() ? (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Motivo da desabilitação</Text>
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonText}>{disabledReason.trim()}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Justificativa *</Text>
              <TextInput
                style={styles.textArea}
                value={appealReason}
                onChangeText={setAppealReason}
                placeholder="Explique o que aconteceu, o que você fez para resolver o problema e por que acredita que sua loja deve ser reativada..."
                placeholderTextColor={colors.text.tertiary}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                editable={!submitting}
              />
            </View>

            <View style={styles.termsContainer}>
              <Switch
                value={termsAccepted}
                onValueChange={setTermsAccepted}
                disabled={submitting}
                trackColor={{
                  false: colors.border.medium,
                  true: colors.secondary.main,
                }}
                thumbColor={termsAccepted ? '#ffffff' : colors.text.tertiary}
              />
              <Text style={styles.termsText}>
                Confirmo que li e entendi os{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => void Linking.openURL(`${API_CONFIG.APP_URL.replace(/\/$/, '')}/terms`)}
                >
                  termos de uso
                </Text>
                . Comprometo-me a seguir todas as regras e políticas da plataforma. Entendo que novas
                violações podem resultar em banimento permanente.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                (!appealReason.trim() || !termsAccepted || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!appealReason.trim() || !termsAccepted || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Enviar Solicitação</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: c.background.paper,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: c.border.light,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: c.text.primary,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: c.text.secondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: c.background.tertiary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: c.text.primary,
    borderWidth: 1,
    borderColor: c.border.light,
    minHeight: 120,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    color: c.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
    color: c.text.primary,
  },
  warningBox: {
    borderWidth: 1,
    borderColor: c.states.warning,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.text.primary,
    marginBottom: 4,
  },
  reasonBox: {
    borderWidth: 1,
    borderColor: c.states.error,
    borderRadius: 8,
    padding: 12,
  },
  reasonText: {
    fontSize: 14,
    color: c.text.primary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: c.border.light,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: c.background.tertiary,
    borderWidth: 1,
    borderColor: c.border.medium,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text.primary,
  },
  submitButton: {
    backgroundColor: c.secondary.main,
  },
  submitButtonDisabled: {
    backgroundColor: c.border.medium,
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

