import type { ShopPromotionPackageTier } from '../../../constants/marketplace-slider'
import { PACKAGE_TIER_CALENDAR_DAYS } from '../../../constants/marketplace-slider'

export function extendPromotionEndDate(
  currentEndDate: Date,
  tier: ShopPromotionPackageTier
): Date {
  const calendarDays = PACKAGE_TIER_CALENDAR_DAYS[tier]
  const result = new Date(currentEndDate.getTime())
  result.setUTCDate(result.getUTCDate() + calendarDays)
  return result
}
