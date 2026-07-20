import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BackButton } from '../components/BackButton';
import { COLORS } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { userApi, paymentApi } from '../services/api';
import { showToast } from '../components/CustomToast';
import { useCustomModal, CustomModal } from '../components/CustomModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  MARKETING_PLANS,
  buildPlanCardHighlights,
  formatPlanDisplayName,
  formatPlanPrice,
  formatPlanPeriodTotalPrice,
} from '../config/plans-marketing';
import {
  PLAN_BILLING_INTERVALS,
  PLAN_BILLING_INTERVAL_DISCOUNT_PERCENT,
  getPlanBillingDiscountPercent,
  type PlanBillingInterval,
} from '../config/plan-billing';
import { isEligibleForPlatformPlanTrial } from '../config/platform-plan-trial';

export function PlansScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const { modalProps, showConfirm } = useCustomModal();

  const [currentPlan, setCurrentPlan] = useState<string>('FREE');
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<string>('INACTIVE');
  const [gateway, setGateway] = useState<'STRIPE' | 'MERCADOPAGO' | null>(null);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState<'STRIPE' | 'MERCADOPAGO'>('MERCADOPAGO');
  const [billingInterval, setBillingInterval] = useState<PlanBillingInterval>('MONTHLY');
  const [loading, setLoading] = useState(false);
  const [fetchingPlan, setFetchingPlan] = useState(true);
  const [platformTrialEligible, setPlatformTrialEligible] = useState(false);

  const checkoutBillingInterval: PlanBillingInterval =
    selectedPaymentGateway === 'MERCADOPAGO' ? billingInterval : 'MONTHLY';

  const planCards = MARKETING_PLANS.map((meta) => ({
    ...meta,
    name: meta.id,
    displayName: meta.displayName ?? meta.id,
    features: buildPlanCardHighlights(meta.id),
    price: formatPlanPrice(meta.id, checkoutBillingInterval, selectedPaymentGateway),
    periodTotal:
      meta.id !== 'FREE' && checkoutBillingInterval !== 'MONTHLY'
        ? formatPlanPeriodTotalPrice(
            meta.id,
            checkoutBillingInterval,
            selectedPaymentGateway
          )
        : null,
    discountPercent:
      meta.id !== 'FREE' ? getPlanBillingDiscountPercent(checkoutBillingInterval) : 0,
  }));

  useEffect(() => {
    fetchUserPlan();
  }, []);

  useEffect(() => {
    if (selectedPaymentGateway === 'STRIPE') {
      setBillingInterval('MONTHLY');
    }
  }, [selectedPaymentGateway]);

  const fetchUserPlan = async () => {
    try {
      setFetchingPlan(true);
      const userData = await userApi.getMyProfile();
      if (userData.success && userData.data) {
        const mappedPlan = userData.data.plan?.type || 'FREE';
        const status = userData.data.plan?.status || 'INACTIVE';
        setCurrentPlan(mappedPlan);
        setExpirationDate(userData.data.plan?.expirationDate || null);
        setPlanStatus(status);
        setGateway(userData.data.plan?.gateway || null);
        setPendingPlan(userData.data.plan?.pendingPlan || null);
        setPlatformTrialEligible(Boolean(userData.data.plan?.platformTrialEligible));
      }
    } catch (error) {
      console.error('Erro ao buscar plano do usuário:', error);
      showToast.error('Erro ao carregar informações do plano');
    } finally {
      setFetchingPlan(false);
    }
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return date;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return COLORS.states.success;
      case 'CANCELLED':
        return COLORS.states.warning;
      default:
        return COLORS.text.secondary;
    }
  };

  const handleSubscribe = async (
    planName: string,
    options?: { withTrial?: boolean }
  ) => {
    // Se o plano selecionado é o mesmo do atual, não fazer nada
    if (planName === currentPlan) {
      return;
    }

    const withTrial = options?.withTrial === true;

    // Se o plano está cancelado e o usuário quer renovar o mesmo plano, ir direto para checkout
    if (planStatus === 'CANCELLED' && planName === currentPlan) {
      await proceedWithCheckout(planName, withTrial ? { withTrial: true } : undefined);
      return;
    }

    // Se já tem plano ativo (não FREE) e quer trocar
    if (currentPlan !== 'FREE' && planStatus === 'ACTIVE') {
      // Se já tem plano, mostrar diálogo de confirmação
      const isUpgrade = getPlanHierarchy(planName) > getPlanHierarchy(currentPlan);
      
      showConfirm(
        'Trocar de Plano',
        isUpgrade
          ? `Você está subindo de plano. Após confirmar, você será redirecionado para o checkout do novo plano ${formatPlanDisplayName(planName)}.`
          : `Você está descendo de plano. Você continuará com o plano ${formatPlanDisplayName(currentPlan)} até ${expirationDate ? formatDate(expirationDate) : 'o final do período atual'}. Após essa data, seu plano será alterado automaticamente para ${formatPlanDisplayName(planName)}.`,
        async () => {
          if (isUpgrade) {
            await proceedWithCheckout(planName, withTrial ? { withTrial: true } : undefined);
          } else {
            await handleCancelAndProceed(planName);
          }
        },
        {
          confirmText: isUpgrade ? 'Confirmar Upgrade' : 'Agendar Downgrade',
          cancelText: 'Cancelar',
        }
      );
      return;
    }

    // Se não tem plano (FREE) ou está cancelado/inativo e quer um plano diferente, ir direto para checkout
    await proceedWithCheckout(planName, withTrial ? { withTrial: true } : undefined);
  };

  const proceedWithCheckout = async (
    planName: string,
    options?: { withTrial?: boolean }
  ) => {
    try {
      setLoading(true);
      
      const response = await paymentApi.createCheckoutSession(
        planName,
        selectedPaymentGateway,
        checkoutBillingInterval,
        options?.withTrial ? { withTrial: true } : undefined
      );
      
      // Verificar diferentes formatos de resposta
      let checkoutUrl: string | null = null;
      
      // Formato 1: response.success && response.data.url (ApiResponse normalizado)
      if (response.success && response.data?.url) {
        checkoutUrl = response.data.url;
      }
      // Formato 2: response.url (caso a normalização não tenha funcionado)
      else if ((response as any).url) {
        checkoutUrl = (response as any).url;
      }
      // Formato 3: response.data.url (sem success)
      else if (response.data?.url) {
        checkoutUrl = response.data.url;
      }
      // Formato 4: response.data é uma string (URL direta)
      else if (typeof response.data === 'string' && response.data.startsWith('http')) {
        checkoutUrl = response.data;
      }
      
      if (checkoutUrl) {
        const canOpen = await Linking.canOpenURL(checkoutUrl);
        if (canOpen) {
          await Linking.openURL(checkoutUrl);
          showToast.success('Redirecionando para o pagamento...');
        } else {
          showToast.error('Erro', 'Não foi possível abrir o link de pagamento');
        }
      } else {
        showToast.error('Erro', 'URL de checkout não retornada pelo servidor');
      }
    } catch (error: any) {
      console.error('[PlansScreen] Erro ao iniciar checkout:', error);
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Erro ao iniciar checkout';
      showToast.error('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAndProceed = async (newPlan: string) => {
    try {
      setLoading(true);
      const response = await paymentApi.cancelSubscription(newPlan);
      if (response.success) {
        showToast.success('Plano agendado com sucesso');
        await fetchUserPlan();
        if (refreshUser) {
          await refreshUser();
        }
      }
    } catch (error: any) {
      console.error('Erro ao cancelar assinatura:', error);
      showToast.error(error?.response?.data?.error || 'Erro ao cancelar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPlan = async () => {
    showConfirm(
      'Confirmar Cancelamento',
      `Tem certeza que deseja cancelar sua assinatura do plano ${formatPlanDisplayName(currentPlan)}? Você continuará tendo acesso aos recursos do plano até o final do período atual.`,
      async () => {
        try {
          setLoading(true);
          const response = await paymentApi.cancelSubscription();
          if (response.success) {
            showToast.success('Assinatura cancelada com sucesso');
            await fetchUserPlan();
            if (refreshUser) {
              await refreshUser();
            }
          }
        } catch (error: any) {
          console.error('Erro ao cancelar assinatura:', error);
          showToast.error(error?.response?.data?.error || 'Erro ao cancelar assinatura');
        } finally {
          setLoading(false);
        }
      },
      {
        confirmText: 'Confirmar Cancelamento',
        cancelText: 'Voltar',
        destructive: true,
      }
    );
  };

  const getPlanHierarchy = (plan: string): number => {
    const hierarchy: Record<string, number> = {
      'FREE': 0,
      'STARTER': 1,
      'PRO': 2,
      'PRO_PLUS': 3,
    };
    return hierarchy[plan] || 0;
  };

  if (fetchingPlan) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>Planos</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Planos</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Informações do Plano Atual */}
        {currentPlan !== 'FREE' && (
          <View style={styles.currentPlanCard}>
            <Text style={styles.currentPlanTitle}>Seu Plano Atual</Text>
            <View style={styles.currentPlanInfo}>
              <View style={styles.currentPlanHeader}>
                <Text
                  style={[
                    styles.currentPlanName,
                    {
                      color:
                        MARKETING_PLANS.find((p) => p.id === currentPlan)?.color ||
                        COLORS.primary.main,
                    },
                  ]}
                >
                  {formatPlanDisplayName(currentPlan)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(planStatus) }]}>
                  <Text style={styles.statusText}>
                    {planStatus === 'ACTIVE' ? 'Ativo' : planStatus === 'CANCELLED' ? 'Cancelado' : planStatus}
                  </Text>
                </View>
                {gateway && (
                  <View style={styles.gatewayBadge}>
                    <Text style={styles.gatewayText}>
                      {gateway === 'MERCADOPAGO' ? 'Mercado Pago' : 'Stripe'}
                    </Text>
                  </View>
                )}
              </View>
              {expirationDate ? (
                <Text style={styles.expirationText}>
                  Válido até {formatDate(expirationDate)}
                  {planStatus === 'CANCELLED' && (
                    <Text style={styles.cancelledText}> (Cancelado - acesso até a data acima)</Text>
                  )}
                </Text>
              ) : (
                <Text style={styles.lifetimeText}>Vitalício</Text>
              )}
              {(planStatus === 'CANCELLED' || pendingPlan) && (
                <Text style={styles.pendingPlanText}>
                  Após essa data, você desfrutará do plano:{' '}
                  <Text style={styles.pendingPlanName}>
                    {pendingPlan ? formatPlanDisplayName(pendingPlan) : 'Gratuito'}
                  </Text>
                </Text>
              )}
            </View>
            <View style={styles.currentPlanActions}>
              {planStatus === 'ACTIVE' && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelPlan}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancelar Assinatura</Text>
                </TouchableOpacity>
              )}
              {planStatus === 'CANCELLED' && (
                <TouchableOpacity
                  style={styles.renewButton}
                  onPress={() => handleSubscribe(currentPlan)}
                  disabled={loading}
                >
                  <Text style={styles.renewButtonText}>Renovar Assinatura</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Título */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Escolha Seu Plano</Text>
          <Text style={styles.subtitle}>
            Desbloqueie todo o potencial do seu perfil com nossos planos premium
          </Text>
          <Text style={styles.syncNote}>
            Limites e recursos refletem o que está ativo na plataforma (mesmos valores do site).
          </Text>
        </View>

        {/* Seleção de Gateway de Pagamento */}
        <View style={styles.gatewayContainer}>
          <TouchableOpacity
            style={[
              styles.gatewayOption,
              selectedPaymentGateway === 'MERCADOPAGO' && styles.gatewayOptionSelected,
            ]}
            onPress={() => setSelectedPaymentGateway('MERCADOPAGO')}
          >
            <Text style={styles.gatewayOptionTitle}>💳 Mercado Pago</Text>
            <Text style={styles.gatewayOptionDescription}>Pix, Boleto, Cartão</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.gatewayOption,
              selectedPaymentGateway === 'STRIPE' && styles.gatewayOptionSelected,
            ]}
            onPress={() => setSelectedPaymentGateway('STRIPE')}
          >
            <Text style={styles.gatewayOptionTitle}>💳 Stripe</Text>
            <Text style={styles.gatewayOptionDescription}>Cartão internacional</Text>
          </TouchableOpacity>
        </View>

        {selectedPaymentGateway === 'MERCADOPAGO' ? (
          <View style={styles.billingIntervalSection}>
            <Text style={styles.billingIntervalTitle}>Periodicidade</Text>
            <Text style={styles.billingIntervalSubtitle}>
              Preços nos cards são o valor mensal equivalente. Trimestral (−10%) e anual (−30%) sobre
              o total do período.
            </Text>
            <View style={styles.billingIntervalChips}>
              {PLAN_BILLING_INTERVALS.map((interval) => {
                const discount = PLAN_BILLING_INTERVAL_DISCOUNT_PERCENT[interval];
                const label =
                  interval === 'MONTHLY'
                    ? 'Mensal'
                    : interval === 'QUARTERLY'
                      ? `Trimestral (−${discount}%)`
                      : `Anual (−${discount}%)`;
                const selected = billingInterval === interval;
                return (
                  <TouchableOpacity
                    key={interval}
                    style={[styles.billingChip, selected && styles.billingChipSelected]}
                    onPress={() => setBillingInterval(interval)}
                  >
                    <Text
                      style={[styles.billingChipText, selected && styles.billingChipTextSelected]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Cards de Planos */}
        <View style={styles.plansContainer}>
          {planCards.map((plan) => {
            const isCurrentPlan = plan.name === currentPlan;
            const planColor = plan.color;
            const showTrial =
              platformTrialEligible &&
              isEligibleForPlatformPlanTrial({
                planType: plan.name,
                billingInterval: checkoutBillingInterval,
                platformTrialUsedAt: null,
              }) &&
              !isCurrentPlan;

            return (
              <View
                key={plan.name}
                style={[
                  styles.planCard,
                  isCurrentPlan && { borderColor: COLORS.states.success, borderWidth: 2 },
                  plan.recommended && !isCurrentPlan && { borderColor: planColor, borderWidth: 2 },
                ]}
              >
                {plan.recommended && !isCurrentPlan ? (
                  <View style={[styles.recommendedBadge, { backgroundColor: planColor }]}>
                    <Text style={styles.recommendedText}>Mais Popular</Text>
                  </View>
                ) : null}
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: planColor }]}>
                    {plan.displayName}
                  </Text>
                  <View style={styles.planPriceContainer}>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    <Text style={styles.planPriceUnit}>/mês</Text>
                  </View>
                  {showTrial ? (
                    <Text style={styles.periodTotalText}>
                      {`7 dias grátis · depois ${plan.price}/mês`}
                    </Text>
                  ) : plan.periodTotal && plan.discountPercent > 0 ? (
                    <Text style={styles.periodTotalText}>
                      {checkoutBillingInterval === 'QUARTERLY'
                        ? `Plano trimestral — Total: ${plan.periodTotal}`
                        : `Plano anual — Total: ${plan.periodTotal}`}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.planFeatures}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.states.success} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                {!isCurrentPlan && showTrial ? (
                  <TouchableOpacity
                    style={[
                      styles.subscribeButton,
                      styles.trialButton,
                      { borderColor: planColor },
                    ]}
                    onPress={() => handleSubscribe(plan.name, { withTrial: true })}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={planColor} />
                    ) : (
                      <>
                        <Ionicons name="time-outline" size={18} color={planColor} />
                        <Text style={[styles.trialButtonText, { color: planColor }]}>
                          Testar 7 dias grátis
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.subscribeButton,
                    isCurrentPlan && styles.subscribeButtonCurrent,
                    { backgroundColor: isCurrentPlan ? COLORS.states.success : planColor },
                  ]}
                  onPress={() => handleSubscribe(plan.name)}
                  disabled={isCurrentPlan || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.subscribeButtonText}>
                      {isCurrentPlan ? '✓ Plano Atual' : 'Assinar'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <CustomModal {...modalProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background.default,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.medium,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginLeft: 12,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentPlanCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  currentPlanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  currentPlanInfo: {
    marginBottom: 16,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  currentPlanName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  gatewayBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  gatewayText: {
    color: COLORS.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  expirationText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  cancelledText: {
    color: COLORS.states.warning,
    fontWeight: 'bold',
  },
  lifetimeText: {
    fontSize: 14,
    color: COLORS.states.success,
    fontWeight: 'bold',
    marginTop: 4,
  },
  pendingPlanText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 8,
  },
  pendingPlanName: {
    fontWeight: 'bold',
    color: COLORS.primary.main,
  },
  currentPlanActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.states.error,
  },
  cancelButtonText: {
    color: COLORS.states.error,
    fontWeight: '600',
  },
  renewButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary.main,
  },
  renewButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  titleContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  syncNote: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  billingIntervalSection: {
    marginBottom: 20,
  },
  billingIntervalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  billingIntervalSubtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  billingIntervalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  billingChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    backgroundColor: COLORS.background.paper,
  },
  billingChipSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.main + '18',
  },
  billingChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  billingChipTextSelected: {
    color: COLORS.primary.main,
  },
  periodTotalText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  gatewayContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  gatewayOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border.medium,
    backgroundColor: COLORS.background.paper,
  },
  gatewayOptionSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.main + '10',
  },
  gatewayOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  gatewayOptionDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    transform: [{ rotate: '15deg' }],
  },
  recommendedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  planPriceUnit: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  planFeatures: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  subscribeButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialButton: {
    marginBottom: 8,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
  },
  trialButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  subscribeButtonCurrent: {
    opacity: 0.7,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

