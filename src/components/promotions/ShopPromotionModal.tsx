import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { SelectRow } from '../SelectRow'
import { ModalBottom } from '../ModalBottom'
import { Button } from '../Button'
import { Select, SelectItem } from '../ui/Select'
import { useAuth } from '../../contexts/AuthContext'
import { showToast } from '../CustomToast'
import { marketplaceSliderApi } from '../../services/shops/marketplace-slider'
import { productsApi } from '../../services/products'
import type { MarketplacePromotionConfig } from '../../config/shops/marketplace-slider/types'
import type { ShopPromotionPackageTier } from '../../constants/marketplace-slider'
import {
  calculateShopPromotionCost,
  normalizeMarketplaceSliderPricing,
} from '../../lib/shops/marketplace-slider/pricing'
import { COLORS } from '../../theme/colors'

type OwnerProduct = {
  _id: string
  title: string
  categoryId?: string
  status: string
}

type ShopPromotionModalProps = {
  visible: boolean
  onClose: () => void
  onSuccess?: () => void
  initialProductId?: string | null
}

function pricingFromConfig(config: MarketplacePromotionConfig) {
  const byTier = Object.fromEntries(config.packages.map((p) => [p.tier, p.baseCost])) as Record<
    ShopPromotionPackageTier,
    number
  >
  return normalizeMarketplaceSliderPricing({
    costPerDay: byTier.day,
    costPerWeek: byTier.week,
    costPerMonth: byTier.month,
    categoryMultipliers: Object.fromEntries(
      config.categoryMultipliers.map((c) => [c.categoryId, c.multiplier])
    ),
  })
}

