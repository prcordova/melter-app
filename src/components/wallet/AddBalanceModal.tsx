import React, { useState, useEffect, useRef } from 'react';
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
import { walletApi } from '../../services/api';
import { COLORS } from '../../theme/colors';
import { showToast } from '../CustomToast';
import { Linking } from 'react-native';

interface AddBalanceModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface BalancePackage {
  _id: string;
  amount: number;
  name: string;
  feePercentage: number;
  popular: boolean;
  order: number;
}

type PaymentProvider = 'STRIPE' | 'MERCADOPAGO';

const MERCADOPAGO_COUNTRIES = [
  'BR', 'AR', 'MX', 'CL', 'CO', 'PE', 'UY', 'EC', 'PY', 'BO', 'CR', 'PA', 'DO', 'GT', 'HN', 'NI', 'SV',
];

async function detectPaymentProvider(): Promise<PaymentProvider> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      const countryCode = data.country_code;
      if (countryCode && MERCADOPAGO_COUNTRIES.includes(countryCode)) {
        return 'MERCADOPAGO';
      }
      return 'STRIPE';
    }
  } catch (error) {
    console.error('[PAYMENT] Erro ao detectar país:', error);
  }

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const latamTimezones = [
      'America/Sao_Paulo', 'America/Manaus', 'America/Campo_Grande', 'America/Cuiaba',
      'America/Fortaleza', 'America/Recife', 'America/Araguaina', 'America/Maceio',
      'America/Bahia', 'America/Belem', 'America/Boa_Vista', 'America/Eirunepe',
      'America/Noronha', 'America/Porto_Velho', 'America/Rio_Branco', 'America/Santarem',
      'America/Argentina/Buenos_Aires', 'America/Mexico_City', 'America/Santiago',
      'America/Bogota', 'America/Lima', 'America/Montevideo', 'America/Guayaquil',
      'America/Asuncion', 'America/La_Paz',
    ];
    if (latamTimezones.some(tz => timezone.includes(tz))) {
      return 'MERCADOPAGO';
    }
  } catch (error) {
    console.error('[PAYMENT] Erro ao detectar timezone:', error);
  }

  return 'STRIPE';
}

