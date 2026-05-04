import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import { subscriptionPlansApi } from '../../services/api';
import { showToast } from '../CustomToast';
import { useAuth } from '../../contexts/AuthContext';

type DurationMonths = 1 | 2 | 3 | 6 | 12;

interface SubscriptionPlan {
  _id: string;
  name: string;
  description?: string;
  price: number;
  intervalDays: number;
  discounts?: {
    oneMonth?: number;
    twoMonths?: number;
    threeMonths?: number;
    sixMonths?: number;
    oneYear?: number;
  };
  visibleDurations?: {
    oneMonth?: boolean;
    twoMonths?: boolean;
    threeMonths?: boolean;
    sixMonths?: boolean;
    oneYear?: boolean;
  };
  products: Array<{ _id: string; title: string; coverImage?: string; price: number }>;
  totalProducts: number;
}

interface PlanSubscriptionStatus {
  hasActiveSubscription: boolean;
  isCancelled?: boolean;
  daysRemaining?: number;
}

function calculatePrice(plan: SubscriptionPlan, duration: number) {
  let base = plan.price * duration;
  let discount = 0;
  if (plan.discounts) {
    const pct =
      duration === 1
        ? plan.discounts.oneMonth
        : duration === 2
          ? plan.discounts.twoMonths
          : duration === 3
            ? plan.discounts.threeMonths
            : duration === 6
              ? plan.discounts.sixMonths
              : duration === 12
                ? plan.discounts.oneYear
                : 0;
    if (pct && pct > 0) {
      discount = (base * pct) / 100;
    }
  }
  return { original: base, discount, final: base - discount };
}

function getAvailableDurations(plan: SubscriptionPlan): DurationMonths[] {
  const visible = plan.visibleDurations || {
    oneMonth: true,
    twoMonths: false,
    threeMonths: true,
    sixMonths: true,
    oneYear: false,
  };
  const out: DurationMonths[] = [];
  if (visible.oneMonth) out.push(1);
  if (visible.twoMonths) out.push(2);
  if (visible.threeMonths) out.push(3);
  if (visible.sixMonths) out.push(6);
  if (visible.oneYear) out.push(12);
  return out.length ? out : [1];
}

interface ShopSubscriptionPlansSectionProps {
  username: string;
  planIdToOpen?: string | null;
  onPlanOpened?: () => void;
}

