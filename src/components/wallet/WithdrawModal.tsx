import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { walletApi } from '../../services/api';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import { showToast } from '../CustomToast';
import { digitsOnly, formatCnpj, isValidCnpj, isValidCpf } from '../../utils/seller/validation';
import { CustomModal } from '../CustomModal';
import { CustomSelect } from '../CustomSelect';
import { Button } from '../Button';

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

type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';

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
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
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
        setPersonalData(
          parsed.personalData || {
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
          }
        );
        setPixKeyType(parsed.pixKeyType || 'CPF');
      }
    } catch (error) {
      console.error('Erro ao carregar dados do formulário:', error);
    }
  };

  const saveFormData = async () => {
    try {
      await AsyncStorage.setItem(
        'withdrawFormData',
        JSON.stringify({
          personalData,
          pixKeyType,
        })
      );
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

    if (field === 'cpf') {
      processedValue = maskCPF(value);
    } else if (field === 'phone') {
      processedValue = maskPhone(value);
    } else if (field === 'address.zipCode') {
      processedValue = maskCEP(value);
    } else if (field === 'address.state') {
      processedValue = value.toUpperCase();
      if (value.length >= 2) {
        const filtered = BRAZILIAN_STATES.filter(
          (state) =>
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
      setPersonalData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: processedValue,
        },
      }));
    } else {
      setPersonalData((prev) => ({
        ...prev,
        [field]: processedValue,
      }));
    }
    setTimeout(saveFormData, 100);
  };

  const handleStateSelect = (state: { uf: string; name: string }) => {
    setPersonalData((prev) => ({
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
    setPixKey('');
    setTimeout(saveFormData, 100);
  };

  const handlePixKeyChange = (value: string) => {
    if (pixKeyType === 'CPF') setPixKey(maskCPF(value));
    else if (pixKeyType === 'CNPJ') setPixKey(formatCnpj(value));
    else if (pixKeyType === 'PHONE') setPixKey(maskPhone(value));
    else setPixKey(value);
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

    if (!PIX_KEY_TYPES.some((type) => type.value === pixKeyType)) {
      showToast.error('Tipo de chave Pix inválido');
      return;
    }

    if (pixKeyType === 'CPF' && !isValidCpf(pixKey)) {
      showToast.error('Chave Pix CPF inválida');
      return;
    }

    if (pixKeyType === 'CNPJ' && !isValidCnpj(pixKey)) {
      showToast.error('Chave Pix CNPJ inválida');
      return;
    }

    if (!personalData.fullName.trim()) {
      showToast.error('Nome completo é obrigatório');
      return;
    }

    const cpfCleaned = personalData.cpf.replace(/[^\d]/g, '');
    if (!cpfCleaned || cpfCleaned.length < 11 || cpfCleaned.length > 14) {
      showToast.error('CPF inválido');
      return;
    }

    if (personalData.email && personalData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(personalData.email.trim())) {
        showToast.error('E-mail inválido');
        return;
      }
    }

    try {
      setLoading(true);

      const phoneCleaned = personalData.phone?.replace(/\D/g, '') || undefined;
      const zipCodeCleaned = personalData.address.zipCode?.replace(/\D/g, '') || undefined;

      const withdrawalData = {
        amount: amountNum,
        pixKey:
          pixKeyType === 'CPF' || pixKeyType === 'CNPJ'
            ? digitsOnly(pixKey)
            : pixKeyType === 'PHONE'
              ? `+55${digitsOnly(pixKey)}`
              : pixKey.trim(),
        pixKeyType: pixKeyType as PixKeyType,
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
        onSuccess?.();
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
    <CustomModal
      visible={visible}
      onClose={loading ? undefined : onClose}
      closeOnBackdropPress={!loading}
      animationType="fade"
      overlayStyle={styles.overlay}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="cash-outline" size={22} color={colors.secondary.main} />
              <Text style={styles.headerTitle} numberOfLines={1}>
                Solicitar Saque
              </Text>
            </View>
            <Button variant="ghost" size="sm" responsive={false} onPress={onClose} disabled={loading}>
              Fechar
            </Button>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Saldo disponível</Text>
              <Text style={styles.balanceAmount}>R$ {currentBalance.toFixed(2)}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Valor do saque</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.amountPrefix}>R$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={handleAmountChange}
                  placeholder="0.00"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                  maxLength={4}
                  editable={!loadingFees}
                />
              </View>
              <Text style={styles.helperText}>
                Mínimo: R$ {minimumWithdrawal.toFixed(2)} | Máximo: R${' '}
                {Math.min(maximumWithdrawal, currentBalance).toFixed(2)}
              </Text>
            </View>

            {amount && parseFloat(amount) > 0 && withdrawalFee > 0 ? (
              <View style={styles.feeCard}>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Valor solicitado:</Text>
                  <Text style={styles.feeValue}>R$ {parseFloat(amount).toFixed(2)}</Text>
                </View>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>
                    Taxa (
                    {withdrawalFeeType === 'percentage'
                      ? `${withdrawalFee}%`
                      : `R$ ${withdrawalFee.toFixed(2)}`}
                    ):
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
            ) : null}

            <View style={styles.section}>
              <CustomSelect
                label="Tipo de chave Pix"
                value={pixKeyType}
                options={PIX_KEY_TYPES}
                onChange={handlePixKeyTypeChange}
                disabled={loading}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Chave Pix</Text>
              <TextInput
                style={styles.input}
                value={pixKey}
                onChangeText={handlePixKeyChange}
                placeholder={getPixPlaceholder(pixKeyType)}
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="none"
                keyboardType={
                  pixKeyType === 'PHONE'
                    ? 'phone-pad'
                    : pixKeyType === 'CPF' || pixKeyType === 'CNPJ'
                      ? 'numeric'
                      : 'default'
                }
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dados pessoais</Text>
              <Text style={styles.helperText}>Seus dados serão salvos automaticamente neste aparelho.</Text>

              <TextInput
                style={styles.input}
                value={personalData.fullName}
                onChangeText={(value) => handlePersonalDataChange('fullName', value)}
                placeholder="Nome completo"
                placeholderTextColor={colors.text.tertiary}
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  value={personalData.cpf}
                  onChangeText={(value) => handlePersonalDataChange('cpf', value)}
                  placeholder="CPF"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  value={personalData.phone}
                  onChangeText={(value) => handlePersonalDataChange('phone', value)}
                  placeholder="Telefone"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="phone-pad"
                />
              </View>

              <TextInput
                style={styles.input}
                value={personalData.email}
                onChangeText={(value) => handlePersonalDataChange('email', value)}
                placeholder="E-mail (opcional)"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Endereço</Text>

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  value={personalData.address.street}
                  onChangeText={(value) => handlePersonalDataChange('address.street', value)}
                  placeholder="Rua"
                  placeholderTextColor={colors.text.tertiary}
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  value={personalData.address.number}
                  onChangeText={(value) => handlePersonalDataChange('address.number', value)}
                  placeholder="Número"
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>

              <TextInput
                style={styles.input}
                value={personalData.address.complement}
                onChangeText={(value) => handlePersonalDataChange('address.complement', value)}
                placeholder="Complemento"
                placeholderTextColor={colors.text.tertiary}
              />

              <TextInput
                style={styles.input}
                value={personalData.address.neighborhood}
                onChangeText={(value) => handlePersonalDataChange('address.neighborhood', value)}
                placeholder="Bairro"
                placeholderTextColor={colors.text.tertiary}
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  value={personalData.address.city}
                  onChangeText={(value) => handlePersonalDataChange('address.city', value)}
                  placeholder="Cidade"
                  placeholderTextColor={colors.text.tertiary}
                />
                <View style={[styles.inputHalf, { position: 'relative' }]}>
                  <TextInput
                    style={styles.input}
                    value={personalData.address.state}
                    onChangeText={(value) => handlePersonalDataChange('address.state', value)}
                    placeholder="Estado (UF)"
                    placeholderTextColor={colors.text.tertiary}
                    maxLength={2}
                    autoCapitalize="characters"
                    onBlur={() => setTimeout(() => setShowStateSuggestions(false), 200)}
                  />
                  {showStateSuggestions && stateSuggestions.length > 0 ? (
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
                  ) : null}
                </View>
              </View>

              <TextInput
                style={styles.input}
                value={personalData.address.zipCode}
                onChangeText={(value) => handlePersonalDataChange('address.zipCode', value)}
                placeholder="CEP"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
                maxLength={9}
              />
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Informações</Text>
              <Text style={styles.infoText}>
                • Valor mínimo: R$ {minimumWithdrawal.toFixed(2)}
                {'\n'}
                {withdrawalFee > 0
                  ? `• Taxa: ${
                      withdrawalFeeType === 'percentage'
                        ? `${withdrawalFee}%`
                        : `R$ ${withdrawalFee.toFixed(2)}`
                    }\n`
                  : ''}
                • Processamento em até 3 dias úteis{'\n'}
                • Transferência via Pix{'\n'}• Você receberá confirmação por e-mail
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button
              variant="ghost"
              size="sm"
              responsive={false}
              onPress={onClose}
              disabled={loading}
              style={styles.actionBtn}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              responsive={false}
              onPress={() => void handleSubmit()}
              loading={loading}
              disabled={!isFormValid() || loading || loadingFees}
              style={styles.actionBtn}
            >
              Solicitar saque
            </Button>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </CustomModal>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    overlay: {
      paddingHorizontal: 12,
      paddingVertical: 16,
      justifyContent: 'center',
    },
    keyboardAvoiding: {
      width: '100%',
      maxHeight: '92%',
      alignSelf: 'center',
    },
    sheet: {
      width: '100%',
      maxWidth: 560,
      maxHeight: '100%',
      backgroundColor: c.background.paper,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border.light,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border.light,
      minWidth: 0,
    },
    headerLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      flex: 1,
      minWidth: 0,
      fontSize: 18,
      fontWeight: '700',
      color: c.text.primary,
    },
    content: {
      flexGrow: 0,
      flexShrink: 1,
      maxHeight: 520,
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
    },
    balanceCard: {
      backgroundColor: c.secondary.main,
      borderRadius: 12,
      padding: 18,
      alignItems: 'center',
      marginBottom: 18,
    },
    balanceLabel: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.9)',
      marginBottom: 4,
    },
    balanceAmount: {
      fontSize: 28,
      fontWeight: '700',
      color: '#ffffff',
    },
    section: {
      marginBottom: 16,
      width: '100%',
      minWidth: 0,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text.primary,
      marginBottom: 6,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: c.text.primary,
      marginBottom: 8,
    },
    helperText: {
      fontSize: 12,
      color: c.text.secondary,
      marginTop: 4,
      marginBottom: 8,
      lineHeight: 16,
    },
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border.medium,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: c.background.tertiary,
    },
    amountPrefix: {
      fontSize: 18,
      fontWeight: '600',
      color: c.text.secondary,
      marginRight: 8,
    },
    amountInput: {
      flex: 1,
      fontSize: 22,
      fontWeight: '700',
      color: c.text.primary,
      padding: 0,
    },
    input: {
      backgroundColor: c.background.tertiary,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 15,
      color: c.text.primary,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border.light,
    },
    inputHalf: {
      flex: 1,
      minWidth: 0,
    },
    row: {
      flexDirection: 'row',
      gap: 8,
      width: '100%',
      minWidth: 0,
    },
    feeCard: {
      backgroundColor: c.background.tertiary,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.border.light,
    },
    feeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 8,
    },
    feeRowTotal: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: c.border.medium,
      marginBottom: 0,
    },
    feeLabel: {
      fontSize: 14,
      color: c.text.secondary,
      flexShrink: 1,
    },
    feeValue: {
      fontSize: 14,
      fontWeight: '600',
      color: c.text.primary,
    },
    feeValueNegative: {
      color: c.states.error,
    },
    feeLabelTotal: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text.primary,
    },
    feeValueTotal: {
      fontSize: 15,
      fontWeight: '700',
      color: c.states.success,
    },
    infoCard: {
      backgroundColor: c.background.tertiary,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.border.light,
    },
    infoTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text.primary,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 12,
      color: c.text.secondary,
      lineHeight: 20,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border.light,
      minWidth: 0,
    },
    actionBtn: {
      flex: 1,
      minWidth: 0,
    },
    suggestionsContainer: {
      position: 'absolute',
      top: 48,
      left: 0,
      right: 0,
      backgroundColor: c.background.paper,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border.medium,
      maxHeight: 180,
      zIndex: 1000,
      elevation: 5,
    },
    suggestionItem: {
      padding: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.light,
    },
    suggestionText: {
      fontSize: 14,
      color: c.text.primary,
    },
  });
