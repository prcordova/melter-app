import { useState, type ReactNode } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native'
import { Video, ResizeMode } from 'expo-av'
import * as DocumentPicker from 'expo-document-picker'
import Ionicons from '@expo/vector-icons/Ionicons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { PlanLocker } from '../PlanLocker'
import { useAuth } from '../../contexts/AuthContext'
import { COLORS } from '../../theme/colors'
import { PRESENTATION_VIDEO_API } from '../../config/shops/api-paths'
import { API_CONFIG } from '../../config/api.config'
import { showToast } from '../CustomToast'

export type PresentationVideoState = {
  url?: string | null
  pendingUrl?: string | null
  status?: 'none' | 'pending' | 'approved' | 'rejected'
  rejectionReason?: string | null
  fileSize?: number
  durationSeconds?: number | null
}

type Props = {
  productId?: string | null
  value?: PresentationVideoState | null
  onChange: (next: PresentationVideoState | null) => void
  /** Quando true, botões ficam na mesma row da capa (via children). */
  besideCover?: boolean
  children?: (slots: {
    actions: ReactNode
    meta: ReactNode
  }) => ReactNode
}

export function PresentationVideoSellerPanel({
  productId,
  value,
  onChange,
  besideCover = false,
  children,
}: Props) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('Enviando vídeo...')
  const planType = user?.plan?.type

  const preview = value?.pendingUrl || value?.url || null
  const hasPending = value?.status === 'pending' || Boolean(value?.pendingUrl)

  async function upload() {
    if (!productId) {
      showToast.info('Rascunho', 'Salve o rascunho do pacote antes de enviar o vídeo.')
      return
    }
    if (hasPending) {
      showToast.info('Em análise', 'Remova o vídeo pendente para enviar outro.')
      return
    }
    try {
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        showToast.error('Sessão', 'Faça login novamente.')
        return
      }

      const picked = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      })
      if (picked.canceled || !picked.assets?.[0]) return
      const asset = picked.assets[0]
      setBusyLabel('Enviando vídeo de apresentação...')
      setBusy(true)
      const form = new FormData()
      form.append('file', {
        uri: asset.uri,
        name: asset.name || 'video.mp4',
        type: asset.mimeType || 'video/mp4',
      } as unknown as Blob)
      form.append('productId', productId)
      form.append('durationSeconds', String(60))

      const up = await fetch(`${API_CONFIG.BASE_URL}${PRESENTATION_VIDEO_API.upload}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const upJson = await up.json()
      if (!up.ok || !upJson.success) {
        showToast.error('Upload', upJson.message || 'Falha no upload')
        return
      }

      const uploaded = upJson.data || upJson
      const mimeType = asset.mimeType || 'video/mp4'
      setBusyLabel('Enviando para moderação...')
      const sub = await fetch(
        `${API_CONFIG.BASE_URL}${PRESENTATION_VIDEO_API.product(productId)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'submit',
            url: uploaded.url,
            fileSize: uploaded.fileSize,
            durationSeconds: uploaded.durationSeconds ?? 60,
            mimeType,
          }),
        }
      )
      const subJson = await sub.json()
      if (!sub.ok || !subJson.success) {
        showToast.error('Moderação', subJson.message || 'Falha ao enviar para moderação')
        return
      }
      onChange(subJson.data?.presentationVideo ?? subJson.presentationVideo ?? null)
      showToast.success('Sucesso', 'Vídeo enviado para análise')
    } catch (e: any) {
      showToast.error('Erro', e?.message || 'Erro ao enviar vídeo')
    } finally {
      setBusy(false)
    }
  }

  function remove() {
    if (!productId || busy) return
    Alert.alert('Remover vídeo?', 'O arquivo será apagado do armazenamento.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          setBusyLabel('Removendo vídeo de apresentação...')
          setBusy(true)
          try {
            const token = await AsyncStorage.getItem('token')
            if (!token) {
              showToast.error('Sessão', 'Faça login novamente.')
              return
            }
            const res = await fetch(
              `${API_CONFIG.BASE_URL}${PRESENTATION_VIDEO_API.product(productId)}`,
              {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'remove' }),
              }
            )
            const json = await res.json()
            if (!res.ok || !json.success) {
              showToast.error('Erro', json.message || 'Falha ao remover')
              return
            }
            onChange(null)
            showToast.success('Sucesso', 'Vídeo removido')
          } finally {
            setBusy(false)
          }
        },
      },
    ])
  }

  const actions = (
    <View style={styles.actionsRow}>
      <PlanLocker requiredPlan="PRO" currentPlan={planType}>
        <TouchableOpacity
          style={[styles.btn, besideCover && styles.btnBeside]}
          onPress={() => void upload()}
          disabled={busy || !productId || hasPending}
        >
          {busy ? (
            <ActivityIndicator color={besideCover ? COLORS.secondary.main : '#fff'} />
          ) : (
            <>
              <Ionicons
                name="videocam-outline"
                size={16}
                color={besideCover ? COLORS.text.secondary : '#fff'}
              />
              <Text style={[styles.btnText, besideCover && styles.btnTextBeside]}>
                {preview ? 'Trocar vídeo' : 'Adicionar vídeo'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </PlanLocker>
      {preview ? (
        <TouchableOpacity
          style={styles.trashBtn}
          onPress={remove}
          disabled={busy}
          hitSlop={8}
          accessibilityLabel="Remover vídeo"
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.states.error} />
        </TouchableOpacity>
      ) : null}
    </View>
  )

  const meta = (
    <View style={styles.meta}>
      {value?.status === 'rejected' && value.rejectionReason ? (
        <Text style={styles.reject}>Rejeitado: {value.rejectionReason}</Text>
      ) : null}
      {hasPending ? <Text style={styles.pending}>Em análise</Text> : null}
      <Text style={styles.hint}>1 por pacote · máx. 5 min / 100 MB · plano PRO+</Text>
      {preview ? (
        <View style={styles.previewWrap}>
          <Video
            source={{ uri: preview }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
          />
          <TouchableOpacity
            style={styles.trashOnPreview}
            onPress={remove}
            disabled={busy}
            accessibilityLabel="Remover vídeo"
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.states.error} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )

  const busyOverlay = (
    <Modal visible={busy} transparent animationType="fade">
      <View style={styles.busyOverlay}>
        <ActivityIndicator size="large" color={COLORS.secondary.main} />
        <Text style={styles.busyText}>{busyLabel}</Text>
      </View>
    </Modal>
  )

  if (typeof children === 'function') {
    return (
      <>
        {children({ actions, meta })}
        {busyOverlay}
      </>
    )
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Vídeo de apresentação</Text>
      {actions}
      {meta}
      {busyOverlay}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary, marginBottom: 8 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  hint: { fontSize: 12, color: COLORS.text.secondary, marginTop: 6 },
  reject: { color: COLORS.states.error, fontSize: 12, marginBottom: 4 },
  pending: { color: COLORS.states.warning, fontSize: 12, marginBottom: 4 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.secondary.main,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnBeside: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  btnTextBeside: { color: COLORS.text.secondary },
  trashBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  meta: { marginTop: 8 },
  previewWrap: { position: 'relative', marginTop: 10 },
  video: { width: '100%', height: 180, borderRadius: 10, backgroundColor: '#000' },
  trashOnPreview: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  busyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  busyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
})
