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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { walletApi } from '../../services/api';
import { clearPendingMpDeposit, setPendingMpDeposit } from '../../lib/wallet-pending-deposit';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import { showToast } from '../CustomToast';
import { Linking } from 'react-native';
import { SelectRow } from '../SelectRow';

interface AddBalanceModalProps {
  visible: boolean;
  onClose: () => void;
  /** Chamado após abrir checkout (recarga pendente — reconciliar na carteira). */
  onSuccess?: (pendingDepositId?: string) => void;
  /** PIX nativo confirmado — saldo já creditado. */
  onDepositCompleted?: () => void;
}

type PaymentMethod = 'PIX' | 'CHECKOUT';

type PixData = {
  pendingDepositId: string;
  qrCodeBase64?: string;
  qrCodeCopyPaste: string;
  expiresAt: string;
  grossAmount: number;
  netAmount: number;
};

const PIX_POLL_INTERVAL_MS = 5000;

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

/** Paridade web (`detectCardProvider`): LATAM → Mercado Pago; senão Stripe; fallback MP. */
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
    const locale = (Intl.DateTimeFormat().resolvedOptions().locale || '').toLowerCase();
    if (
      locale.startsWith('pt-br') ||
      locale.startsWith('es-') ||
      locale === 'pt' ||
      locale === 'es'
    ) {
      return 'MERCADOPAGO';
    }
  } catch {
    /* ignore */
  }

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const latamTimezones = [
      'America/Sao_Paulo', 'America/Manaus', 'America/Campo_Grande', 'America/Cuiaba',
      'America/Fortaleza', 'America/Recife', 'America/Araguaina', 'America/Maceio',
      'America/Bahia', 'America/Belem', 'America/Boa_Vista', 'America/Eirunepe',
      'America/Noronha', 'America/Porto_Velho', 'America/Rio_Branco', 'America/Santarem',
      'America/Argentina/Buenos_Aires', 'America/Mexico_City', 'America/Santiago',
      'America/Bogota', 'America/Lima', 'America/Montevideo', 'America/Guayaquil',
      'America/Asuncion', 'America/La_Paz',
    ];
    if (latamTimezones.some((tz) => timezone.includes(tz))) {
      return 'MERCADOPAGO';
    }
  } catch (error) {
    console.error('[PAYMENT] Erro ao detectar timezone:', error);
  }

  return 'MERCADOPAGO';
}

