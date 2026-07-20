/**
 * Deep link de assinatura (espelho web: melter/src/config/plans/subscribe-intent.ts).
 * Navigation: ProfileStack → Plans com { subscribe, trial }.
 */

const SUBSCRIBE_PLAN_IDS = ['LITE', 'STARTER', 'PRO', 'PRO_PLUS'] as const

export type PlansSubscribePlanId = (typeof SUBSCRIBE_PLAN_IDS)[number]

export function parsePlansSubscribePlan(
  raw: string | null | undefined
): PlansSubscribePlanId | null {
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase().replace(/-/g, '_');
  const mapped = normalized === 'PROPLUS' ? 'PRO_PLUS' : normalized;
  if ((SUBSCRIBE_PLAN_IDS as readonly string[]).includes(mapped)) {
    return mapped as PlansSubscribePlanId;
  }
  return null;
}

export type PlansSubscribeNavParams = {
  subscribe: PlansSubscribePlanId;
  trial?: boolean;
};

export function buildPlansSubscribeNavParams(params: {
  planType: string | null | undefined;
  withTrial?: boolean;
}): PlansSubscribeNavParams {
  const plan = parsePlansSubscribePlan(params.planType) ?? 'STARTER';
  return {
    subscribe: plan,
    trial: params.withTrial !== false,
  };
}
