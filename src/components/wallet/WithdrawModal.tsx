import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { walletApi } from '../../services/api';
import { COLORS } from '../../theme/colors';
import { showToast } from '../CustomToast';

interface WithdrawModalProps {
  visible: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess?: () => void;
}

const PIX_KEY_TYPES = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'PHONE', label: 'Telefone' },
  { value: 'RANDOM', label: 'Chave Aleatória' },
];

function getPixPlaceholder(type: string): string {
  const placeholders: { [key: string]: string } = {
    CPF: '000.000.000-00',
    CNPJ: '00.000.000/0000-00',
    EMAIL: 'seu@email.com',
    PHONE: '(11) 99999-9999',
    RANDOM: 'chave-aleatoria-pix',
  };
  return placeholders[type] || '';
}

export function WithdrawModal({ visible, onClose, currentBalance, onSuccess }: WithdrawModalProps) {
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('CPF');
  const [loading, setLoading] = useState(false);
  const [loadingFees, setLoadingFees] = useState(true);
  const [minimumWithdrawal, setMinimumWithdrawal] = useState(50);
  const [maximumWithdrawal, setMaximumWithdrawal] = useState(9999);
  const [withdrawalFeeType, setWithdrawalFeeType] = useState<'percentage' | 'fixed'>('percentage');
  const [withdrawalFee, setWithdrawalFee] = useState(5);

  const [personalData, setPersonalData] = useState({
    fullName: '',
    cpf: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
    },
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (visible) {
      fetchFees();
      loadFormData();
    }
  }, [visible]);

  const loadFormData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('withdrawFormData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setPersonalData(parsed.personalData || {
          fullName: '',
          cpf: '',
          address: {
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: '',
            state: '',
            zipCode: '',
          },
          phone: '',
          email: '',
        });
        setPixKeyType(parsed.pixKeyType || 'CPF');
      }
    } catch (error) {
      console.error('Erro ao carregar dados do formulário:', error);
    }
  };

  const saveFormData = async () => {
    try {
      const dataToSave = {
        personalData,
        pixKeyType,
      };
      await AsyncStorage.setItem('withdrawFormData', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Erro ao salvar dados do formulário:', error);
    }
  };

  const fetchFees = async () => {
    try {
      setLoadingFees(true);
      const response = await walletApi.getWithdrawalFees();
      if (response.success && response.data) {
        setMinimumWithdrawal(response.data.fees.minimumWithdrawal);
        setMaximumWithdrawal(response.data.fees.maximumWithdrawal || 9999);
        setWithdrawalFeeType(response.data.fees.withdrawalFeeType || 'percentage');
        setWithdrawalFee(response.data.fees.withdrawalFee || 0);
      }
    } catch (error) {
      console.error('Erro ao buscar taxas:', error);
    } finally {
      setLoadingFees(false);
    }
  };

  const isFormValid = () => {
    return (
      amount &&
      parseFloat(amount) > 0 &&
      pixKey.trim() &&
      personalData.fullName.trim() &&
      personalData.cpf.trim()
    );
  };

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^\d.]/g, '');
    if (cleaned.length <= 4) {
      setAmount(cleaned);
    }
  };

  const handlePersonalDataChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setPersonalData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value,
        },
      }));
    } else {
      setPersonalData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
    setTimeout(saveFormData, 100);
  };

  const handlePixKeyTypeChange = (value: string) => {
    setPixKeyType(value);
    setTimeout(saveFormData, 100);
  };

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);

    if (!amount || isNaN(amountNum)) {
      showToast.error('Informe um valor válido');
      return;
    }

    if (amountNum < minimumWithdrawal) {
      showToast.error(`Valor mínimo: R$ ${minimumWithdrawal.toFixed(2)}`);
      return;
    }

    if (amountNum > currentBalance) {
      showToast.error('Saldo insuficiente');
      return;
    }

    if (amountNum > maximumWithdrawal) {
      showToast.error(`Valor máximo para saque é R$ ${maximumWithdrawal.toFixed(2)}`);
      return;
    }

    if (!pixKey.trim()) {
      showToast.error('Informe sua chave Pix');
      return;
    }

    if (!personalData.fullName.trim()) {
      showToast.error('Nome completo é obrigatório');
      return;
    }

    if (!personalData.cpf.trim()) {
      showToast.error('CPF é obrigatório');
      return;
    }

    try {
      setLoading(true);
      const response = await walletApi.requestWithdrawal({
        amount: amountNum,
        pixKey: pixKey.trim(),
        pixKeyType,
        personalData,
      });

      if (response.success) {
        showToast.success(response.message || 'Solicitação de saque enviada com sucesso!');
        setAmount('');
        setPixKey('');
        await AsyncStorage.removeItem('withdrawFormData');
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error('Erro ao solicitar saque:', error);
      showToast.error(error.response?.data?.message || 'Erro ao solicitar saque');
    } finally {
      setLoading(false);
    }
  };

  const calculateFee = () => {
    if (!amount || parseFloat(amount) <= 0) return 0;
    const amountNum = parseFloat(amount);
    if (withdrawalFeeType === 'percentage') {
      return (amountNum * withdrawalFee) / 100;
    }
    return withdrawalFee;
  };

  const calculateNetAmount = () => {
    if (!amount || parseFloat(amount) <= 0) return 0;
    return parseFloat(amount) - calculateFee();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Ionicons name="cash-outline" size={32} color={COLORS.primary.main} />
              <Text style={styles.headerTitle}>Solicitar Saque</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Saldo Disponível */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Saldo Disponível</Text>
              <Text style={styles.balanceAmount}>R$ {currentBalance.toFixed(2)}</Text>
            </View>

            {/* Valor do Saque */}
            <View style={styles.section}>
              <Text style={styles.label}>Valor do Saque</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.amountPrefix}>R$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={handleAmountChange}
                  placeholder="0.00"
                  keyboardType="numeric"
                  maxLength={4}
                  editable={!loadingFees}
                />
              </View>
              <Text style={styles.helperText}>
                Mínimo: R$ {minimumWithdrawal.toFixed(2)} | Máximo: R$ {Math.min(maximumWithdrawal, currentBalance).toFixed(2)}
              </Text>
            </View>

            {/* Cálculo da Taxa */}
            {amount && parseFloat(amount) > 0 && withdrawalFee > 0 && (
              <View style={styles.feeCard}>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Valor solicitado:</Text>
                  <Text style={styles.feeValue}>R$ {parseFloat(amount).toFixed(2)}</Text>
                </View>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>
                    Taxa ({withdrawalFeeType === 'percentage' ? `${withdrawalFee}%` : `R$ ${withdrawalFee.toFixed(2)}`}):
                  </Text>
                  <Text style={[styles.feeValue, styles.feeValueNegative]}>
                    - R$ {calculateFee().toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.feeRow, styles.feeRowTotal]}>
                  <Text style={styles.feeLabelTotal}>Você receberá:</Text>
                  <Text style={styles.feeValueTotal}>R$ {calculateNetAmount().toFixed(2)}</Text>
                </View>
              </View>
            )}

            {/* Tipo de Chave Pix */}
            <View style={styles.section}>
              <Text style={styles.label}>Tipo de Chave Pix</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={pixKeyType}
                  onValueChange={handlePixKeyTypeChange}
                  style={styles.picker}
                >
                  {PIX_KEY_TYPES.map((type) => (
                    <Picker.Item key={type.value} label={type.label} value={type.value} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Chave Pix */}
            <View style={styles.section}>
              <Text style={styles.label}>Chave Pix</Text>
              <TextInput
                style={styles.input}
                value={pixKey}
                onChangeText={setPixKey}
                placeholder={getPixPlaceholder(pixKeyType)}
                autoCapitalize="none"
              />
            </View>

            {/* Dados Pessoais */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Dados Pessoais</Text>
              <Text style={styles.helperText}>💾 Seus dados serão salvos automaticamente</Text>

              <TextInput
                style={styles.input}
                value={personalData.fullName}
                onChangeText={(value) => handlePersonalDataChange('fullName', value)}
                placeholder="Nome completo"
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  value={personalData.cpf}
                  onChangeText={(value) => handlePersonalDataChange('cpf', value)}
                  placeholder="CPF"
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  value={personalData.phone}
                  onChangeText={(value) => handlePersonalDataChange('phone', value)}
                  placeholder="Telefone"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Endereço */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏠 Endereço</Text>

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  value={personalData.address.street}
                  onChangeText={(value) => handlePersonalDataChange('address.street', value)}
                  placeholder="Rua"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={personalData.address.number}
                  onChangeText={(value) => handlePersonalDataChange('address.number', value)}
                  placeholder="Número"
                />
              </View>

              <TextInput
                style={styles.input}
                value={personalData.address.complement}
                onChangeText={(value) => handlePersonalDataChange('address.complement', value)}
                placeholder="Complemento"
              />

              <TextInput
                style={styles.input}
                value={personalData.address.neighborhood}
                onChangeText={(value) => handlePersonalDataChange('address.neighborhood', value)}
                placeholder="Bairro"
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  value={personalData.address.city}
                  onChangeText={(value) => handlePersonalDataChange('address.city', value)}
                  placeholder="Cidade"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={personalData.address.state}
                  onChangeText={(value) => handlePersonalDataChange('address.state', value)}
                  placeholder="Estado"
                />
              </View>

              <TextInput
                style={styles.input}
                value={personalData.address.zipCode}
                onChangeText={(value) => handlePersonalDataChange('address.zipCode', value)}
                placeholder="CEP"
                keyboardType="numeric"
              />
            </View>

            {/* Informações */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>ℹ️ Informações</Text>
              <Text style={styles.infoText}>
                • Valor mínimo: R$ {minimumWithdrawal.toFixed(2)}{'\n'}
                {withdrawalFee > 0 && `• Taxa: ${withdrawalFeeType === 'percentage' ? `${withdrawalFee}%` : `R$ ${withdrawalFee.toFixed(2)}`}\n`}
                • Processamento em até 3 dias úteis{'\n'}
                • Transferência via Pix{'\n'}
                • Você receberá confirmação por e-mail
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, (!isFormValid() || loading) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={!isFormValid() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Solicitar Saque</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  balanceCard: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary.main,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.medium,
    paddingBottom: 8,
  },
  amountPrefix: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  input: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  inputHalf: {
    flex: 1,
    marginHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerContainer: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    marginBottom: 12,
  },
  picker: {
    color: COLORS.text.primary,
  },
  feeCard: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feeRowTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.medium,
  },
  feeLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  feeValueNegative: {
    color: COLORS.states.error,
  },
  feeLabelTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  feeValueTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.states.success,
  },
  infoCard: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  submitButton: {
    backgroundColor: COLORS.secondary.main,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

