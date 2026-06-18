import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Ionicons from '@expo/vector-icons/Ionicons'
import { CustomModal } from '../CustomModal'
import { Button } from '../Button'
import { ModalBottom } from '../ModalBottom'
import { showToast } from '../CustomToast'
import { useAuth } from '../../contexts/AuthContext'
import { marketplaceSliderApi } from '../../services/shops/marketplace-slider'
import type {
  MarketplacePromotionConfig,
  MyShopMarketplacePromotion,
} from '../../config/shops/marketplace-slider/types'
import type { ShopPromotionPackageTier } from '../../constants/marketplace-slider'
import { extendPromotionEndDate } from '../../lib/shops/marketplace-slider/dates'
import {
  calculateShopPromotionCost,
  listShopPromotionPackageOffers,
  pricingFromPromotionConfig,
} from '../../lib/shops/marketplace-slider/pricing'
import { ShopPromotionPackagePicker } from './ShopPromotionPackagePicker'
import { COLORS } from '../../theme/colors'

type ShopPromotionsListProps = {
  refreshKey?: number
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programada',
  ACTIVE: 'Ativa',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
}

function statusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return COLORS.states.success
    case 'SCHEDULED':
      return COLORS.states.info
    case 'COMPLETED':
      return COLORS.states.warning
    default:
      return COLORS.text.secondary
  }
}

