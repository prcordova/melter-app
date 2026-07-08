import type { PlanType } from './plan-features';

/** Preços mensais de tabela (R$) — mesma fonte que o web (`melter/src/models/Plans.ts`). */
export const PLAN_PRICES: Record<PlanType, number> = {
  FREE: 0,
  LITE: 4.99,
  STARTER: 19.9,
  PRO: 49.9,
  PRO_PLUS: 149.9,
};

/** Preços mensais exibidos no checkout Stripe (USD). */
export const PLAN_PRICES_USD: Record<PlanType, number> = {
  FREE: 0,
  LITE: 1.99,
  STARTER: 4.99,
  PRO: 19.99,
  PRO_PLUS: 49.9,
};
