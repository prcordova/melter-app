import type { PlanType } from './plan-features'

export type FeedPlanGateKey =
  | 'minPlanToCreateFeedPosts'
  | 'minPlanToCreateStories'
  | 'minPlanToCommentPosts'
  | 'minPlanToSharePosts'

export type FeedPlanGates = Record<FeedPlanGateKey, PlanType>

export const FEED_PLAN_GATE_DEFAULTS: FeedPlanGates = {
  minPlanToCreateFeedPosts: 'LITE',
  minPlanToCreateStories: 'FREE',
  minPlanToCommentPosts: 'LITE',
  minPlanToSharePosts: 'LITE',
}

const PLAN_SET = new Set(['FREE', 'LITE', 'STARTER', 'PRO', 'PRO_PLUS'])

export function normalizeFeedPlanGates(
  raw: Partial<FeedPlanGates> | null | undefined
): FeedPlanGates {
  const out = { ...FEED_PLAN_GATE_DEFAULTS }
  if (!raw || typeof raw !== 'object') return out
  for (const key of Object.keys(out) as FeedPlanGateKey[]) {
    const value = raw[key]
    if (typeof value === 'string' && PLAN_SET.has(value)) {
      out[key] = value as PlanType
    }
  }
  return out
}