export function AddBalanceModal({ visible, onClose, onSuccess }: AddBalanceModalProps) {
  const insets = useSafeAreaInsets();
  const navigatingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const [packages, setPackages] = useState<BalancePackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingFee, setLoadingFee] = useState(true);
  const [customDepositFee, setCustomDepositFee] = useState<number>(8);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('STRIPE');
  const [detectingCountry, setDetectingCountry] = useState(true);

  const MIN_AMOUNT = 10;
  const MAX_AMOUNT = 50000;

  useEffect(() => {
    if (visible) {
      navigatingRef.current = false;
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        fetchPackages();
        fetchCustomDepositFee();
        if (detectingCountry) {
          detectPaymentProvider().then(provider => {
            setPaymentProvider(provider);
            setDetectingCountry(false);
          }).catch(() => {
            setPaymentProvider('STRIPE');
            setDetectingCountry(false);
          });
        }
      }
    } else {
      navigatingRef.current = false;
      hasInitializedRef.current = false;
    }
  }, [visible, detectingCountry]);

  const fetchPackages = async () => {
    try {
      const response = await walletApi.getBalancePackages();
      if (response.success && response.data && response.data.length > 0) {
        setPackages(response.data);
        if (!selectedPackageId) {
          setSelectedPackageId(response.data[0]._id);
        }
      }
    } catch (error) {
      console.error('[ADD_BALANCE] Erro ao buscar pacotes:', error);
    } finally {
      setLoadingFee(false);
    }
  };

  const fetchCustomDepositFee = async () => {
    try {
      const response = await walletApi.getCustomDepositFee();
      if (response.success && response.data) {
        setCustomDepositFee(response.data.customDepositFeePercentage || 8);
      }
    } catch (error) {
      console.error('[ADD_BALANCE] Erro ao buscar taxa:', error);
    }
  };

  const calculateNetAmount = (grossAmount: number, feePercentage: number) => {
    const fee = grossAmount * (feePercentage / 100);
    return grossAmount - fee;
  };

  const handlePurchase = async () => {
    if (navigatingRef.current) {
      console.warn('[CHECKOUT] Navegação já em andamento');
      return;
    }

    navigatingRef.current = true;

    try {
      setLoading(true);

      if (useCustomAmount && paymentProvider === 'STRIPE') {
        showToast.error('Valores customizados estão disponíveis apenas com Mercado Pago');
        navigatingRef.current = false;
        setLoading(false);
        return;
      }

      if (useCustomAmount) {
        const amount = parseFloat(customAmount.replace(',', '.'));
        if (isNaN(amount) || amount < MIN_AMOUNT) {
          showToast.error(`Valor mínimo é R$ ${MIN_AMOUNT.toFixed(2)}`);
          navigatingRef.current = false;
          setLoading(false);
          return;
        }
        if (amount > MAX_AMOUNT) {
          showToast.error(`Valor máximo é R$ ${MAX_AMOUNT.toFixed(2)}`);
          navigatingRef.current = false;
          setLoading(false);
          return;
        }
      }

      if (!useCustomAmount && !selectedPackageId) {
        showToast.error('Selecione um pacote');
        navigatingRef.current = false;
        setLoading(false);
        return;
      }

      const response = await walletApi.createCheckout({
        packageType: useCustomAmount ? undefined : selectedPackageId,
        provider: paymentProvider,
        customAmount: useCustomAmount ? parseFloat(customAmount.replace(',', '.')) : undefined,
      });

      if (response.success && response.data?.checkoutUrl) {
        const checkoutUrl = response.data.checkoutUrl;
        const canOpen = await Linking.canOpenURL(checkoutUrl);
        if (canOpen) {
          await Linking.openURL(checkoutUrl);
        } else {
          showToast.error('Não foi possível abrir o link de pagamento');
          navigatingRef.current = false;
          setLoading(false);
        }
      } else {
        showToast.error(response.message || 'Erro ao criar checkout');
        navigatingRef.current = false;
        setLoading(false);
      }
    } catch (error: any) {
      console.error('[CHECKOUT] Erro:', error);
      showToast.error(error.response?.data?.message || 'Erro ao processar pagamento');
      navigatingRef.current = false;
      setLoading(false);
    }
  };

  const getSelectedPackage = (): BalancePackage | null => {
    if (useCustomAmount) return null;
    return packages.find(p => p._id === selectedPackageId) || null;
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
            <Text style={styles.headerTitle}>💰 Adicionar Saldo</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loadingFee ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.secondary.main} />
              </View>
            ) : packages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum pacote disponível</Text>
              </View>
            ) : (
              <>
                {/* Pacotes */}
                <View style={styles.packagesGrid}>
                  {packages.map((pkg) => {
                    const netAmount = calculateNetAmount(pkg.amount, pkg.feePercentage);
                    const isSelected = !useCustomAmount && selectedPackageId === pkg._id;

                    return (
                      <TouchableOpacity
                        key={pkg._id}
                        style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                        onPress={() => {
                          setSelectedPackageId(pkg._id);
                          setUseCustomAmount(false);
                        }}
                      >
                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary.main} />
                          </View>
                        )}
                        {pkg.popular && (
                          <View style={styles.popularBadge}>
                            <Text style={styles.popularBadgeText}>Mais Vendido</Text>
                          </View>
                        )}
                        <Text style={styles.packageName}>{pkg.name}</Text>
                        <Text style={styles.packageAmount}>R$ {pkg.amount.toFixed(2)}</Text>
                        <View style={styles.packageFooter}>
                          <Text style={styles.packageReceive}>
                            Você recebe: R$ {netAmount.toFixed(2)}
                          </Text>
                          {pkg.feePercentage > 0 && (
                            <Text style={styles.packageFee}>
                              Taxa: {pkg.feePercentage}% (R$ {(pkg.amount - netAmount).toFixed(2)})
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Valor Customizado - Apenas Mercado Pago */}
                  {paymentProvider === 'MERCADOPAGO' && (
                    <TouchableOpacity
                      style={[styles.packageCard, styles.customCard, useCustomAmount && styles.packageCardSelected]}
                      onPress={() => setUseCustomAmount(true)}
                    >
                      {useCustomAmount && (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary.main} />
                        </View>
                      )}
                      <Text style={styles.packageName}>✏️ Valor Customizado</Text>
                      {useCustomAmount ? (
                        <>
                          <View style={styles.customInputContainer}>
                            <Text style={styles.customInputLabel}>R$</Text>
                            <TextInput
                              style={styles.customInput}
                              value={customAmount}
                              onChangeText={(value) => {
                                const cleaned = value.replace(/[^\d,.]/g, '');
                                setCustomAmount(cleaned);
                              }}
                              onBlur={() => {
                                const num = parseFloat(customAmount.replace(',', '.'));
                                if (!isNaN(num)) {
                                  setCustomAmount(num.toFixed(2).replace('.', ','));
                                }
                              }}
                              placeholder="0,00"
                              keyboardType="numeric"
                              autoFocus
                            />
                          </View>
                          {customAmount && (() => {
                            const amount = parseFloat(customAmount.replace(',', '.'));
                            if (!isNaN(amount)) {
                              const netAmount = calculateNetAmount(amount, customDepositFee);
                              return (
                                <View style={styles.packageFooter}>
                                  <Text style={styles.packageReceive}>
                                    Você recebe: R$ {netAmount.toFixed(2)}
                                  </Text>
                                  {customDepositFee > 0 && (
                                    <Text style={styles.packageFee}>
                                      Taxa: {customDepositFee}% (R$ {(amount - netAmount).toFixed(2)})
                                    </Text>
                                  )}
                                </View>
                              );
                            }
                            return null;
                          })()}
                        </>
                      ) : (
                        <Text style={styles.customPlaceholder}>Escolha o valor</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Seleção de Gateway */}
                <View style={styles.gatewaySection}>
                  <Text style={styles.gatewayTitle}>💳 Método de Pagamento</Text>
                  <View style={styles.gatewayOptions}>
                    <TouchableOpacity
                      style={[styles.gatewayOption, paymentProvider === 'STRIPE' && styles.gatewayOptionSelected]}
                      onPress={() => setPaymentProvider('STRIPE')}
                    >
                      <Text style={styles.gatewayOptionTitle}>💳 Stripe</Text>
                      <Text style={styles.gatewayOptionDesc}>Cartões internacionais</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.gatewayOption, paymentProvider === 'MERCADOPAGO' && styles.gatewayOptionSelected]}
                      onPress={() => setPaymentProvider('MERCADOPAGO')}
                    >
                      <Text style={styles.gatewayOptionTitle}>🇧🇷 Mercado Pago</Text>
                      <Text style={styles.gatewayOptionDesc}>Brasil e América Latina</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
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
              style={[styles.button, styles.purchaseButton, loading && styles.buttonDisabled]}
              onPress={handlePurchase}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.purchaseButtonText}>
                  {paymentProvider === 'STRIPE' ? 'Pagar com Stripe' : 'Pagar com Mercado Pago'}
                </Text>
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
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  packagesGrid: {
    marginTop: 16,
    gap: 12,
  },
  packageCard: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border.medium,
    position: 'relative',
  },
  packageCardSelected: {
    borderColor: COLORS.secondary.main,
    backgroundColor: COLORS.secondary.light + '20',
  },
  customCard: {
    // Custom card takes full width
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.states.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  packageName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  packageAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: 8,
  },
  packageFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  packageReceive: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.states.success,
    marginBottom: 2,
  },
  packageFee: {
    fontSize: 10,
    color: COLORS.states.warning,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  customInputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginRight: 8,
  },
  customInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.medium,
    paddingVertical: 4,
  },
  customPlaceholder: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary.main,
    marginTop: 8,
  },
  gatewaySection: {
    marginTop: 24,
    marginBottom: 16,
  },
  gatewayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  gatewayOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  gatewayOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border.medium,
    backgroundColor: COLORS.background.tertiary,
  },
  gatewayOptionSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.light + '20',
  },
  gatewayOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  gatewayOptionDesc: {
    fontSize: 11,
    color: COLORS.text.secondary,
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
  purchaseButton: {
    backgroundColor: COLORS.secondary.main,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