export function AddBalanceModal({ visible, onClose, onSuccess, onDepositCompleted }: AddBalanceModalProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
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
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('MERCADOPAGO');
  const [detectingCountry, setDetectingCountry] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pixCountdown, setPixCountdown] = useState('');

  const MIN_AMOUNT = 10;
  const MAX_AMOUNT = 50000;
  /** Checkout cartão: Stripe fora da LATAM; PIX sempre Mercado Pago. */
  const checkoutProvider: PaymentProvider =
    paymentMethod === 'PIX' ? 'MERCADOPAGO' : paymentProvider;
  const isStripeMode = checkoutProvider === 'STRIPE';
  const VISIBLE_PACKAGES = 3;

  useEffect(() => {
    if (visible) {
      navigatingRef.current = false;
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        setPaymentMethod('PIX');
        fetchData();
        setDetectingCountry(true);
        detectPaymentProvider()
          .then((provider) => {
            setPaymentProvider(provider);
          })
          .catch(() => {
            setPaymentProvider('MERCADOPAGO');
          })
          .finally(() => {
            setDetectingCountry(false);
          });
      }
    } else {
      navigatingRef.current = false;
      hasInitializedRef.current = false;
      setPixData(null);
      setPixCountdown('');
    }
  }, [visible]);

  const pendingPixId = pixData?.pendingDepositId;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const depositCompletedRef = useRef(onDepositCompleted);
  depositCompletedRef.current = onDepositCompleted;

  useEffect(() => {
    if (!visible || !pendingPixId) return;
    let active = true;

    const poll = async () => {
      try {
        const response = await walletApi.getPixDeposit(pendingPixId);
        if (!active || !response.success || !response.data) return;
        const { status } = response.data;
        if (status === 'approved') {
          active = false;
          await clearPendingMpDeposit();
          showToast.success('Pagamento PIX confirmado! Saldo adicionado.');
          setPixData(null);
          depositCompletedRef.current?.();
          closeRef.current();
        } else if (status === 'cancelled' || status === 'rejected') {
          active = false;
          await clearPendingMpDeposit();
          showToast.error('O PIX expirou ou foi cancelado. Gere um novo código.');
          setPixData(null);
        }
      } catch {
        /* silencioso no poll */
      }
    };

    const interval = setInterval(() => void poll(), PIX_POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [visible, pendingPixId]);

  const pixExpiresAt = pixData?.expiresAt;

  useEffect(() => {
    if (!pixExpiresAt) return;
    const tick = () => {
      const diff = new Date(pixExpiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setPixCountdown('00:00');
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setPixCountdown(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pixExpiresAt]);

  const handleCopyPix = async () => {
    if (!pixData?.qrCodeCopyPaste) return;
    try {
      await Clipboard.setStringAsync(pixData.qrCodeCopyPaste);
      showToast.success('Código PIX copiado');
    } catch {
      showToast.error('Não foi possível copiar o código');
    }
  };

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

      if (useCustomAmount && checkoutProvider === 'STRIPE') {
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

      if (paymentMethod === 'PIX') {
        const pixResponse = await walletApi.createPixDeposit({
          packageType: useCustomAmount ? undefined : selectedPackageId,
          customAmount: useCustomAmount ? parseFloat(customAmount.replace(',', '.')) : undefined,
        });
        if (pixResponse.success && pixResponse.data?.qrCodeCopyPaste) {
          await setPendingMpDeposit(null, pixResponse.data.pendingDepositId);
          setPixData({
            pendingDepositId: pixResponse.data.pendingDepositId,
            qrCodeBase64: pixResponse.data.qrCodeBase64,
            qrCodeCopyPaste: pixResponse.data.qrCodeCopyPaste,
            expiresAt: pixResponse.data.expiresAt,
            grossAmount: pixResponse.data.grossAmount,
            netAmount: pixResponse.data.netAmount,
          });
          showToast.success('PIX gerado! Pague no app do seu banco.');
        } else {
          showToast.error(pixResponse.message || 'Erro ao gerar PIX');
        }
        navigatingRef.current = false;
        setLoading(false);
        return;
      }

      const response = await walletApi.createCheckout({
        packageType: useCustomAmount ? undefined : selectedPackageId,
        provider: checkoutProvider,
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
              <Ionicons name="wallet-outline" size={20} color={colors.secondary.main} />
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
                    color={colors.text.secondary} 
                  />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
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

            {pixData ? (
              <View style={styles.pixContainer}>
                <Text style={styles.pixTitle}>Pague com PIX</Text>
                <Text style={styles.pixSubtitle}>
                  Valor: R$ {pixData.grossAmount.toFixed(2)} · Você recebe: R$ {pixData.netAmount.toFixed(2)}
                </Text>
                {pixData.qrCodeBase64 ? (
                  <Image
                    source={{ uri: `data:image/png;base64,${pixData.qrCodeBase64}` }}
                    style={styles.pixQrCode}
                    resizeMode="contain"
                    accessibilityLabel="QR Code PIX"
                  />
                ) : null}
                {pixCountdown ? (
                  <Text style={styles.pixCountdown}>Expira em {pixCountdown}</Text>
                ) : null}
                <Text style={styles.pixCodeLabel}>PIX copia e cola</Text>
                <Text style={styles.pixCode} selectable numberOfLines={4}>
                  {pixData.qrCodeCopyPaste}
                </Text>
                <View style={styles.pixWaitingRow}>
                  <ActivityIndicator size="small" color={colors.secondary.main} />
                  <Text style={styles.pixWaitingText}>Aguardando confirmação do pagamento...</Text>
                </View>
              </View>
            ) : loadingFee ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.secondary.main} />
                <Text style={styles.loadingText}>Carregando pacotes e taxas...</Text>
              </View>
            ) : packages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="wallet-outline" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>Nenhum pacote disponível</Text>
                <Text style={styles.emptySubtext}>
                  Entre em contato com o suporte ou tente novamente mais tarde.
                </Text>
              </View>
            ) : (
              <>
                {/* Valor primeiro — depois método de pagamento (paridade web) */}
                <Text style={styles.sectionLabel}>Escolha o valor</Text>
                <View style={styles.packagesCarouselContainer}>
                  {packages.length > 1 ? (
                    <TouchableOpacity
                      style={styles.carouselArrowButton}
                      onPress={handlePrevPackage}
                      activeOpacity={0.7}
                      accessibilityLabel="Pacote anterior"
                    >
                      <Ionicons name="chevron-back" size={18} color={colors.secondary.main} />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.carouselArrowSpacer} />
                  )}

                  <View style={styles.carouselCardsRow}>
                    {getVisiblePackages().map((pkg) => {
                      const netAmount = calculateNetAmount(pkg.amount, pkg.feePercentage);
                      const isSelected = !useCustomAmount && selectedPackageId === pkg._id;

                      return (
                        <TouchableOpacity
                          key={pkg._id}
                          style={[
                            styles.packageCard,
                            styles.packageCardCarousel,
                            isSelected && styles.packageCardSelected,
                          ]}
                          onPress={() => {
                            setSelectedPackageId(pkg._id);
                            setUseCustomAmount(false);
                            setCustomAmount('');
                          }}
                          activeOpacity={0.7}
                        >
                          {pkg.popular ? (
                            <View style={styles.popularBadge}>
                              <Text style={styles.popularBadgeText}>Mais Vendido</Text>
                            </View>
                          ) : null}
                          <Text style={styles.packageName} numberOfLines={2}>
                            {pkg.name}
                          </Text>
                          <Text style={styles.packageAmount}>R$ {pkg.amount.toFixed(2)}</Text>
                          <View style={styles.packageFooter}>
                            {pkg.feePercentage > 0 ? (
                              <>
                                <Text style={styles.packageReceive} numberOfLines={2}>
                                  Você recebe{'\n'}R$ {netAmount.toFixed(2)}
                                </Text>
                                <Text style={styles.packageFee} numberOfLines={2}>
                                  Taxa {pkg.feePercentage}%{'\n'}
                                  (R$ {(pkg.amount - netAmount).toFixed(2)})
                                </Text>
                              </>
                            ) : (
                              <Text style={[styles.packageFee, { color: colors.states.success }]}>
                                Sem taxas
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {packages.length > 1 ? (
                    <TouchableOpacity
                      style={styles.carouselArrowButton}
                      onPress={handleNextPackage}
                      activeOpacity={0.7}
                      accessibilityLabel="Próximo pacote"
                    >
                      <Ionicons name="chevron-forward" size={18} color={colors.secondary.main} />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.carouselArrowSpacer} />
                  )}
                </View>

                {!isStripeMode ? (
                  <View style={styles.customAmountSection}>
                    <View style={styles.customTitleRow}>
                      <Ionicons name="create-outline" size={16} color={colors.secondary.main} />
                      <Text style={styles.customAmountTitle}>Valor personalizado</Text>
                    </View>
                    <View
                      style={[
                        styles.customAmountInputContainer,
                        useCustomAmount && styles.customAmountInputContainerActive,
                      ]}
                    >
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
                        placeholderTextColor={colors.text.tertiary}
                        keyboardType="numeric"
                      />
                    </View>
                    {customAmount ? (
                      (() => {
                        const amount = parseFloat(customAmount.replace(',', '.'));
                        if (isNaN(amount)) return null;
                        if (amount < MIN_AMOUNT) {
                          return (
                            <Text style={styles.customAmountHintError}>
                              Valor mínimo: R$ {MIN_AMOUNT.toFixed(2)}
                            </Text>
                          );
                        }
                        if (amount > MAX_AMOUNT) {
                          return (
                            <Text style={styles.customAmountHintError}>
                              Valor máximo: R$ {MAX_AMOUNT.toFixed(2)}
                            </Text>
                          );
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
                ) : null}

                {/* Método abaixo do valor — PIX default (paridade web) */}
                <View style={styles.paymentMethodSection}>
                  <SelectRow
                    label="Método de pagamento"
                    value={paymentMethod}
                    options={[
                      { value: 'PIX', label: 'PIX (QR Code)' },
                      {
                        value: 'CHECKOUT',
                        label:
                          paymentProvider === 'STRIPE'
                            ? 'Cartão (Stripe)'
                            : 'Cartão / checkout Mercado Pago',
                      },
                    ]}
                    onChange={(value) => {
                      const next = value as PaymentMethod;
                      setPaymentMethod(next);
                      if (next === 'CHECKOUT' && paymentProvider === 'STRIPE') {
                        setUseCustomAmount(false);
                        setCustomAmount('');
                      }
                    }}
                  />
                  {detectingCountry ? (
                    <Text style={styles.gatewayHint}>Detectando gateway por região…</Text>
                  ) : paymentMethod === 'CHECKOUT' ? (
                    <Text style={styles.gatewayHint}>
                      Cartão via {paymentProvider === 'STRIPE' ? 'Stripe' : 'Mercado Pago'} (padrão da
                      sua região)
                    </Text>
                  ) : (
                    <Text style={styles.gatewayHint}>PIX via Mercado Pago</Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>

          {/* Conteúdo expansível de informações */}
          {showInfo && !pixData && !loadingFee && packages.length > 0 && (
            <View style={styles.infoContent}>
              <Text style={styles.infoContentTitle}>Como funciona:</Text>
              <Text style={styles.infoContentText}>
                • Pague com {paymentMethod === 'PIX' ? 'PIX (Mercado Pago)' : checkoutProvider === 'STRIPE' ? 'Stripe' : 'Mercado Pago'}{'\n'}
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
          {pixData ? (
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setPixData(null)}>
                <Text style={styles.cancelButtonText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.purchaseButton]} onPress={() => void handleCopyPix()}>
                <Text style={styles.purchaseButtonText}>Copiar código</Text>
              </TouchableOpacity>
            </View>
          ) : (
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
                    {paymentMethod === 'PIX' ? 'Gerar PIX' : 'Pagar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'flex-end',
  },
  keyboardAvoiding: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
    backgroundColor: c.background.paper,
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
    borderBottomColor: c.border.light,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.text.primary,
  },
  infoIconButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
  },
  contentContainer: {
    paddingVertical: 8,
    paddingBottom: 12,
    flexGrow: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: c.text.primary,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: c.text.secondary,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text.primary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: c.text.secondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  packagesCarouselContainer: {
    marginTop: 2,
    marginBottom: 10,
    marginHorizontal: -4,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 4,
  },
  carouselCardsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'stretch',
    minWidth: 0,
  },
  carouselArrowButton: {
    width: 26,
    minHeight: 148,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border.medium,
    backgroundColor: c.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  carouselArrowSpacer: {
    width: 8,
    flexShrink: 0,
  },
  packageCard: {
    backgroundColor: c.background.tertiary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 10,
    borderWidth: 2,
    borderColor: c.border.medium,
    position: 'relative',
    minHeight: 148,
    justifyContent: 'space-between',
    overflow: 'visible',
  },
  packageCardCarousel: {
    flex: 1,
    minWidth: 0,
  },
  packageCardSelected: {
    borderColor: c.secondary.main,
    backgroundColor: c.secondary.light + '20',
  },
  customTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customAmountSection: {
    marginTop: 4,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border.light,
    backgroundColor: c.background.tertiary,
    gap: 8,
  },
  customAmountTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: c.text.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    backgroundColor: c.states.success,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 2,
  },
  popularBadgeText: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: '700',
  },
  packageName: {
    fontSize: 11,
    fontWeight: '600',
    color: c.text.secondary,
    marginBottom: 4,
    lineHeight: 14,
  },
  packageAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: c.primary.main,
    marginBottom: 6,
  },
  packageFooter: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: c.border.light,
    gap: 2,
  },
  packageReceive: {
    fontSize: 10,
    fontWeight: '600',
    color: c.states.success,
    lineHeight: 13,
  },
  packageFee: {
    fontSize: 9,
    color: c.states.warning,
    lineHeight: 12,
  },
  paymentMethodSection: {
    marginTop: 4,
    marginBottom: 8,
    gap: 6,
  },
  gatewayHint: {
    fontSize: 12,
    color: c.text.secondary,
    lineHeight: 16,
    paddingHorizontal: 2,
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
    borderColor: c.border.medium,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: c.background.paper,
  },
  customAmountInputContainerActive: {
    borderColor: c.secondary.main,
  },
  customInputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: c.text.secondary,
    marginRight: 8,
  },
  customInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: c.text.primary,
    paddingVertical: 6,
  },
  customAmountHint: {
    fontSize: 12,
    color: c.text.secondary,
  },
  customAmountHintError: {
    fontSize: 12,
    color: c.states.error,
  },
  customPlaceholder: {
    fontSize: 18,
    fontWeight: '600',
    color: c.primary.main,
    marginTop: 8,
  },
  pixContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  pixTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.text.primary,
  },
  pixSubtitle: {
    fontSize: 13,
    color: c.text.secondary,
    textAlign: 'center',
  },
  pixQrCode: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  pixCountdown: {
    fontSize: 13,
    fontWeight: '600',
    color: c.states.warning,
  },
  pixCodeLabel: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '600',
    color: c.text.primary,
  },
  pixCode: {
    alignSelf: 'stretch',
    fontSize: 12,
    color: c.text.secondary,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border.light,
    backgroundColor: c.background.tertiary,
  },
  pixWaitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  pixWaitingText: {
    fontSize: 13,
    color: c.text.secondary,
  },
  infoContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: c.background.tertiary,
    borderTopWidth: 1,
    borderTopColor: c.border.light,
  },
  infoContentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 4,
  },
  infoContentText: {
    fontSize: 13,
    color: c.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: c.border.light,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
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
  purchaseButton: {
    backgroundColor: c.secondary.main,
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

