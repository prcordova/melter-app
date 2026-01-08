import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { COLORS } from '../../theme/colors';
import { showToast } from '../CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import { subscriptionPlansApi } from '../../services/api';
import { SubscriptionPlanFormModal } from './SubscriptionPlanFormModal';
import { getFeatureLimit } from '../../config/plan-features';
import { PlanLocker } from '../PlanLocker';

interface SubscriptionPlan {
  _id?: string;
  name: string;
  description?: string;
  price: number;
  intervalDays: number;
  isActive: boolean;
  order: number;
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
}

interface SubscriptionPlansContentProps {
  userPlan?: 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS';
}

export function SubscriptionPlansContent({ userPlan = 'FREE' }: SubscriptionPlansContentProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<string | null>(null);

  const hasAccess = userPlan === 'PRO' || userPlan === 'PRO_PLUS';
  // Usar getFeatureLimit para obter o limite correto do plan-features
  const maxSubscriptionPlans = hasAccess 
    ? getFeatureLimit(userPlan, 'maxSubscriptionPlans')
    : 0;

  useEffect(() => {
    if (hasAccess) {
      fetchPlans();
    }
  }, [hasAccess]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await subscriptionPlansApi.getPlans();
      if (response.success) {
        setPlans(response.data || []);
      } else {
        showToast.error('Erro', response.message || 'Erro ao carregar planos');
      }
    } catch (error: any) {
      console.error('[SubscriptionPlansContent] Erro ao buscar planos:', error);
      showToast.error('Erro', 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (!canCreatePlan) {
      showToast.error('Limite', `Você atingiu o limite de ${maxSubscriptionPlans} plano(s) do seu plano atual.`);
      return;
    }
    if (!canCreateActivePlan) {
      showToast.error('Limite', `Você pode ter no máximo ${maxSubscriptionPlans} plano(s) ativo(s) por vez.`);
      return;
    }
    setEditingPlan(null);
    setShowForm(true);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleDelete = (planId: string) => {
    setDeleteConfirmPlan(planId);
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => setDeleteConfirmPlan(null) },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await subscriptionPlansApi.deletePlan(planId);
              if (response.success) {
                showToast.success('Sucesso', 'Plano excluído com sucesso');
                await fetchPlans();
              } else {
                showToast.error('Erro', response.message || 'Erro ao excluir plano');
              }
            } catch (error: any) {
              console.error('[SubscriptionPlansContent] Erro ao excluir plano:', error);
              showToast.error('Erro', 'Erro ao excluir plano');
            } finally {
              setDeleteConfirmPlan(null);
            }
          },
        },
      ]
    );
  };

  const handleSaveSuccess = () => {
    setShowForm(false);
    setEditingPlan(null);
    fetchPlans();
  };

  const getIntervalLabel = (days: number): string => {
    if (days === 7) return 'Semana';
    if (days === 15) return 'Quinzena';
    if (days === 30) return 'Mês';
    if (days === 60) return 'Bimestre';
    if (days === 90) return 'Trimestre';
    if (days === 180) return 'Semestre';
    if (days === 365) return 'Ano';
    return `${days} dias`;
  };

  const activePlansCount = plans.filter(p => p.isActive).length;
  const canCreateActivePlan = activePlansCount < maxSubscriptionPlans;
  const currentPlansCount = plans.length;
  const canCreatePlan = currentPlansCount < maxSubscriptionPlans;

  if (!hasAccess) {
    return (
      <View style={styles.noAccessContainer}>
        <Ionicons name="card-outline" size={64} color={COLORS.text.secondary} />
        <Text style={styles.noAccessTitle}>Recurso Disponível no Plano PRO</Text>
        <Text style={styles.noAccessText}>
          Você precisa fazer upgrade para o plano PRO para gerenciar planos de assinatura.
        </Text>
      </View>
    );
  }

  if (showForm) {
    return (
      <SubscriptionPlanFormModal
        visible={showForm}
        plan={editingPlan}
        onClose={() => {
          setShowForm(false);
          setEditingPlan(null);
        }}
        onSave={handleSaveSuccess}
        maxSubscriptionPlans={maxSubscriptionPlans}
        currentPlansCount={currentPlansCount}
        activePlansCount={activePlansCount}
      />
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Planos de Assinatura</Text>
        {!canCreatePlan || !canCreateActivePlan ? (
          <PlanLocker
            requiredPlan={userPlan === 'PRO' ? 'PRO_PLUS' : 'PRO'}
            currentPlan={userPlan}
          >
            <TouchableOpacity
              style={[styles.createButton, styles.createButtonDisabled]}
              disabled={true}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>
                Criar ({currentPlansCount}/{maxSubscriptionPlans})
              </Text>
            </TouchableOpacity>
          </PlanLocker>
        ) : (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>
              Criar ({currentPlansCount}/{maxSubscriptionPlans})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {(!canCreatePlan || !canCreateActivePlan) && (
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={20} color={COLORS.states.warning} />
          <Text style={styles.warningText}>
            Você atingiu o limite de {maxSubscriptionPlans} plano(s) do seu plano atual. Faça upgrade ou remova um plano ativo.
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.secondary.main} />
          <Text style={styles.loadingText}>Carregando planos...</Text>
        </View>
      ) : plans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="card-outline" size={48} color={COLORS.text.secondary} />
          <Text style={styles.emptyText}>Você ainda não criou nenhum plano.</Text>
          <Text style={styles.emptySubtext}>Clique em "Criar" para começar.</Text>
        </View>
      ) : (
        <View style={styles.plansList}>
          {plans.map((plan) => (
            <View key={plan._id} style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={styles.planInfo}>
                  <View style={styles.planTitleRow}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <View style={[styles.statusBadge, plan.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                      <Text style={styles.statusBadgeText}>
                        {plan.isActive ? 'Ativo' : 'Inativo'}
                      </Text>
                    </View>
                  </View>
                  {plan.description && (
                    <Text style={styles.planDescription}>{plan.description}</Text>
                  )}
                  <View style={styles.planPriceRow}>
                    <Text style={styles.planPrice}>R$ {plan.price.toFixed(2)}</Text>
                    <Text style={styles.planInterval}>A cada {getIntervalLabel(plan.intervalDays)}</Text>
                  </View>
                </View>
                <View style={styles.planActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(plan)}
                    disabled={deleteConfirmPlan === plan._id}
                  >
                    <Ionicons name="pencil" size={20} color={COLORS.primary.main} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => plan._id && handleDelete(plan._id)}
                    disabled={deleteConfirmPlan === plan._id}
                  >
                    {deleteConfirmPlan === plan._id ? (
                      <ActivityIndicator size="small" color={COLORS.states.error} />
                    ) : (
                      <Ionicons name="trash-outline" size={20} color={COLORS.states.error} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background.tertiary,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.text.tertiary,
    opacity: 0.5,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    padding: 12,
    backgroundColor: COLORS.states.warning + '20',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.states.warning,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  noAccessContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 16,
  },
  noAccessTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  noAccessText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  plansList: {
    padding: 16,
    gap: 12,
  },
  planCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.background.tertiary,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  planInfo: {
    flex: 1,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: COLORS.states.success + '20',
  },
  statusBadgeInactive: {
    backgroundColor: COLORS.text.tertiary + '20',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  planDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary.main,
  },
  planInterval: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  planActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
});

