import type { PlanType } from './plan-features';

/** Preços mensais de tabela (R$) — mesma fonte que o web (`melter/src/models/Plans.ts`). */
export const PLAN_PRICES: Record<PlanType, number> = {
  FREE: 0,
  LITE: 4.99,
  STARTER: 19.9,
  PRO: 49.9,
  PRO_PLUS: 149.9,
};
