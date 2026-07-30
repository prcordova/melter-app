import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/http-client'
import {
  FEED_PLAN_GATE_DEFAULTS,
  normalizeFeedPlanGates,
  type FeedPlanGateKey,
  type FeedPlanGates,
} from '../config/feed-plan-gates'
import type { PlanType } from '../config/plan-features'

let cachedGates: FeedPlanGates | null = null

async function loadFeedPlanGates(): Promise<FeedPlanGates> {
  if (cachedGates) return cachedGates
  try {
    const response = await api.get<{
      success?: boolean
      data?: { feedPlanGates?: Partial<FeedPlanGates> }
    }>('/api/plans/features')
    const gates = normalizeFeedPlanGates(response.data?.data?.feedPlanGates)
    cachedGates = gates
    return gates
  } catch {
    return FEED_PLAN_GATE_DEFAULTS
  }
}

export function useFeedPlanGates() {
  const [gates, setGates] = useState<FeedPlanGates>(
    cachedGates ?? FEED_PLAN_GATE_DEFAULTS
  )

  useEffect(() => {
    let cancelled = false
    void loadFeedPlanGates().then((next) => {
      if (!cancelled) setGates(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const requiredPlan = useCallback(
    (key: FeedPlanGateKey): PlanType => gates[key],
    [gates]
  )

  return { gates, requiredPlan }
}