export function ShopPromotionModal({
  visible,
  onClose,
  onSuccess,
  initialProductId,
}: ShopPromotionModalProps) {
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<OwnerProduct[]>([])
  const [promotionConfig, setPromotionConfig] = useState<MarketplacePromotionConfig | null>(null)
  const [productId, setProductId] = useState('')
  const [packageTier, setPackageTier] = useState<ShopPromotionPackageTier>('day')
  const [startMode, setStartMode] = useState<'immediate' | 'scheduled'>('immediate')
  const [scheduledStartAt, setScheduledStartAt] = useState('')
  const [promotionCoverUrl, setPromotionCoverUrl] = useState('')

  const canCustomCover = user?.plan?.type && user.plan.type !== 'FREE'

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [configRes, productsRes] = await Promise.all([
        marketplaceSliderApi.getPromotionConfig(),
        productsApi.getProducts({ isActive: true }),
      ])
      if (configRes.success && configRes.data) {
        setPromotionConfig(configRes.data)
      }
      if (productsRes.success && productsRes.data) {
        const approved = (productsRes.data as OwnerProduct[]).filter(
          (p) => p.status === 'APPROVED'
        )
        setProducts(approved)
      }
    } catch {
      showToast.error('Erro', 'Não foi possível carregar dados da promoção')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    void loadData()
    setProductId(initialProductId ?? '')
    setPackageTier('day')
    setStartMode('immediate')
    setScheduledStartAt('')
    setPromotionCoverUrl('')
  }, [visible, initialProductId, loadData])

  const productOptions: SelectItem[] = useMemo(
    () => products.map((p) => ({ label: p.title, value: p._id })),
    [products]
  )

  const selectedProduct = useMemo(
    () => products.find((p) => p._id === productId),
    [products, productId]
  )

  const estimatedCost = useMemo(() => {
    if (!promotionConfig || !selectedProduct) return 0
    const pricing = pricingFromConfig(promotionConfig)
    return calculateShopPromotionCost(packageTier, selectedProduct.categoryId, pricing)
  }, [promotionConfig, selectedProduct, packageTier])

  const handleSubmit = async () => {
    if (!productId) {
      showToast.error('Erro', 'Selecione um pacote')
      return
    }
    if (startMode === 'scheduled' && !scheduledStartAt.trim()) {
      showToast.error('Erro', 'Informe data e hora para início programado')
      return
    }

    try {
      setSaving(true)
      const scheduledIso =
        startMode === 'scheduled' && scheduledStartAt.trim()
          ? new Date(scheduledStartAt.trim()).toISOString()
          : undefined

      const response = await marketplaceSliderApi.createPromotion({
        productId,
        packageTier,
        startMode,
        scheduledStartAt: scheduledIso,
        promotionCoverUrl: promotionCoverUrl.trim() || null,
      })

      if (response.success) {
        showToast.success('Sucesso', response.message || 'Campanha criada!')
        await refreshUser()
        onSuccess?.()
        onClose()
      } else {
        showToast.error('Erro', response.message || 'Não foi possível criar a campanha')
      }
    } catch (error: any) {
      showToast.error('Erro', error?.response?.data?.message || 'Não foi possível criar a campanha')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalBottom visible={visible} onClose={onClose} maxHeight="92%">
      <View style={styles.header}>
        <Text style={styles.title}>Promover no marketplace</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <ActivityIndicator color={COLORS.secondary.main} style={{ marginVertical: 24 }} />
        ) : products.length === 0 ? (
          <Text style={styles.warning}>
            Nenhum pacote aprovado disponível. Publique e aguarde aprovação.
          </Text>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Pacote</Text>
              <Select
                selectedValue={productId}
                onValueChange={(v) => setProductId(String(v))}
                items={productOptions}
              />
            </View>

            <SelectRow
              label="Pacote de tempo"
              value={packageTier}
              onChange={(v) => setPackageTier(v as ShopPromotionPackageTier)}
              options={[
                { value: 'day', label: 'Diária (1 dia)' },
                { value: 'week', label: 'Semanal (7 dias)' },
                { value: 'month', label: 'Mensal (30 dias)' },
              ]}
            />

            <SelectRow
              label="Início"
              value={startMode}
              onChange={(v) => setStartMode(v as 'immediate' | 'scheduled')}
              options={[
                { value: 'immediate', label: 'Imediato' },
                { value: 'scheduled', label: 'Programado' },
              ]}
            />

            {startMode === 'scheduled' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Data e hora (ISO ou local)</Text>
                <TextInput
                  style={styles.input}
                  value={scheduledStartAt}
                  onChangeText={setScheduledStartAt}
                  placeholder="2026-06-18T14:00"
                  placeholderTextColor={COLORS.text.tertiary}
                  autoCapitalize="none"
                />
              </View>
            ) : null}

            {canCustomCover ? (
              <View style={styles.field}>
                <Text style={styles.label}>Capa no slider (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={promotionCoverUrl}
                  onChangeText={setPromotionCoverUrl}
                  placeholder="https://"
                  placeholderTextColor={COLORS.text.tertiary}
                  autoCapitalize="none"
                />
              </View>
            ) : (
              <Text style={styles.hint}>
                Capa personalizada no slider exige plano STARTER ou superior.
              </Text>
            )}

            <View style={styles.costBox}>
              <Text style={styles.costLabel}>Custo estimado</Text>
              <Text style={styles.costValue}>R$ {estimatedCost.toFixed(2)}</Text>
              <Text style={styles.balance}>
                Saldo atual: R$ {(user?.wallet?.balance ?? 0).toFixed(2)}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button variant="ghost" onPress={onClose} disabled={saving} style={styles.footerBtn}>
          Cancelar
        </Button>
        <Button
          onPress={() => void handleSubmit()}
          loading={saving}
          disabled={loading || !productId || products.length === 0}
          style={styles.footerBtn}
        >
          Confirmar e pagar
        </Button>
      </View>
    </ModalBottom>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  scroll: {
    maxHeight: 420,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.paper,
  },
  warning: {
    fontSize: 14,
    color: COLORS.states.warning,
    paddingVertical: 12,
  },
  hint: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  costBox: {
    marginTop: 4,
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.background.tertiary,
    gap: 4,
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
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  footerBtn: {
    flex: 1,
  },
})
