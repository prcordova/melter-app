export type AffiliateAnalyticsPeriod = 'month' | 'all'

export type AffiliatePlatform =
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'whatsapp'
  | 'twitter'
  | 'other'

export type AffiliatePlatformPayload = {
  platform: AffiliatePlatform
  handleOrUrl: string
  contentCategory: string
  followersOrSubscribers: number
  monthlyViews: number
  screenshotKeys: string[]
}

export type AffiliateMeData = {
  eligibility: { ok: boolean; reason?: string }
  planType: string
  hasPro: boolean
  hasBadge: boolean
  sellerDocsApproved: boolean
  application: {
    _id: string
    status: string
    couponCode?: string | null
    rejectionReason?: string | null
    createdAt: string
    reviewedAt?: string | null
  } | null
}

export type AffiliateAnalyticsMonthPoint = {
  month: string
  label: string
  uses: number
  uniqueBuyers: number
  earned: number
  purchaseVolume: number
}

export type AffiliateAnalyticsData = {
  period: AffiliateAnalyticsPeriod
  selectedMonth: string | null
  affiliatedSince: string | null
  couponCode: string | null
  summary: {
    totalUses: number
    uniqueBuyers: number
    totalEarned: number
    totalPurchaseVolume: number
  }
  monthlySeries: AffiliateAnalyticsMonthPoint[]
  recentUses: Array<{
    _id: string
    couponCode: string
    source: string
    purchaseAmount: number
    commissionAmount: number
    percentApplied: number
    createdAt: string
  }>
}

export type AffiliateUploadData = {
  presignedUrl: string
  fileKey: string
}
