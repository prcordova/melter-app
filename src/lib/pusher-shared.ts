import Pusher from 'pusher-js/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_CONFIG } from '../config/api.config'

export type PusherSharedSnapshot = {
  pusher: Pusher | null
  channel: any | null
  isConnected: boolean
  userId: string | null
}

type SharedState = PusherSharedSnapshot & {
  refCount: number
  connectPromise: Promise<void> | null
  connectUserId: string | null
}

const listeners = new Set<() => void>()

const state: SharedState = {
  pusher: null,
  channel: null,
  isConnected: false,
  userId: null,
  refCount: 0,
  connectPromise: null,
  connectUserId: null,
}

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

function setSnapshot(partial: Partial<PusherSharedSnapshot>) {
  Object.assign(state, partial)
  emit()
}

export function getPusherSharedSnapshot(): PusherSharedSnapshot {
  return {
    pusher: state.pusher,
    channel: state.channel,
    isConnected: state.isConnected,
    userId: state.userId,
  }
}

/** Notifica consumidores React quando a conexão/canal muda. */
export function subscribePusherShared(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function teardownInternal() {
  const channel = state.channel
  const pusher = state.pusher

  if (channel) {
    try {
      channel.unbind_all()
      channel.unsubscribe()
    } catch {
      // ignore
    }
  }

  if (pusher) {
    try {
      pusher.connection.unbind('connected')
      pusher.connection.unbind('disconnected')
      pusher.connection.unbind('error')
      pusher.disconnect()
    } catch {
      // ignore
    }
  }

  state.pusher = null
  state.channel = null
  state.isConnected = false
  state.userId = null
  state.connectPromise = null
  state.connectUserId = null
  emit()
}

async function connectForUser(userId: string): Promise<void> {
  const token = await AsyncStorage.getItem('token')
  if (!token) {
    console.warn('[Pusher] Token não encontrado - não será possível autenticar canais privados')
    setSnapshot({ pusher: null, channel: null, isConnected: false, userId: null })
    return
  }

  const pusher = new Pusher(API_CONFIG.PUSHER_KEY, {
    cluster: API_CONFIG.PUSHER_CLUSTER,
    authorizer: (channel: any) => ({
      authorize: (socketId: string, callback: (error: Error | null, data?: any) => void) => {
        const body = new URLSearchParams({
          socket_id: socketId,
          channel_name: channel.name,
        }).toString()

        fetch(`${API_CONFIG.BASE_URL}/api/pusher/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${token}`,
            'X-Auth-Token': token,
          },
          body,
        })
          .then(async (response) => {
            const data = await response.json()
            if (!response.ok) {
              console.error('[Pusher] Falha na autenticação do canal:', response.status, data)
              callback(new Error(data?.error || `Auth ${response.status}`), data)
              return
            }
            callback(null, data)
          })
          .catch((authError: unknown) => {
            console.error('[Pusher] Erro no authorizer customizado:', authError)
            callback(
              authError instanceof Error ? authError : new Error('Falha de autenticação Pusher')
            )
          })
      },
    }),
  })

  pusher.connection.bind('connected', () => {
    if (state.pusher !== pusher) return
    console.log('[Pusher] ✅ Conectado ao Pusher')
    setSnapshot({ isConnected: true })
  })

  pusher.connection.bind('disconnected', () => {
    if (state.pusher !== pusher) return
    console.log('[Pusher] ❌ Desconectado do Pusher')
    setSnapshot({ isConnected: false })
  })

  pusher.connection.bind('error', (err: unknown) => {
    if (state.pusher !== pusher) return
    console.error('[Pusher] Erro de conexão:', err)
    setSnapshot({ isConnected: false })
  })

  const channelName = `private-user-${userId}`
  console.log(`[Pusher] Subscrevendo ao canal: ${channelName}`)
  const channel = pusher.subscribe(channelName)

  channel.bind('pusher:subscription_succeeded', () => {
    if (state.pusher !== pusher) return
    console.log(`[Pusher] ✅ Subscrito com sucesso ao canal ${channelName}`)
    setSnapshot({ channel })
  })

  channel.bind('pusher:subscription_error', (error: unknown) => {
    if (state.pusher !== pusher) return
    console.error('[Pusher] Erro na subscrição:', error)
    setSnapshot({ channel: null })
  })

  state.pusher = pusher
  state.channel = channel
  state.userId = userId
  state.isConnected = pusher.connection.state === 'connected'
  emit()
}

/**
 * Incrementa o ref-count e garante 1 conexão Pusher por device/usuário.
 * Não desconecta ao sair de uma tela — só quando o último consumidor libera.
 */
export async function retainPusher(userId: string): Promise<PusherSharedSnapshot> {
  state.refCount += 1

  if (state.userId === userId && state.pusher && state.channel) {
    return getPusherSharedSnapshot()
  }

  if (state.pusher && state.userId && state.userId !== userId) {
    const keepRefs = state.refCount
    teardownInternal()
    state.refCount = keepRefs
  }

  if (state.connectPromise && state.connectUserId === userId) {
    await state.connectPromise
    return getPusherSharedSnapshot()
  }

  state.connectUserId = userId
  state.connectPromise = connectForUser(userId)
    .catch((error) => {
      console.error('[Pusher] Erro ao inicializar:', error)
      if (state.connectUserId === userId) {
        setSnapshot({
          pusher: null,
          channel: null,
          isConnected: false,
          userId: null,
        })
      }
    })
    .finally(() => {
      if (state.connectUserId === userId) {
        state.connectPromise = null
        state.connectUserId = null
      }
    })

  await state.connectPromise
  return getPusherSharedSnapshot()
}

/**
 * Decrementa o ref-count. Só desconecta / unsubscribe quando chega a 0.
 * Não chama unbind_all enquanto ainda houver consumidores.
 */
export function releasePusher(_userId: string): void {
  state.refCount = Math.max(0, state.refCount - 1)
  if (state.refCount === 0) {
    console.log('[Pusher] Último consumidor liberou — desconectando')
    teardownInternal()
  }
}
