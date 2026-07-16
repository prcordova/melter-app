import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getPusherSharedSnapshot,
  releasePusher,
  retainPusher,
  subscribePusherShared,
  type PusherSharedSnapshot,
} from '../lib/pusher-shared'

/**
 * Expõe o canal `private-user-{id}` com **1 conexão Pusher por device**.
 * Vários hooks (chat, messages, wallet) compartilham a mesma conexão via ref-count.
 * Unmount de uma tela só faz `release`; disconnect só no último consumidor / logout.
 */
export function usePusher() {
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState<PusherSharedSnapshot>(() =>
    getPusherSharedSnapshot()
  )

  useEffect(() => {
    return subscribePusherShared(() => {
      setSnapshot(getPusherSharedSnapshot())
    })
  }, [])

  useEffect(() => {
    const userId = user?.id
    if (!userId) {
      setSnapshot(getPusherSharedSnapshot())
      return
    }

    let cancelled = false

    void retainPusher(userId).then((next) => {
      if (!cancelled) setSnapshot(next)
    })

    return () => {
      cancelled = true
      releasePusher(userId)
    }
  }, [user?.id])

  const belongsToUser = Boolean(user?.id) && snapshot.userId === user?.id

  return {
    pusher: belongsToUser ? snapshot.pusher : null,
    channel: belongsToUser ? snapshot.channel : null,
    isConnected: belongsToUser ? snapshot.isConnected : false,
  }
}
