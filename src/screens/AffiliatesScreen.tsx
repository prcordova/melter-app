import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Pressable,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as ImagePicker from 'expo-image-picker'
import * as Clipboard from 'expo-clipboard'
import { BackButton } from '../components/BackButton'
import { PlanLocker } from '../components/PlanLocker'
import { CustomModal } from '../components/CustomModal'
import { showToast } from '../components/CustomToast'
import { COLORS } from '../theme/colors'
import { useAuth } from '../contexts/AuthContext'
import { affiliatesApi } from '../services/affiliates'
import type {
  AffiliateAnalyticsData,
  AffiliateAnalyticsPeriod,
  AffiliateMeData,
  AffiliatePlatform,
  AffiliatePlatformPayload,
} from '../services/affiliates'
import {
  AFFILIATE_CONTENT_CATEGORY_LABELS,
  AFFILIATE_CONTENT_CATEGORY_VALUES,
  type AffiliateContentCategory,
} from '../constants/affiliate-content-categories'

const PLATFORM_OPTIONS: { value: AffiliatePlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'other', label: 'Outra' },
]

type PlatformForm = AffiliatePlatformPayload & {
  contentCategory: AffiliateContentCategory | ''
  screenshotPreviews: Array<{ key: string; uri: string }>
  uploading?: boolean
}

function emptyPlatform(): PlatformForm {
  return {
    platform: 'instagram',
    handleOrUrl: '',
    contentCategory: '',
    followersOrSubscribers: 0,
    monthlyViews: 0,
    screenshotKeys: [],
    screenshotPreviews: [],
  }
}

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseThousands(raw: string): number {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return 0
  const n = parseInt(digits, 10)
  return Number.isFinite(n) ? n : 0
}

function formatThousands(value: number): string {
  if (!value) return ''
  return Math.floor(value).toLocaleString('pt-BR')
}

function currentMonthKey(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  )
}

function SimpleBars({
  series,
}: {
  series: AffiliateAnalyticsData['monthlySeries']
}) {
  const max = Math.max(1, ...series.map((p) => Math.max(p.uses, p.earned)))
  return (
    <View style={styles.barsWrap}>
      {series.slice(-6).map((p) => {
        const usesH = Math.max(4, (p.uses / max) * 80)
        const earnedH = Math.max(4, (p.earned / max) * 80)
        return (
          <View key={p.month} style={styles.barCol}>
            <View style={styles.barPair}>
              <View style={[styles.barUses, { height: usesH }]} />
              <View style={[styles.barEarned, { height: earnedH }]} />
            </View>
            <Text style={styles.barLabel} numberOfLines={1}>
              {p.label}
            </Text>
          </View>
        )
      })}
      <View style={styles.barLegend}>
        <Text style={styles.barLegendItem}>■ Usos</Text>
        <Text style={[styles.barLegendItem, { color: COLORS.states.success }]}>■ Comissão</Text>
      </View>
    </View>
  )
}

