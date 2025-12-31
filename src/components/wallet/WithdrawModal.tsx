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
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'PHONE', label: 'Telefone' },
  { value: 'RANDOM', label: 'Chave Aleatória' },
];

function getPixPlaceholder(type: string): string {
  const placeholders: { [key: string]: string } = {
    CPF: '000.000.000-00',
    EMAIL: 'seu@email.com',
    PHONE: '(11) 99999-9999',
    RANDOM: 'chave-aleatoria-pix',
  };
  return placeholders[type] || '';
}

// Funções de máscara
function maskCPF(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
}

function maskPhone(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers.length > 0 ? `(${numbers}` : numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

function maskCEP(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
}

// Estados brasileiros com autocomplete
const BRAZILIAN_STATES = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
];

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

  const [stateSuggestions, setStateSuggestions] = useState<Array<{ uf: string; name: string }>>([]);
  const [showStateSuggestions, setShowStateSuggestions] = useState(false);

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
    let processedValue = value;

    // Aplicar máscaras
    if (field === 'cpf') {
      processedValue = maskCPF(value);
    } else if (field === 'phone') {
      processedValue = maskPhone(value);
    } else if (field === 'address.zipCode') {
      processedValue = maskCEP(value);
    } else if (field === 'address.state') {
      processedValue = value.toUpperCase();
      // Autocomplete de estados
      if (value.length >= 2) {
        const filtered = BRAZILIAN_STATES.filter(state => 
          state.uf.startsWith(value.toUpperCase()) || 
          state.name.toLowerCase().includes(value.toLowerCase())
        );
        setStateSuggestions(filtered);
        setShowStateSuggestions(filtered.length > 0);
      } else {
        setStateSuggestions([]);
        setShowStateSuggestions(false);
      }
    }

    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setPersonalData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: processedValue,
        },
      }));
    } else {
      setPersonalData(prev => ({
        ...prev,
        [field]: processedValue,
      }));
    }
    setTimeout(saveFormData, 100);
  };

  const handleStateSelect = (state: { uf: string; name: string }) => {
    setPersonalData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        state: state.uf,
      },
    }));
    setShowStateSuggestions(false);
    setTimeout(saveFormData, 100);
  };

  const handlePixKeyTypeChange = (value: string) => {
    setPixKeyType(value);
    setTimeout(saveFormData, 100);
  };

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);

    if (!amount || isNaN(amountNum) || amountNum <= 0) {
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

    // Validar pixKeyType
    if (!['CPF', 'EMAIL', 'PHONE', 'RANDOM'].includes(pixKeyType)) {
      showToast.error('Tipo de chave Pix inválido');
      return;
    }

    if (!personalData.fullName.trim()) {
      showToast.error('Nome completo é obrigatório');
      return;
    }

    // Validar CPF (mínimo 11 caracteres, máximo 14)
    const cpfCleaned = personalData.cpf.replace(/[^\d]/g, '');
    if (!cpfCleaned || cpfCleaned.length < 11 || cpfCleaned.length > 14) {
      showToast.error('CPF inválido');
      return;
    }

    // Validar email se fornecido
    if (personalData.email && personalData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(personalData.email.trim())) {
        showToast.error('E-mail inválido');
        return;
      }
    }

    try {
      setLoading(true);
      
      // Preparar dados para envio (sanitizar e validar)
      // Remover máscaras antes de enviar
      const phoneCleaned = personalData.phone?.replace(/\D/g, '') || undefined;
      const zipCodeCleaned = personalData.address.zipCode?.replace(/\D/g, '') || undefined;
      
      const withdrawalData = {
        amount: amountNum,
        pixKey: pixKey.trim(),
        pixKeyType: pixKeyType as 'CPF' | 'EMAIL' | 'PHONE' | 'RANDOM',
        personalData: {
          fullName: personalData.fullName.trim(),
          cpf: cpfCleaned,
          address: {
            street: personalData.address.street?.trim() || undefined,
            number: personalData.address.number?.trim() || undefined,
            complement: personalData.address.complement?.trim() || undefined,
            neighborhood: personalData.address.neighborhood?.trim() || undefined,
            city: personalData.address.city?.trim() || undefined,
            state: personalData.address.state?.trim().toUpperCase() || undefined,
            zipCode: zipCodeCleaned,
          },
          phone: phoneCleaned,
          email: personalData.email?.trim() || undefined,
        },
      };

      const response = await walletApi.requestWithdrawal(withdrawalData);

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
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao solicitar saque';
      showToast.error(errorMessage);
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
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[styles.container, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 16) }]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => false}
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

          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
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
                keyboardType={pixKeyType === 'PHONE' ? 'phone-pad' : 'default'}
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
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  value={personalData.phone}
                  onChangeText={(value) => handlePersonalDataChange('phone', value)}
                  placeholder="Telefone"
                  keyboardType="phone-pad"
                />
              </View>

              <TextInput
                style={styles.input}
                value={personalData.email}
                onChangeText={(value) => handlePersonalDataChange('email', value)}
                placeholder="E-mail (opcional)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Endereço */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏠 Endereço</Text>

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  value={personalData.address.street}
                  onChangeText={(value) => handlePersonalDataChange('address.street', value)}
                  placeholder="Rua"
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
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
                  style={[styles.input, styles.inputHalf]}
                  value={personalData.address.city}
                  onChangeText={(value) => handlePersonalDataChange('address.city', value)}
                  placeholder="Cidade"
                />
                <View style={[styles.inputHalf, { position: 'relative' }]}>
                  <TextInput
                    style={styles.input}
                    value={personalData.address.state}
                    onChangeText={(value) => handlePersonalDataChange('address.state', value)}
                    placeholder="Estado (UF)"
                    maxLength={2}
                    autoCapitalize="characters"
                    onBlur={() => setTimeout(() => setShowStateSuggestions(false), 200)}
                  />
                  {showStateSuggestions && stateSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      {stateSuggestions.map((state) => (
                        <TouchableOpacity
                          key={state.uf}
                          style={styles.suggestionItem}
                          onPress={() => handleStateSelect(state)}
                        >
                          <Text style={styles.suggestionText}>
                            {state.uf} - {state.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <TextInput
                style={styles.input}
                value={personalData.address.zipCode}
                onChangeText={(value) => handlePersonalDataChange('address.zipCode', value)}
                placeholder="CEP"
                keyboardType="numeric"
                maxLength={9}
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
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 20,
    width: '90%',
    maxWidth: 600,
    maxHeight: '95%',
    minHeight: 700,
    flexDirection: 'column',
    overflow: 'hidden',
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
  contentContainer: {
    paddingVertical: 16,
    paddingBottom: 20,
    flexGrow: 1,
    minHeight: '100%',
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
  stateInputContainer: {
    position: 'relative',
    marginHorizontal: 4,
  },
  stateInput: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    minWidth: 120,
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
  suggestionsContainer: {
    position: 'absolute',
    top: 0,
    left: '100%',
    marginLeft: 8,
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    minWidth: 200,
    maxWidth: 250,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
});

