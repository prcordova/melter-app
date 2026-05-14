import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { walletApi } from '../services/api';
import { COLORS } from '../theme/colors';
import { showToast } from './CustomToast';

const QUICK_AMOUNTS = [5, 10, 20, 50, 100] as const;
const MIN_DONATION = 1;

type Props = {
  visible: boolean;
  onClose: () => void;
  recipientUsername: string;
  onSuccess?: () => void;
};

export function DonationModal({ visible, onClose, recipientUsername, onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feePercentage, setFeePercentage] = useState(10);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const loadMeta = useCallback(async () => {
    try {
      setLoadingMeta(true);
      const [balanceRes, feesRes] = await Promise.all([walletApi.getBalance(), walletApi.getFees()]);
      if (balanceRes?.success && balanceRes.data) {
        setCurrentBalance(Number(balanceRes.data.balance) || 0);
      }
      if (feesRes?.success && feesRes.data?.fees) {
        setFeePercentage(Number(feesRes.data.fees.donationFeePercentage) || 10);
      }
    } catch (e) {
      console.error('[DonationModal] loadMeta', e);
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setAmount('');
      setMessage('');
      void loadMeta();
    }
  }, [visible, loadMeta]);

  const handleAmountChange = (text: string) => {
    let v = text.replace(',', '.');
    if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) {
      setAmount(v);
    }
  };

  const parsedAmount = parseFloat(amount);
  const hasValidAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0;
  const platformFee = hasValidAmount ? (parsedAmount * feePercentage) / 100 : 0;
  const netForRecipient = hasValidAmount ? parsedAmount - platformFee : 0;

  const handleSubmit = async () => {
    if (!hasValidAmount) {
      showToast.error('Valor inválido', 'Digite um valor válido.');
      return;
    }
    if (parsedAmount < MIN_DONATION) {
      showToast.error('Valor mínimo', `O valor mínimo é R$ ${MIN_DONATION.toFixed(2)}.`);
      return;
    }
    if (parsedAmount > currentBalance) {
      showToast.error('Saldo insuficiente', `Você tem R$ ${currentBalance.toFixed(2)} na carteira.`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await walletApi.donate({
        recipientUsername: recipientUsername.trim().toLowerCase(),
        amount: parsedAmount,
        message: message.trim() ? message.trim().slice(0, 200) : undefined,
      });
      if (res?.success) {
        showToast.success('Doação', res.message || 'Doação enviada com sucesso!');
        onSuccess?.();
        onClose();
      } else {
        showToast.error('Doação', (res as any)?.message || 'Não foi possível enviar a doação.');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Erro ao enviar doação.';
      showToast.error('Doação', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Ionicons name="heart" size={22} color={COLORS.secondary.main} />
                <Text style={styles.title}>Doação</Text>
              </View>
              <TouchableOpacity onPress={handleClose} disabled={submitting} hitSlop={12}>
                <Ionicons name="close" size={26} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.recipientBox}>
                <Text style={styles.recipientLabel}>Para</Text>
                <Text style={styles.recipientUser}>@{recipientUsername}</Text>
              </View>

              <View style={styles.balanceRow}>
                <Text style={styles.muted}>Saldo disponível</Text>
                {loadingMeta ? (
                  <ActivityIndicator size="small" color={COLORS.secondary.main} />
                ) : (
                  <Text style={styles.balanceValue}>R$ {currentBalance.toFixed(2)}</Text>
                )}
              </View>

              <Text style={styles.label}>Valor (R$)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0,00"
                placeholderTextColor={COLORS.text.tertiary}
                keyboardType="decimal-pad"
                editable={!submitting}
              />
              <Text style={styles.helper}>Valor mínimo: R$ {MIN_DONATION.toFixed(2)}</Text>

              <Text style={[styles.label, { marginTop: 12 }]}>Valores rápidos</Text>
              <View style={styles.quickRow}>
                {QUICK_AMOUNTS.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.quickChip, v > currentBalance && styles.quickChipDisabled]}
                    onPress={() => setAmount(String(v))}
                    disabled={submitting || v > currentBalance}
                  >
                    <Text style={[styles.quickChipText, v > currentBalance && styles.quickChipTextDisabled]}>R$ {v}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {hasValidAmount && (
                <View style={styles.feeBox}>
                  <View style={styles.feeLine}>
                    <Text style={styles.muted}>Valor da doação</Text>
                    <Text style={styles.feeStrong}>R$ {parsedAmount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.feeLine}>
                    <Text style={styles.muted}>Taxa da plataforma ({feePercentage}%)</Text>
                    <Text style={styles.feeDeduction}>- R$ {platformFee.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.feeLine, styles.feeLineTotal]}>
                    <Text style={styles.feeStrong}>Destinatário recebe</Text>
                    <Text style={styles.feeNet}>R$ {netForRecipient.toFixed(2)}</Text>
                  </View>
                </View>
              )}

              <Text style={[styles.label, { marginTop: 12 }]}>Mensagem (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={message}
                onChangeText={(t) => setMessage(t.slice(0, 200))}
                placeholder="Deixe uma mensagem..."
                placeholderTextColor={COLORS.text.tertiary}
                multiline
                numberOfLines={3}
                maxLength={200}
                editable={!submitting}
              />
              <Text style={styles.charCount}>{message.length}/200</Text>
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.btnGhost} onPress={handleClose} disabled={submitting}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, (!hasValidAmount || submitting) && styles.btnPrimaryDisabled]}
                onPress={handleSubmit}
                disabled={!hasValidAmount || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Enviar doação</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboard: {
    width: '100%',
  },
  sheet: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  recipientBox: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  recipientLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  recipientUser: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.background.default,
    marginBottom: 16,
  },
  muted: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  helper: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.paper,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  quickChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.secondary.main,
  },
  quickChipDisabled: {
    opacity: 0.35,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondary.main,
  },
  quickChipTextDisabled: {
    color: COLORS.text.tertiary,
  },
  feeBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  feeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  feeLineTotal: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    marginBottom: 0,
  },
  feeStrong: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  feeDeduction: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.states.error,
  },
  feeNet: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.states.success,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 8,
  },
  btnGhost: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  btnGhostText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.secondary.main,
  },
  btnPrimaryDisabled: {
    opacity: 0.5,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