export function AffiliatesScreen() {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [me, setMe] = useState<AffiliateMeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState('')
  const [platforms, setPlatforms] = useState<PlatformForm[]>([emptyPlatform()])
  const [period, setPeriod] = useState<AffiliateAnalyticsPeriod>('all')
  const [month, setMonth] = useState(currentMonthKey())
  const [analytics, setAnalytics] = useState<AffiliateAnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [previewUri, setPreviewUri] = useState<string | null>(null)
  const platformsRef = useRef(platforms)
  const submittedRef = useRef(false)

  useEffect(() => {
    platformsRef.current = platforms
  }, [platforms])

  useEffect(() => {
    return () => {
      if (submittedRef.current) return
      const keys = platformsRef.current.flatMap((p) => p.screenshotKeys)
      keys.forEach((fileKey) => {
        void affiliatesApi.deleteScreenshot(fileKey).catch(() => {})
      })
    }
  }, [])


  const planType = (user?.plan?.type || me?.planType || 'FREE') as
    | 'FREE'
    | 'LITE'
    | 'STARTER'
    | 'PRO'
    | 'PRO_PLUS'

  const canForm =
    Boolean(me?.eligibility?.ok) &&
    (!me?.application || ['rejected', 'cancelled'].includes(me.application.status))

  const loadMe = useCallback(async () => {
    try {
      const res = await affiliatesApi.getMe()
      if (res.success && res.data) setMe(res.data)
      else showToast.error('Erro', res.message || 'Não foi possível carregar afiliados')
    } catch (e) {
      console.error(e)
      showToast.error('Erro', 'Falha ao carregar status de afiliado')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const loadAnalytics = useCallback(async () => {
    if (me?.application?.status !== 'approved') {
      setAnalytics(null)
      return
    }
    try {
      setAnalyticsLoading(true)
      const res = await affiliatesApi.getAnalytics({
        period,
        month: period === 'month' ? month : undefined,
      })
      if (res.success && res.data) setAnalytics(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [me?.application?.status, period, month])

  useEffect(() => {
    void loadMe()
  }, [loadMe])

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  const onRefresh = () => {
    setRefreshing(true)
    void loadMe().then(() => loadAnalytics())
  }

  const updatePlatform = (index: number, patch: Partial<PlatformForm>) => {
    setPlatforms((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  const pickScreenshot = async (index: number) => {
    const current = platforms[index]
    if (current && current.screenshotKeys.length >= 5) {
      showToast.error('Limite', 'Máximo de 5 prints por rede')
      return
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      showToast.error('Permissão', 'Libere acesso à galeria para enviar o print')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    const fileName = asset.fileName || `affiliate-${Date.now()}.jpg`
    const fileType = asset.mimeType || 'image/jpeg'
    const fileSize = asset.fileSize || 500_000

    updatePlatform(index, { uploading: true })
    try {
      const uploadRes = await affiliatesApi.getUploadUrl({ fileName, fileType, fileSize })
      if (!uploadRes.success || !uploadRes.data) {
        throw new Error(uploadRes.message || 'Falha no upload')
      }
      const blobRes = await fetch(asset.uri)
      const blob = await blobRes.blob()
      const put = await fetch(uploadRes.data.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileType },
        body: blob,
      })
      if (!put.ok) throw new Error('Falha ao enviar imagem ao storage')

      const fileKey = uploadRes.data.fileKey
      setPlatforms((prev) =>
        prev.map((p, i) => {
          if (i !== index) return p
          if (p.screenshotKeys.includes(fileKey) || p.screenshotKeys.length >= 5) {
            return { ...p, uploading: false }
          }
          return {
            ...p,
            screenshotKeys: [...p.screenshotKeys, fileKey].slice(0, 5),
            screenshotPreviews: [
              ...p.screenshotPreviews,
              { key: fileKey, uri: asset.uri },
            ].slice(0, 5),
            uploading: false,
          }
        })
      )
      showToast.success('Print enviado', 'Imagem anexada à rede')
    } catch (e) {
      updatePlatform(index, { uploading: false })
      showToast.error('Upload', e instanceof Error ? e.message : 'Erro no upload')
    }
  }

  const removeScreenshot = (platformIndex: number, shotIndex: number) => {
    let removedKey: string | undefined
    setPlatforms((prev) =>
      prev.map((p, i) => {
        if (i !== platformIndex) return p
        removedKey = p.screenshotKeys[shotIndex]
        return {
          ...p,
          screenshotKeys: p.screenshotKeys.filter((_, idx) => idx !== shotIndex),
          screenshotPreviews: p.screenshotPreviews.filter((_, idx) => idx !== shotIndex),
        }
      })
    )
    if (removedKey) {
      void affiliatesApi.deleteScreenshot(removedKey).catch(() => {
        /* best-effort */
      })
    }
  }

  const handleSubmit = async () => {
    if (platforms.length < 1) {
      showToast.error('Validação', 'Informe ao menos uma rede')
      return
    }
    for (const [i, p] of platforms.entries()) {
      if (!p.handleOrUrl.trim()) {
        showToast.error('Validação', `Rede ${i + 1}: informe URL ou @handle`)
        return
      }
      if (!p.contentCategory) {
        showToast.error('Validação', `Rede ${i + 1}: selecione a categoria de conteúdo`)
        return
      }
      if (p.followersOrSubscribers < 1 || p.monthlyViews < 1) {
        showToast.error('Validação', `Rede ${i + 1}: informe seguidores e visualizações`)
        return
      }
      if (p.screenshotKeys.length < 1) {
        showToast.error('Validação', `Rede ${i + 1}: envie ao menos 1 print`)
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await affiliatesApi.apply({
        notes: notes.trim() || null,
        platforms: platforms.map((p) => ({
          platform: p.platform,
          handleOrUrl: p.handleOrUrl.trim(),
          contentCategory: p.contentCategory,
          followersOrSubscribers: p.followersOrSubscribers,
          monthlyViews: p.monthlyViews,
          screenshotKeys: p.screenshotKeys,
        })),
      })
      if (!res.success) throw new Error(res.message || 'Falha ao enviar')
      submittedRef.current = true
      showToast.success('Enviado', 'Solicitação em análise')
      await loadMe()
    } catch (e) {
      showToast.error('Erro', e instanceof Error ? e.message : 'Erro ao enviar')
    } finally {
      setSubmitting(false)
    }
  }

  const copyCoupon = async () => {
    const code = me?.application?.couponCode
    if (!code) return
    await Clipboard.setStringAsync(code)
    showToast.success('Copiado', `Cupom ${code}`)
  }

  const monthOptions = useMemo(() => {
    if (!analytics?.monthlySeries?.length) return [currentMonthKey()]
    return [...analytics.monthlySeries].reverse().map((p) => p.month)
  }, [analytics?.monthlySeries])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton title="Perfil" />
        <Text style={styles.headerTitle}>Afiliados</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          Divulgue a Melter com cupom exclusivo. Comissão na carteira em compras elegíveis (produto,
          plano via carteira e 1ª assinatura). Renovações e recargas não geram comissão.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Requisitos: plano PRO/PRO+ e selo verificado (badge) ativo.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.secondary.main} style={{ marginTop: 24 }} />
        ) : (
          <>
            <View style={styles.chipsRow}>
              <View style={[styles.chip, me?.hasPro ? styles.chipOk : styles.chipWarn]}>
                <Text style={styles.chipText}>{me?.hasPro ? 'PRO ok' : 'Precisa PRO'}</Text>
              </View>
              <View style={[styles.chip, me?.hasBadge ? styles.chipOk : styles.chipWarn]}>
                <Text style={styles.chipText}>{me?.hasBadge ? 'Badge ok' : 'Precisa badge'}</Text>
              </View>
              {me?.application ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Status: {me.application.status}</Text>
                </View>
              ) : null}
            </View>

            {me?.application?.status === 'rejected' && me.application.rejectionReason ? (
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>Rejeitada: {me.application.rejectionReason}</Text>
              </View>
            ) : null}

            {me?.application?.status === 'pending' ? (
              <View style={styles.okBox}>
                <Text style={styles.okText}>Sua solicitação está em análise.</Text>
              </View>
            ) : null}

            {me?.application?.status === 'approved' ? (
              <View style={styles.okBox}>
                <Text style={styles.okText}>Você é afiliado.</Text>
                <TouchableOpacity style={styles.couponBtn} onPress={copyCoupon}>
                  <Text style={styles.couponBtnText}>
                    Cupom {me.application.couponCode} · toque para copiar
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!me?.hasBadge && me?.hasPro ? (
              <TouchableOpacity
                style={styles.warnBox}
                onPress={() => (navigation as any).navigate('AccountVerification')}
              >
                <Text style={styles.warnText}>
                  Ative o selo verificado para solicitar. Toque para ir à verificação.
                </Text>
              </TouchableOpacity>
            ) : null}

            {me?.application?.status === 'approved' ? (
              <View style={styles.analyticsCard}>
                <Text style={styles.sectionTitle}>Painel analítico</Text>
                <View style={styles.periodRow}>
                  <TouchableOpacity
                    style={[styles.periodBtn, period === 'all' && styles.periodBtnActive]}
                    onPress={() => setPeriod('all')}
                  >
                    <Text style={styles.periodBtnText}>Total</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.periodBtn, period === 'month' && styles.periodBtnActive]}
                    onPress={() => setPeriod('month')}
                  >
                    <Text style={styles.periodBtnText}>Mensal</Text>
                  </TouchableOpacity>
                </View>
                {period === 'month' ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {monthOptions.map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.monthChip, month === m && styles.monthChipActive]}
                        onPress={() => setMonth(m)}
                      >
                        <Text style={styles.monthChipText}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}

                {analyticsLoading ? (
                  <ActivityIndicator color={COLORS.secondary.main} />
                ) : analytics ? (
                  <>
                    <View style={styles.metricsGrid}>
                      <Metric label="Usos" value={analytics.summary.totalUses} />
                      <Metric label="Compradores" value={analytics.summary.uniqueBuyers} />
                      <Metric label="Ganho" value={formatMoney(analytics.summary.totalEarned)} />
                      <Metric
                        label="Volume"
                        value={formatMoney(analytics.summary.totalPurchaseVolume)}
                      />
                    </View>
                    <Text style={styles.subSection}>Evolução (últimos meses)</Text>
                    <SimpleBars series={analytics.monthlySeries} />
                    <Text style={styles.subSection}>Últimos usos</Text>
                    {analytics.recentUses.length === 0 ? (
                      <Text style={styles.muted}>Nenhuma comissão neste período.</Text>
                    ) : (
                      analytics.recentUses.slice(0, 8).map((u) => (
                        <View key={u._id} style={styles.useRow}>
                          <Text style={styles.useTitle}>
                            {formatMoney(u.commissionAmount)} · {u.percentApplied}%
                          </Text>
                          <Text style={styles.muted}>
                            Compra {formatMoney(u.purchaseAmount)} ·{' '}
                            {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                          </Text>
                        </View>
                      ))
                    )}
                  </>
                ) : (
                  <Text style={styles.muted}>Sem dados de analytics ainda.</Text>
                )}
              </View>
            ) : null}

            {canForm ? (
              <PlanLocker requiredPlan="PRO" currentPlan={planType}>
                <View style={styles.formCard}>
                  <View style={styles.formHeader}>
                    <Text style={styles.sectionTitle}>Redes de divulgação</Text>
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => setPlatforms((p) => [...p, emptyPlatform()])}
                    >
                      <Text style={styles.addBtnText}>Nova rede</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.muted}>
                    Obrigatório ao menos 1 rede com print comprovando o alcance.
                  </Text>

                  {platforms.map((p, index) => (
                    <View key={index} style={styles.platformCard}>
                      <View style={styles.platformHeader}>
                        <Text style={styles.platformTitle}>Rede {index + 1}</Text>
                        {platforms.length > 1 ? (
                          <TouchableOpacity
                            onPress={() => {
                              setPlatforms((prev) => {
                                const removed = prev[index]
                                if (removed?.screenshotKeys?.length) {
                                  removed.screenshotKeys.forEach((fileKey) => {
                                    void affiliatesApi.deleteScreenshot(fileKey).catch(() => {})
                                  })
                                }
                                return prev.filter((_, i) => i !== index)
                              })
                            }}
                          >
                            <Ionicons name="trash-outline" size={20} color={COLORS.states.error} />
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <Text style={styles.fieldLabel}>Plataforma</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {PLATFORM_OPTIONS.map((o) => (
                          <TouchableOpacity
                            key={o.value}
                            style={[
                              styles.platformChip,
                              p.platform === o.value && styles.platformChipActive,
                            ]}
                            onPress={() => updatePlatform(index, { platform: o.value })}
                          >
                            <Text style={styles.platformChipText}>{o.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <Text style={styles.fieldLabel}>URL ou @handle</Text>
                      <TextInput
                        style={styles.input}
                        value={p.handleOrUrl}
                        onChangeText={(t) => updatePlatform(index, { handleOrUrl: t })}
                        placeholder="@seuuser ou link"
                        placeholderTextColor={COLORS.text.tertiary}
                        autoCapitalize="none"
                      />

                      <Text style={styles.fieldLabel}>Categoria de conteúdo</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {AFFILIATE_CONTENT_CATEGORY_VALUES.map((value) => (
                          <TouchableOpacity
                            key={value}
                            style={[
                              styles.platformChip,
                              p.contentCategory === value && styles.platformChipActive,
                            ]}
                            onPress={() =>
                              updatePlatform(index, {
                                contentCategory: value as AffiliateContentCategory,
                              })
                            }
                          >
                            <Text
                              style={[
                                styles.platformChipText,
                                p.contentCategory === value && { color: '#fff' },
                              ]}
                            >
                              {AFFILIATE_CONTENT_CATEGORY_LABELS[value]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <Text style={styles.fieldLabel}>Seguidores / alcance</Text>
                      <TextInput
                        style={styles.input}
                        value={formatThousands(p.followersOrSubscribers)}
                        onChangeText={(t) =>
                          updatePlatform(index, { followersOrSubscribers: parseThousands(t) })
                        }
                        keyboardType="number-pad"
                        placeholder="15.000"
                        placeholderTextColor={COLORS.text.tertiary}
                      />

                      <Text style={styles.fieldLabel}>Visualizações / mês</Text>
                      <TextInput
                        style={styles.input}
                        value={formatThousands(p.monthlyViews)}
                        onChangeText={(t) =>
                          updatePlatform(index, { monthlyViews: parseThousands(t) })
                        }
                        keyboardType="number-pad"
                        placeholder="120.000"
                        placeholderTextColor={COLORS.text.tertiary}
                      />

                      <TouchableOpacity
                        style={[
                          styles.uploadBtn,
                          p.screenshotKeys.length >= 5 && styles.submitDisabled,
                        ]}
                        onPress={() => void pickScreenshot(index)}
                        disabled={p.uploading || p.screenshotKeys.length >= 5}
                      >
                        {p.uploading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.uploadBtnText}>
                            Enviar print ({p.screenshotKeys.length}/5)
                          </Text>
                        )}
                      </TouchableOpacity>

                      {p.screenshotPreviews.length > 0 ? (
                        <View style={styles.previewStrip}>
                          <Text style={styles.previewHint}>
                            Prints ({p.screenshotPreviews.length}/5) — toque para ampliar
                          </Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.previewRow}
                          >
                            {p.screenshotPreviews.map((shot, shotIndex) => (
                              <View key={`${shot.key}-${shotIndex}`} style={styles.previewThumbWrap}>
                                <TouchableOpacity
                                  activeOpacity={0.85}
                                  onPress={() => setPreviewUri(shot.uri)}
                                >
                                  <Image source={{ uri: shot.uri }} style={styles.previewThumb} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.previewRemove}
                                  onPress={() => removeScreenshot(index, shotIndex)}
                                  hitSlop={8}
                                >
                                  <Ionicons name="trash-outline" size={14} color="#fff" />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </ScrollView>
                        </View>
                      ) : null}
                    </View>
                  ))}

                  <Text style={styles.fieldLabel}>Observações (opcional)</Text>
                  <TextInput
                    style={[styles.input, styles.notes]}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    placeholderTextColor={COLORS.text.tertiary}
                  />

                  <TouchableOpacity
                    style={[styles.submitBtn, (!me?.hasBadge || submitting) && styles.submitDisabled]}
                    disabled={!me?.hasBadge || submitting}
                    onPress={() => void handleSubmit()}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitBtnText}>Enviar solicitação</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </PlanLocker>
            ) : null}
          </>
        )}
      </ScrollView>

      <CustomModal
        visible={Boolean(previewUri)}
        onClose={() => setPreviewUri(null)}
        closeOnBackdropPress
        animationType="fade"
        overlayStyle={styles.fullscreenOverlay}
      >
        <Pressable style={styles.fullscreenContent} onPress={(e) => e.stopPropagation()}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setPreviewUri(null)}
            hitSlop={12}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </CustomModal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.default },
  header: {
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  content: { padding: 16, paddingBottom: 40 },
  lead: { color: COLORS.text.secondary, marginBottom: 12, lineHeight: 20 },
  infoBox: {
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  infoText: { color: COLORS.text.primary, fontSize: 13 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  chipOk: { borderColor: COLORS.states.success },
  chipWarn: { borderColor: COLORS.states.warning },
  chipText: { fontSize: 12, color: COLORS.text.primary, fontWeight: '600' },
  warnBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  warnText: { color: '#92400e', fontSize: 13 },
  okBox: {
    backgroundColor: '#d1fae5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  okText: { color: '#065f46', fontSize: 13, fontWeight: '600' },
  couponBtn: { marginTop: 8 },
  couponBtnText: { color: COLORS.secondary.main, fontWeight: '700' },
  analyticsCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  formCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subSection: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  muted: { color: COLORS.text.secondary, fontSize: 13, marginBottom: 10 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
  },
  periodBtnActive: { backgroundColor: COLORS.secondary.main },
  periodBtnText: { color: COLORS.text.primary, fontWeight: '600', fontSize: 13 },
  monthChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.background.tertiary,
    marginRight: 8,
  },
  monthChipActive: { backgroundColor: COLORS.secondary.light },
  monthChipText: { fontSize: 12, color: COLORS.text.primary },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    width: '48%',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 10,
    padding: 10,
  },
  metricLabel: { fontSize: 11, color: COLORS.text.secondary },
  metricValue: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary, marginTop: 4 },
  barsWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    minHeight: 110,
    paddingTop: 8,
    flexWrap: 'wrap',
  },
  barCol: { alignItems: 'center', width: 44 },
  barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 84 },
  barUses: { width: 12, backgroundColor: COLORS.secondary.main, borderRadius: 3 },
  barEarned: { width: 12, backgroundColor: COLORS.states.success, borderRadius: 3 },
  barLabel: { fontSize: 9, color: COLORS.text.tertiary, marginTop: 4, maxWidth: 44 },
  barLegend: { width: '100%', flexDirection: 'row', gap: 12, marginTop: 8 },
  barLegendItem: { fontSize: 11, color: COLORS.secondary.main },
  useRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  useTitle: { fontWeight: '600', color: COLORS.text.primary },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addBtn: {
    backgroundColor: COLORS.secondary.main,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  platformCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  platformHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  platformTitle: { fontWeight: '700', color: COLORS.text.primary },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.paper,
  },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  platformChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.background.tertiary,
    marginRight: 6,
  },
  platformChipActive: { backgroundColor: COLORS.secondary.main },
  platformChipText: { fontSize: 12, color: COLORS.text.primary, fontWeight: '600' },
  uploadBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary.main,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  uploadBtnText: { color: '#fff', fontWeight: '700' },
  previewStrip: { marginTop: 12 },
  previewHint: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  previewRow: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  previewThumbWrap: {
    width: 88,
    height: 88,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.background.tertiary,
  },
  previewThumb: { width: '100%', height: '100%' },
  previewRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenOverlay: {
    backgroundColor: 'rgba(0,0,0,0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 2,
    padding: 8,
  },
  fullscreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.85,
  },
  submitBtn: {
    marginTop: 16,
    backgroundColor: COLORS.secondary.main,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
