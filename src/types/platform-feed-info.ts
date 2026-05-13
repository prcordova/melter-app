/** Tipos do slot «Dica da plataforma» — espelho do web (`melter/src/types/platform-feed-info.types.ts`). */

export type PlatformFeedInfoKind = 'referrer_invite' | 'static_card'

export type PlatformFeedInfoReferrerInvite = {
  kind: 'referrer_invite'
  id: string
  priority: number
  payload: {
    referralId: string
    referrer: {
      _id: string
      username: string
      avatar?: string | null
    }
    isFollowing: boolean
    campaignTitle?: string
    campaignSubtitle?: string
    campaignBody?: string
    visitProfileLabel?: string
    followLabel?: string
    campaignImageUrl?: string | null
    visitProfileHref?: string
  }
}

export type PlatformFeedInfoStaticCard = {
  kind: 'static_card'
  id: string
  priority: number
  title: string
  subtitle?: string
  body?: string
  imageUrl?: string | null
  primaryAction?: {
    label: string
    href: string
    external?: boolean
  }
  secondaryAction?: {
    label: string
    href: string
    external?: boolean
  }
  displayDurationMs?: number
}

export type PlatformFeedInfoItem = PlatformFeedInfoReferrerInvite | PlatformFeedInfoStaticCard