export function ShopSubscriptionPlansSection({
  username,
  planIdToOpen,
  onPlanOpened,
}: ShopSubscriptionPlansSectionProps) {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationMonths>(1);
  const [purchasing, setPurchasing] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, PlanSubscriptionStatus>>({});

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await subscriptionPlansApi.getShopPlans(username);
      if (res.success && Array.isArray(res.data)) {
        setPlans(res.data as SubscriptionPlan[]);
      } else {
        setPlans([]);
      }
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const fetchStatuses = useCallback(async () => {
    if (!user || plans.length === 0) return;
    const next: Record<string, PlanSubscriptionStatus> = {};
    await Promise.all(
      plans.map(async (plan) => {
        try {
          const res = await subscriptionPlansApi.getMySubscriptionStatusForPlan(plan._id);
          if (res.success && res.data?.hasActiveSubscription) {
            next[plan._id] = {
              hasActiveSubscription: true,
              isCancelled: res.data.isCancelled,
              daysRemaining: res.data.daysRemaining,
            };
          } else {
            next[plan._id] = { hasActiveSubscription: false };
          }
        } catch {
          next[plan._id] = { hasActiveSubscription: false };
        }
      })
    );
    setStatuses(next);
  }, [user, plans]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  useEffect(() => {
    if (!planIdToOpen || plans.length === 0) return;
    const plan = plans.find((p) => p._id === planIdToOpen);
    if (plan) {
      const durs = getAvailableDurations(plan);
      setSelectedPlan(plan);
      setSelectedDuration(durs[0] || 1);
      setModalOpen(true);
      onPlanOpened?.();
    }
  }, [planIdToOpen, plans, onPlanOpened]);

  const openPurchase = (plan: SubscriptionPlan) => {
    const durs = getAvailableDurations(plan);
    setSelectedPlan(plan);
    setSelectedDuration(durs[0] || 1);
    setModalOpen(true);
  };

  const handlePurchase = async () => {
    if (!selectedPlan) return;
    if (!user) {
      showToast.info('Login', 'Entre na sua conta para assinar um plano.');
      return;
    }
    if (user.username === username) {
      showToast.error('Indisponível', 'Você não pode assinar o próprio plano.');
      return;
    }
    const priceInfo = calculatePrice(selectedPlan, selectedDuration);
    const balance = user.wallet?.balance ?? 0;
    if (balance < priceInfo.final) {
      showToast.error(
        'Saldo insuficiente',
        `Necessário ${priceInfo.final.toFixed(2).replace('.', ',')} na carteira.`
      );
      return;
    }
    try {
      setPurchasing(true);
      const res = await subscriptionPlansApi.purchasePlanWithDuration(
        selectedPlan._id,
        selectedDuration
      );
      if (res.success) {
        showToast.success('Assinatura', res.message || 'Plano adquirido com sucesso!');
        setModalOpen(false);
        setSelectedPlan(null);
        await refreshUser();
        await fetchStatuses();
        await fetchPlans();
      } else {
        showToast.error('Erro', res.message || 'Não foi possível concluir');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erro ao assinar plano';
      showToast.error('Erro', msg);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={COLORS.secondary.main} />
      </View>
    );
  }

  if (plans.length === 0) {
    return null;
  }

  const priceInfoModal = selectedPlan ? calculatePrice(selectedPlan, selectedDuration) : null;
  const walletBalance = user?.wallet?.balance ?? 0;

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Assinaturas</Text>
        <Text style={styles.sectionDesc}>
          Assine um plano e tenha acesso aos produtos vinculados. Novos itens no plano podem ser liberados
          automaticamente para você.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plansRow}>
          {plans.map((plan) => {
            const p1 = calculatePrice(plan, 1);
            const st = statuses[plan._id];
            return (
              <View key={plan._id} style={styles.planCard}>
                <Text style={styles.planName} numberOfLines={2}>
                  {plan.name}
                </Text>
                <Text style={styles.planPrice}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    p1.final
                  )}
                  /mês
                </Text>
                {plan.totalProducts > 0 && (
                  <Text style={styles.planMeta}>{plan.totalProducts} produto(s) no plano</Text>
                )}
                {st?.hasActiveSubscription && (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>
                      Ativo
                      {st.daysRemaining != null ? ` · ${st.daysRemaining}d` : ''}
                    </Text>
                  </View>
                )}
                <TouchableOpacity style={styles.planBtn} onPress={() => openPurchase(plan)}>
                  <Text style={styles.planBtnText}>{st?.hasActiveSubscription ? 'Gerenciar' : 'Assinar'}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.sheetTitle} numberOfLines={2}>
                {selectedPlan?.name}
              </Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            {selectedPlan && (
              <>
                <Text style={styles.label}>Duração</Text>
                <View style={styles.chips}>
                  {getAvailableDurations(selectedPlan).map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.chip, selectedDuration === d && styles.chipOn]}
                      onPress={() => setSelectedDuration(d)}
                    >
                      <Text style={[styles.chipText, selectedDuration === d && styles.chipTextOn]}>
                        {d === 12 ? '1 ano' : `${d} ${d === 1 ? 'mês' : 'meses'}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {priceInfoModal && (
                  <View style={styles.totalBox}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        priceInfoModal.final
                      )}
                    </Text>
                    {priceInfoModal.discount > 0 && (
                      <Text style={styles.discountNote}>
                        Desconto:{' '}
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          priceInfoModal.discount
                        )}
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.row}>
                  <Text style={styles.muted}>Seu saldo</Text>
                  <Text style={styles.muted}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      walletBalance
                    )}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.cta,
                    (!user ||
                      !priceInfoModal ||
                      walletBalance < priceInfoModal.final ||
                      purchasing) &&
                      styles.ctaDisabled,
                  ]}
                  disabled={
                    !user || !priceInfoModal || walletBalance < priceInfoModal.final || purchasing
                  }
                  onPress={handlePurchase}
                >
                  {purchasing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.ctaText}>Confirmar assinatura</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  plansRow: {
    gap: 12,
    paddingRight: 16,
  },
  planCard: {
    width: 220,
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.background.tertiary,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    minHeight: 40,
  },
  planPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.secondary.main,
    marginTop: 4,
  },
  planMeta: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 6,
  },
  activePill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.states.success,
  },
  planBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary.main,
    paddingVertical: 10,
    borderRadius: 10,
  },
  planBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    paddingRight: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background.tertiary,
  },
  chipOn: {
    backgroundColor: COLORS.secondary.main,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  chipTextOn: {
    color: '#fff',
  },
  totalBox: {
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  discountNote: {
    fontSize: 12,
    color: COLORS.states.success,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  muted: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  cta: {
    backgroundColor: COLORS.secondary.main,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
