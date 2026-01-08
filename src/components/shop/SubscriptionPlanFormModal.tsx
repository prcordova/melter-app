import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS } from '../../theme/colors';
import { showToast } from '../CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import { subscriptionPlansApi } from '../../services/api';

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

interface SubscriptionPlanFormModalProps {
  visible: boolean;
  plan: SubscriptionPlan | null;
  onClose: () => void;
  onSave: () => void;
  maxSubscriptionPlans: number;
  currentPlansCount: number;
  activePlansCount: number;
}

export function SubscriptionPlanFormModal({
  visible,
  plan,
  onClose,
  onSave,
  maxSubscriptionPlans,
  currentPlansCount,
  activePlansCount,
}: SubscriptionPlanFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [showPromotionalValues, setShowPromotionalValues] = useState(false);
  const [formData, setFormData] = useState<SubscriptionPlan>({
    name: '',
    description: '',
    price: 10,
    intervalDays: 30,
    isActive: true,
    order: 0,
    discounts: {
      oneMonth: undefined,
      twoMonths: undefined,
      threeMonths: undefined,
      sixMonths: undefined,
      oneYear: undefined,
    },
    visibleDurations: {
      oneMonth: true,
      twoMonths: false,
      threeMonths: true,
      sixMonths: true,
      oneYear: false,
    },
  });

  useEffect(() => {
    if (visible) {
      if (plan) {
        setFormData({
          name: plan.name || '',
          description: plan.description || '',
          price: plan.price || 10,
          intervalDays: plan.intervalDays || 30,
          isActive: plan.isActive !== undefined ? plan.isActive : true,
          order: plan.order || 0,
          discounts: plan.discounts || {
            oneMonth: undefined,
            twoMonths: undefined,
            threeMonths: undefined,
            sixMonths: undefined,
            oneYear: undefined,
          },
          visibleDurations: plan.visibleDurations || {
            oneMonth: true,
            twoMonths: false,
            threeMonths: true,
            sixMonths: true,
            oneYear: false,
          },
        });
        // Mostrar seção de descontos se houver descontos configurados
        const hasDiscounts = plan.discounts && (
          (plan.discounts.oneMonth !== undefined && plan.discounts.oneMonth !== null) ||
          (plan.discounts.twoMonths !== undefined && plan.discounts.twoMonths !== null) ||
          (plan.discounts.threeMonths !== undefined && plan.discounts.threeMonths !== null) ||
          (plan.discounts.sixMonths !== undefined && plan.discounts.sixMonths !== null) ||
          (plan.discounts.oneYear !== undefined && plan.discounts.oneYear !== null)
        );
        setShowPromotionalValues(!!hasDiscounts);
      } else {
        setFormData({
          name: '',
          description: '',
          price: 10,
          intervalDays: 30,
          isActive: true,
          order: 0,
          discounts: {
            oneMonth: undefined,
            twoMonths: undefined,
            threeMonths: undefined,
            sixMonths: undefined,
            oneYear: undefined,
          },
          visibleDurations: {
            oneMonth: true,
            twoMonths: false,
            threeMonths: true,
            sixMonths: true,
            oneYear: false,
          },
        });
        setShowPromotionalValues(false);
      }
    }
  }, [visible, plan]);

  const handleSave = async () => {
    // Validações
    if (!formData.name.trim()) {
      showToast.error('Erro', 'Nome do plano é obrigatório');
      return;
    }

    if (formData.price < 10) {
      showToast.error('Erro', 'Preço mínimo é R$ 10,00');
      return;
    }

    if (formData.intervalDays < 1 || formData.intervalDays > 365) {
      showToast.error('Erro', 'Intervalo deve estar entre 1 e 365 dias');
      return;
    }

    // Verificar limite de planos ativos
    if (formData.isActive && !plan?._id) {
      if (activePlansCount >= maxSubscriptionPlans) {
        showToast.error('Limite', `Você pode ter no máximo ${maxSubscriptionPlans} plano(s) ativo(s) por vez`);
        return;
      }
    }

    // Verificar limite total de planos
    if (!plan?._id && currentPlansCount >= maxSubscriptionPlans) {
      showToast.error('Limite', `Você atingiu o limite de ${maxSubscriptionPlans} plano(s) do seu plano atual.`);
      return;
    }

    try {
      setSaving(true);

      // Processar descontos - remover valores undefined
      const processedDiscounts = formData.discounts ? (() => {
        const result: any = {};
        if (formData.discounts.oneMonth !== undefined && formData.discounts.oneMonth !== null) {
          result.oneMonth = formData.discounts.oneMonth;
        }
        if (formData.discounts.twoMonths !== undefined && formData.discounts.twoMonths !== null) {
          result.twoMonths = formData.discounts.twoMonths;
        }
        if (formData.discounts.threeMonths !== undefined && formData.discounts.threeMonths !== null) {
          result.threeMonths = formData.discounts.threeMonths;
        }
        if (formData.discounts.sixMonths !== undefined && formData.discounts.sixMonths !== null) {
          result.sixMonths = formData.discounts.sixMonths;
        }
        if (formData.discounts.oneYear !== undefined && formData.discounts.oneYear !== null) {
          result.oneYear = formData.discounts.oneYear;
        }
        return Object.keys(result).length > 0 ? result : null;
      })() : null;

      if (plan?._id) {
        // Atualizar
        const response = await subscriptionPlansApi.updatePlan(plan._id, {
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          price: formData.price,
          intervalDays: formData.intervalDays,
          isActive: formData.isActive,
          order: formData.order,
          discounts: processedDiscounts,
          visibleDurations: formData.visibleDurations,
        });

        if (response.success) {
          showToast.success('Sucesso', 'Plano atualizado com sucesso!');
          onSave();
        } else {
          showToast.error('Erro', response.message || 'Erro ao atualizar plano');
        }
      } else {
        // Criar
        const response = await subscriptionPlansApi.createPlan({
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          price: formData.price,
          intervalDays: formData.intervalDays,
          isActive: formData.isActive,
          order: formData.order,
          discounts: processedDiscounts,
          visibleDurations: formData.visibleDurations,
        });

        if (response.success) {
          showToast.success('Sucesso', 'Plano criado com sucesso!');
          onSave();
        } else {
          showToast.error('Erro', response.message || 'Erro ao criar plano');
        }
      }
    } catch (error: any) {
      console.error('[SubscriptionPlanFormModal] Erro ao salvar plano:', error);
      showToast.error('Erro', 'Erro ao salvar plano');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 10,
      intervalDays: 30,
      isActive: true,
      order: 0,
      discounts: {
        oneMonth: undefined,
        twoMonths: undefined,
        threeMonths: undefined,
        sixMonths: undefined,
        oneYear: undefined,
      },
      visibleDurations: {
        oneMonth: true,
        twoMonths: false,
        threeMonths: true,
        sixMonths: true,
        oneYear: false,
      },
    });
    setShowPromotionalValues(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {plan ? 'Editar Plano' : 'Criar Novo Plano'}
          </Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome do Plano *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Ex: Plano Básico, Plano Premium"
                placeholderTextColor={COLORS.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descrição (Opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Descreva os benefícios deste plano"
                placeholderTextColor={COLORS.text.tertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Preço (R$) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.price.toString()}
                  onChangeText={(text) => {
                    const value = parseFloat(text) || 0;
                    if (value >= 0) {
                      setFormData({ ...formData, price: value });
                    }
                  }}
                  keyboardType="numeric"
                  placeholder="10.00"
                  placeholderTextColor={COLORS.text.tertiary}
                />
                <Text style={styles.helperText}>Mínimo: R$ 10,00</Text>
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Intervalo (dias) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.intervalDays.toString()}
                  onChangeText={(text) => {
                    const value = Math.max(1, Math.min(365, parseInt(text) || 30));
                    setFormData({ ...formData, intervalDays: value });
                  }}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={COLORS.text.tertiary}
                />
                <Text style={styles.helperText}>Ex: 30 = mensal</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowPromotionalValues(!showPromotionalValues)}
            >
              <Ionicons
                name={showPromotionalValues ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.primary.main}
              />
              <Text style={styles.toggleButtonText}>
                {showPromotionalValues ? 'Ocultar descontos' : 'Descontos por duração de assinaturas'}
              </Text>
            </TouchableOpacity>

            {showPromotionalValues && (
              <View style={styles.discountsSection}>
                <Text style={styles.sectionTitle}>Valores Promocionais por Duração</Text>
                <Text style={styles.sectionDescription}>
                  Configure descontos percentuais para incentivar assinaturas de maior duração.
                </Text>

                {[
                  { key: 'oneMonth', label: '1 mês', months: 1 },
                  { key: 'twoMonths', label: '2 meses', months: 2 },
                  { key: 'threeMonths', label: '3 meses', months: 3 },
                  { key: 'sixMonths', label: '6 meses', months: 6 },
                  { key: 'oneYear', label: '1 ano', months: 12 },
                ].map(({ key, label, months }) => {
                  const basePrice = formData.price * months;
                  const discountPercent = formData.discounts?.[key as keyof typeof formData.discounts] || 0;
                  const discountAmount = (basePrice * discountPercent) / 100;
                  const finalPrice = basePrice - discountAmount;

                  return (
                    <View key={key} style={styles.discountCard}>
                      <View style={styles.discountHeader}>
                        <View>
                          <Text style={styles.discountLabel}>{label}</Text>
                          <Text style={styles.discountSubtext}>{months} {months === 1 ? 'mês' : 'meses'} de assinatura</Text>
                        </View>
                        <Switch
                          value={formData.visibleDurations?.[key as keyof typeof formData.visibleDurations] || false}
                          onValueChange={(value) => {
                            setFormData({
                              ...formData,
                              visibleDurations: {
                                ...formData.visibleDurations,
                                [key]: value,
                              },
                            });
                          }}
                        />
                      </View>

                      <View style={styles.discountContent}>
                        <View style={styles.priceInfo}>
                          <Text style={styles.priceLabel}>Valor base:</Text>
                          <Text style={styles.basePrice}>R$ {basePrice.toFixed(2)}</Text>
                        </View>

                        <View style={styles.discountInput}>
                          <Text style={styles.discountInputLabel}>Desconto (%)</Text>
                          <TextInput
                            style={styles.discountInputField}
                            value={
                              formData.discounts?.[key as keyof typeof formData.discounts]?.toString() || ''
                            }
                            onChangeText={(text) => {
                              const value = text === '' ? undefined : Math.max(0, Math.min(100, parseFloat(text) || 0));
                              setFormData({
                                ...formData,
                                discounts: {
                                  ...formData.discounts,
                                  [key]: value,
                                },
                              });
                            }}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={COLORS.text.tertiary}
                          />
                        </View>

                        {discountPercent > 0 && (
                          <View style={styles.finalPriceInfo}>
                            <Text style={styles.discountAmount}>- R$ {discountAmount.toFixed(2)}</Text>
                            <Text style={styles.finalPrice}>R$ {finalPrice.toFixed(2)}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.switchGroup}>
              <Text style={styles.label}>Plano ativo</Text>
              <Switch
                value={formData.isActive}
                onValueChange={(value) => {
                  if (value && !plan?._id && activePlansCount >= maxSubscriptionPlans) {
                    showToast.error('Limite', `Você pode ter no máximo ${maxSubscriptionPlans} plano(s) ativo(s) por vez`);
                    return;
                  }
                  setFormData({ ...formData, isActive: value });
                }}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={plan ? 'checkmark' : 'add'}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.saveButtonText}>
                  {plan ? 'Atualizar' : 'Criar'} Plano
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background.tertiary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  discountsSection: {
    marginTop: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  discountCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.background.tertiary,
  },
  discountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  discountLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  discountSubtext: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  discountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  priceInfo: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  priceLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  basePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.secondary,
  },
  discountInput: {
    minWidth: 100,
  },
  discountInputLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  discountInputField: {
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  finalPriceInfo: {
    alignItems: 'flex-end',
    minWidth: 120,
  },
  discountAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.states.success,
  },
  finalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary.main,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.background.tertiary,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.background.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.background.tertiary,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.background.tertiary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  saveButton: {
    backgroundColor: COLORS.primary.main,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

