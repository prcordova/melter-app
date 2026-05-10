import { DeviceEventEmitter } from 'react-native'

/** Emitido após seguir/deixar de seguir ou mudar amizade no perfil — listas podem atualizar sem refetch. */
export const SOCIAL_GRAPH_CHANGED = 'melter:socialGraphChanged'

export type SocialGraphPayload = {
  targetUserId?: string
  username?: string
  isFollowing?: boolean
  friendshipStatus?: string
}

export function emitSocialGraphChanged(payload: SocialGraphPayload) {
  DeviceEventEmitter.emit(SOCIAL_GRAPH_CHANGED, payload)
}
