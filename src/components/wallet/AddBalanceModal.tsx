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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { walletApi } from '../../services/api';
import { setPendingMpDeposit } from '../../lib/wallet-pending-deposit';
import { COLORS } from '../../theme/colors';
import { showToast } from '../CustomToast';
import { Linking } from 'react-native';
import { SelectRow } from '../SelectRow';

interface AddBalanceModalProps {
  visible: boolean;
  onClose: () => void;
  /** Chamado após abrir checkout (recarga pendente — reconciliar na carteira). */
  onSuccess?: (pendingDepositId?: string) => void;
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
  const [currentPackageIndex, setCurrentPackageIndex] = useState(0);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingFee, setLoadingFee] = useState(true);
  const [customDepositFee, setCustomDepositFee] = useState<number>(8);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('MERCADOPAGO'); // Padrão: Mercado Pago para Brasil
  const [detectingCountry, setDetectingCountry] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const MIN_AMOUNT = 10;
  const MAX_AMOUNT = 50000;
  const isStripeMode = paymentProvider === 'STRIPE';
  const VISIBLE_PACKAGES = 3;

  useEffect(() => {
    if (visible) {
      navigatingRef.current = false;
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        fetchData();
        if (detectingCountry) {
          detectPaymentProvider().then(provider => {
            setPaymentProvider(provider);
            setDetectingCountry(false);
          }).catch(() => {
            // Padrão: Mercado Pago para Brasil
            setPaymentProvider('MERCADOPAGO');
            setDetectingCountry(false);
          });
        }
      }
    } else {
      navigatingRef.current = false;
      hasInitializedRef.current = false;
    }
  }, [visible, detectingCountry]);

  const fetchData = async () => {
    setLoadingFee(true);
    try {
      const [packagesResponse, feeResponse] = await Promise.all([
        walletApi.getBalancePackages(),
        walletApi.getCustomDepositFee(),
      ]);

      if (packagesResponse.success && packagesResponse.data && packagesResponse.data.length > 0) {
        setPackages(packagesResponse.data);
        if (!selectedPackageId) setSelectedPackageId(packagesResponse.data[0]._id);
        setCurrentPackageIndex(0);
      } else {
        setPackages([]);
      }

      if (feeResponse.success && feeResponse.data) {
        setCustomDepositFee(feeResponse.data.customDepositFeePercentage ?? 8);
      } else {
        setCustomDepositFee(8);
      }
    } catch (error) {
      console.error('[ADD_BALANCE] Erro ao buscar dados:', error);
      setPackages([]);
      setCustomDepositFee(8);
    } finally {
      setLoadingFee(false);
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
        const pendingDepositId = response.data.pendingDepositId;

        if (pendingDepositId) {
          await setPendingMpDeposit(null, pendingDepositId);
        }

        const canOpen = await Linking.canOpenURL(checkoutUrl);
        if (canOpen) {
          await Linking.openURL(checkoutUrl);
          onSuccess?.(pendingDepositId);
          onClose();
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

  const handlePrevPackage = () => {
    if (packages.length <= 1) return;
    const nextIndex = currentPackageIndex === 0 ? packages.length - 1 : currentPackageIndex - 1;
    const nextPackage = packages[nextIndex];
    setCurrentPackageIndex(nextIndex);
    if (nextPackage) {
      setSelectedPackageId(nextPackage._id);
      setUseCustomAmount(false);
      setCustomAmount('');
    }
  };

  const handleNextPackage = () => {
    if (packages.length <= 1) return;
    const nextIndex = currentPackageIndex === packages.length - 1 ? 0 : currentPackageIndex + 1;
    setCurrentPackageIndex(nextIndex);
  };

  const getVisiblePackages = () => {
    if (packages.length <= VISIBLE_PACKAGES) return packages;
    return Array.from({ length: VISIBLE_PACKAGES }, (_, idx) => {
      const packageIndex = (currentPackageIndex + idx) % packages.length;
      return packages[packageIndex];
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <Pressable
            style={[
              styles.container,
              isStripeMode ? styles.containerStripe : styles.containerMercadoPago,
              { paddingTop: 12, paddingBottom: 16 },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.secondary.main} />
              <Text style={styles.headerTitle}>Adicionar Saldo</Text>
              {!loadingFee && packages.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowInfo(!showInfo)}
                  style={styles.infoIconButton}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="information-circle-outline" 
                    size={22} 
                    color={COLORS.text.secondary} 
                  />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >

            {loadingFee ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.secondary.main} />
                <Text style={styles.loadingText}>Carregando pacotes e taxas...</Text>
              </View>
            ) : packages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="wallet-outline" size={48} color={COLORS.text.tertiary} />
                <Text style={styles.emptyText}>Nenhum pacote disponível</Text>
                <Text style={styles.emptySubtext}>
                  Entre em contato com o suporte ou tente novamente mais tarde.
                </Text>
              </View>
            ) : (
              <>
                {/* Seleção de Gateway - no topo */}
                <View style={styles.gatewaySection}>
                  <SelectRow
                    label="Selecionar gateway"
                    value={paymentProvider}
                    options={[
                      { value: 'MERCADOPAGO', label: 'Mercado Pago' },
                      { value: 'STRIPE', label: 'Stripe' },
                    ]}
                    onChange={(value) => {
                      const selected = value as PaymentProvider;
                      setPaymentProvider(selected);
                      if (selected === 'STRIPE') {
                        setUseCustomAmount(false);
                        setCustomAmount('');
                      }
                    }}
                  />
                </View>

                {/* Pacotes - Carrossel com setas */}
                <View style={styles.packagesCarouselContainer}>
                  {packages.length > 1 && (
                    <TouchableOpacity style={styles.carouselArrowButton} onPress={handlePrevPackage} activeOpacity={0.7}>
                      <Ionicons name="chevron-back" size={20} color={COLORS.secondary.main} />
                    </TouchableOpacity>
                  )}

                  <View style={styles.carouselCardsRow}>
                    {getVisiblePackages().map((pkg) => {
                    const netAmount = calculateNetAmount(pkg.amount, pkg.feePercentage);
                    const isSelected = !useCustomAmount && selectedPackageId === pkg._id;

                    return (
                      <TouchableOpacity
                        key={pkg._id}
                        style={[styles.packageCard, styles.packageCardCarousel, isSelected && styles.packageCardSelected]}
                        onPress={() => {
                          setSelectedPackageId(pkg._id);
                          setUseCustomAmount(false);
                          setCustomAmount('');
                        }}
                        activeOpacity={0.7}
                      >
                        {pkg.popular && (
                          <View style={styles.popularBadge}>
                            <Text style={styles.popularBadgeText}>Mais Vendido</Text>
                          </View>
                        )}
                        <Text style={styles.packageName}>{pkg.name}</Text>
                        <Text style={styles.packageAmount}>R$ {pkg.amount.toFixed(2)}</Text>
                        <View style={styles.packageFooter}>
                          {pkg.feePercentage > 0 ? (
                            <>
                              <Text style={styles.packageReceive}>
                                Você recebe: R$ {netAmount.toFixed(2)}
                              </Text>
                            <Text style={styles.packageFee}>
                              Taxa: {pkg.feePercentage}% (R$ {(pkg.amount - netAmount).toFixed(2)})
                            </Text>
                            </>
                          ) : (
                            <Text style={[styles.packageFee, { color: COLORS.states.success }]}>
                              Sem taxas
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  </View>

                  {packages.length > 1 && (
                    <TouchableOpacity style={styles.carouselArrowButton} onPress={handleNextPackage} activeOpacity={0.7}>
                      <Ionicons name="chevron-forward" size={20} color={COLORS.secondary.main} />
                    </TouchableOpacity>
                  )}
                </View>

                {paymentProvider === 'MERCADOPAGO' && (
                  <View style={styles.customAmountSection}>
                    <View style={styles.customTitleRow}>
                      <Ionicons name="create-outline" size={16} color={COLORS.secondary.main} />
                      <Text style={styles.customAmountTitle}>Adicionar valor personalizado</Text>
                    </View>
                    <View style={[styles.customAmountInputContainer, useCustomAmount && styles.customAmountInputContainerActive]}>
                      <Text style={styles.customInputLabel}>R$</Text>
                      <TextInput
                        style={styles.customInput}
                        value={customAmount}
                        onFocus={() => setUseCustomAmount(true)}
                        onChangeText={(value) => {
                          const cleaned = value.replace(/[^\d,.]/g, '');
                          setCustomAmount(cleaned);
                          setUseCustomAmount(cleaned.length > 0);
                        }}
                        onBlur={() => {
                          const num = parseFloat(customAmount.replace(',', '.'));
                          if (!isNaN(num)) {
                            setCustomAmount(num.toFixed(2).replace('.', ','));
                          }
                        }}
                        placeholder="0,00"
                        placeholderTextColor={COLORS.text.tertiary}
                        keyboardType="numeric"
                      />
                    </View>
                    {customAmount ? (
                      (() => {
                        const amount = parseFloat(customAmount.replace(',', '.'));
                        if (isNaN(amount)) return null;
                        if (amount < MIN_AMOUNT) {
                          return <Text style={styles.customAmountHintError}>Valor mínimo: R$ {MIN_AMOUNT.toFixed(2)}</Text>;
                        }
                        if (amount > MAX_AMOUNT) {
                          return <Text style={styles.customAmountHintError}>Valor máximo: R$ {MAX_AMOUNT.toFixed(2)}</Text>;
                        }
                        const netAmount = calculateNetAmount(amount, customDepositFee);
                        return (
                          <Text style={styles.customAmountHint}>
                            Você recebe R$ {netAmount.toFixed(2)} (taxa {customDepositFee}%)
                          </Text>
                        );
                      })()
                    ) : (
                      <Text style={styles.customAmountHint}>
                        Mínimo R$ {MIN_AMOUNT.toFixed(2)} · Máximo R$ {MAX_AMOUNT.toFixed(2)}
                      </Text>
                    )}
                  </View>
                )}

              </>
            )}
          </ScrollView>

          {/* Conteúdo expansível de informações */}
          {showInfo && !loadingFee && packages.length > 0 && (
            <View style={styles.infoContent}>
              <Text style={styles.infoContentTitle}>Como funciona:</Text>
              <Text style={styles.infoContentText}>
                • Pague com {paymentProvider === 'STRIPE' ? 'Stripe' : 'Mercado Pago'}{'\n'}
                • Saldo adicionado instantaneamente{'\n'}
                • Use para compras e doações
              </Text>
              <Text style={[styles.infoContentTitle, { marginTop: 12 }]}>Sobre as taxas:</Text>
              <Text style={styles.infoContentText}>
                Valores customizados têm taxa de {customDepositFee}%. Os pacotes têm taxas individuais mostradas em cada card.
              </Text>
            </View>
          )}

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
                <Text style={styles.purchaseButtonText}>Pagar</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoiding: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'column',
  },
  containerStripe: {
    maxHeight: '82%',
    minHeight: '60%',
  },
  containerMercadoPago: {
    maxHeight: '94%',
    minHeight: '72%',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  infoIconButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingVertical: 8,
    paddingBottom: 12,
    flexGrow: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  packagesCarouselContainer: {
    marginTop: 6,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  carouselCardsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  carouselArrowButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageCard: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: COLORS.border.medium,
    position: 'relative',
    width: 68,
    height: 104,
    justifyContent: 'space-between',
  },
  packageCardCarousel: {
    flex: 1,
    minWidth: 0,
  },
  packageCardSelected: {
    borderColor: COLORS.secondary.main,
    backgroundColor: COLORS.secondary.light + '20',
  },
  customCard: {
    width: 150, // Mesma largura dos outros cards
  },
  customTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customAmountSection: {
    marginTop: 4,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.tertiary,
    gap: 8,
  },
  customAmountTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.states.success,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  popularBadgeText: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: '700',
  },
  packageName: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 2,
    minHeight: 14,
  },
  packageAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: 2,
  },
  packageFooter: {
    marginTop: 2,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    minHeight: 24,
  },
  packageReceive: {
    fontSize: 8,
    fontWeight: '600',
    color: COLORS.states.success,
    marginBottom: 1,
  },
  packageFee: {
    fontSize: 7,
    color: COLORS.states.warning,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  customAmountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.background.paper,
  },
  customAmountInputContainerActive: {
    borderColor: COLORS.secondary.main,
  },
  customInputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginRight: 8,
  },
  customInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    paddingVertical: 6,
  },
  customAmountHint: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  customAmountHintError: {
    fontSize: 12,
    color: COLORS.states.error,
  },
  customPlaceholder: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary.main,
    marginTop: 8,
  },
  gatewaySection: {
    marginTop: 16,
    marginBottom: 12,
  },
  infoContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.background.tertiary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  infoContentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  infoContentText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
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