export function ShopPromotionsList({ refreshKey = 0 }: ShopPromotionsListProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<MyShopMarketplacePromotion[]>([])
  const [promotionConfig, setPromotionConfig] = useState<MarketplacePromotionConfig | null>(null)
  const [extendTarget, setExtendTarget] = useState<MyShopMarketplacePromotion | null>(null)
  const [extendTier, setExtendTier] = useState<ShopPromotionPackageTier>('week')
  const [extendSaving, setExtendSaving] = useState(false)
  const [extendConfigLoading, setExtendConfigLoading] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<MyShopMarketplacePromotion | null>(null)
  const [cancelSaving, setCancelSaving] = useState(false)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const response = await marketplaceSliderApi.listMine()
      if (response.success) {
        setRows(response.data ?? [])
      }
    } catch {
      showToast.error('Erro', 'Não foi possível carregar campanhas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchRows()
  }, [fetchRows, refreshKey])

  useEffect(() => {
    if (!extendTarget) return
    if (promotionConfig) return

    let cancelled = false
    setExtendConfigLoading(true)
    void marketplaceSliderApi
      .getPromotionConfig()
      .then((response) => {
        if (cancelled) return
        if (response.success && response.data) {
          setPromotionConfig(response.data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          showToast.error('Erro', 'Não foi possível carregar preços')
        }
      })
      .finally(() => {
        if (!cancelled) setExtendConfigLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [extendTarget, promotionConfig])

  const extendCost = useMemo(() => {
    if (!extendTarget || !promotionConfig) return 0
    return calculateShopPromotionCost(
      extendTier,
      extendTarget.categoryId,
      pricingFromPromotionConfig(promotionConfig)
    )
  }, [extendTarget, extendTier, promotionConfig])

  const newEndDate = useMemo(() => {
    if (!extendTarget) return null
    return extendPromotionEndDate(new Date(extendTarget.endDate), extendTier)
  }, [extendTarget, extendTier])

  const extendPackageOffers = useMemo(() => {
    if (!extendTarget || !promotionConfig) return []
    const pricing = pricingFromPromotionConfig(promotionConfig)
    return listShopPromotionPackageOffers(extendTarget.categoryId, pricing)
  }, [extendTarget, promotionConfig])

  const handleExtend = async () => {
    if (!extendTarget) return
    try {
      setExtendSaving(true)
      const response = await marketplaceSliderApi.extendPromotion(extendTarget._id, extendTier)
      if (response.success) {
        showToast.success('Sucesso', response.message || 'Campanha estendida!')
        setExtendTarget(null)
        await fetchRows()
      } else {
        showToast.error('Erro', response.message || 'Não foi possível estender')
      }
    } catch (error: any) {
      showToast.error('Erro', error?.response?.data?.message || 'Não foi possível estender')
    } finally {
      setExtendSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    try {
      setCancelSaving(true)
      const response = await marketplaceSliderApi.cancelPromotion(cancelTarget._id)
      if (response.success) {
        showToast.success('Sucesso', response.message || 'Campanha cancelada')
        setCancelTarget(null)
        await fetchRows()
      } else {
        showToast.error('Erro', response.message || 'Não foi possível cancelar')
      }
    } catch (error: any) {
      showToast.error('Erro', error?.response?.data?.message || 'Não foi possível cancelar')
    } finally {
      setCancelSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.secondary.main} />
      </View>
    )
  }

  if (rows.length === 0) {
    return (
      <Text style={styles.empty}>Você ainda não promoveu pacotes no marketplace.</Text>
    )
  }

  return (
    <>
      <View style={styles.list}>
        {rows.map((row) => {
          const canManage = row.status === 'ACTIVE' || row.status === 'SCHEDULED'
          return (
            <View key={row._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.productTitle} numberOfLines={2}>
                  {row.productTitle}
                </Text>
                <View style={[styles.statusBadge, { borderColor: statusColor(row.status) }]}>
                  <Text style={[styles.statusText, { color: statusColor(row.status) }]}>
                    {STATUS_LABELS[row.status] ?? row.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.period}>
                {format(new Date(row.startDate), 'dd/MM/yy HH:mm', { locale: ptBR })} —{' '}
                {format(new Date(row.endDate), 'dd/MM/yy HH:mm', { locale: ptBR })}
              </Text>

              <View style={styles.metrics}>
                <Metric icon="eye-outline" label="Views" value={String(row.viewsCount)} />
                <Metric icon="hand-left-outline" label="Cliques" value={String(row.clicksCount)} />
                <Metric icon="cash-outline" label="Investido" value={`R$ ${row.totalCost.toFixed(2)}`} />
              </View>

              {canManage ? (
                <View style={styles.actions}>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      setExtendTarget(row)
                      setExtendTier('week')
                    }}
                  >
                    Estender
                  </Button>
                  <Button variant="ghost" size="sm" onPress={() => setCancelTarget(row)}>
                    Cancelar
                  </Button>
                </View>
              ) : null}
            </View>
          )
        })}
      </View>

      <ModalBottom visible={!!extendTarget} onClose={() => setExtendTarget(null)}>
        <View style={styles.modalInner}>
          <Text style={styles.modalTitle}>Estender promoção</Text>
          <Text style={styles.modalHint}>
            O tempo será adicionado ao fim da campanha atual.
          </Text>

          {extendTarget ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Pacote</Text>
              <Text style={styles.summaryValue}>{extendTarget.productTitle}</Text>
              <Text style={[styles.summaryLabel, styles.summarySpaced]}>Término atual</Text>
              <Text style={styles.summaryValue}>
                {format(new Date(extendTarget.endDate), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </Text>
              {newEndDate ? (
                <>
                  <Text style={[styles.summaryLabel, styles.summarySpaced]}>Novo término</Text>
                  <Text style={[styles.summaryValue, styles.summaryHighlight]}>
                    {format(newEndDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}

          <ShopPromotionPackagePicker
            label="Pacote de tempo"
            offers={extendPackageOffers}
            value={extendTier}
            onChange={setExtendTier}
          />

          <View style={styles.costBox}>
            {extendConfigLoading ? (
              <ActivityIndicator color={COLORS.secondary.main} />
            ) : (
              <>
                <Text style={styles.costLabel}>Custo estimado</Text>
                <Text style={styles.costValue}>R$ {extendCost.toFixed(2)}</Text>
                <Text style={styles.balance}>
                  Saldo atual: R$ {(user?.wallet?.balance ?? 0).toFixed(2)}
                </Text>
              </>
            )}
          </View>

          <View style={styles.modalActions}>
            <Button variant="ghost" onPress={() => setExtendTarget(null)} disabled={extendSaving}>
              Cancelar
            </Button>
            <Button
              loading={extendSaving}
              disabled={extendConfigLoading}
              onPress={() => void handleExtend()}
            >
              Confirmar e pagar
            </Button>
          </View>
        </View>
      </ModalBottom>

      <CustomModal
        visible={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancelar promoção"
        message="A campanha some do slider na hora, sem reembolso."
        buttons={[
          { text: 'Voltar', style: 'cancel', onPress: () => setCancelTarget(null) },
          {
            text: cancelSaving ? 'Cancelando…' : 'Sim, cancelar',
            style: 'destructive',
            onPress: () => void handleCancel(),
            disabled: cancelSaving,
          },
        ]}
      />
    </>
  )
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  value: string
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={14} color={COLORS.text.secondary} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  empty: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    gap: 8,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  period: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '30%',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  modalInner: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  modalHint: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  summaryBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.background.tertiary,
    gap: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  summarySpaced: {
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  summaryHighlight: {
    color: COLORS.secondary.main,
  },
  costBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.background.tertiary,
    gap: 4,
    minHeight: 72,
    justifyContent: 'center',
  },
  costLabel: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  costValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  balance: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
})
