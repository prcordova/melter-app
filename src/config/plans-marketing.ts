import {
  PLAN_LIMITS,
  formatPlanStorageLimit,
  type PlanLimits,
  type PlanType,
} from './plan-features';
import {
  formatPlatformPlanPriceBrl,
  formatPlatformPlanPriceUsd,
  formatPlanPeriodTotalBrl,
  formatPlanPeriodTotalUsd,
  type PlanBillingInterval,
} from './plan-billing';

export type PlanCheckoutGateway = 'STRIPE' | 'MERCADOPAGO'

export type PlanMarketingId = PlanType;

export const PLAN_ORDER: PlanMarketingId[] = ['FREE', 'LITE', 'STARTER', 'PRO', 'PRO_PLUS'];

export const MARKETING_PLANS: {
  id: PlanMarketingId;
  displayName?: string;
  recommended: boolean;
  color: string;
}[] = [
  { id: 'FREE', recommended: false, color: '#64748b' },
  { id: 'LITE', recommended: false, color: '#22c55e' },
  { id: 'STARTER', recommended: false, color: '#0ea5e9' },
  { id: 'PRO', recommended: false, color: '#eab308' },
  { id: 'PRO_PLUS', displayName: 'PRO+', recommended: true, color: '#9333ea' },
];

function limits(plan: PlanMarketingId): PlanLimits {
  return PLAN_LIMITS[plan];
}

function storageCells(plan: PlanMarketingId): { perFile: string; perProduct: string } {
  const l = limits(plan);
  return {
    perFile: formatPlanStorageLimit(l.maxFileSizePerFile),
    perProduct: formatPlanStorageLimit(l.maxTotalFileSize),
  };
}

export function formatPlanPriceBrl(
  plan: PlanMarketingId,
  interval: PlanBillingInterval = 'MONTHLY'
): string {
  return formatPlatformPlanPriceBrl(plan, interval);
}

export function formatPlanPriceUsd(
  plan: PlanMarketingId,
  interval: PlanBillingInterval = 'MONTHLY'
): string {
  return formatPlatformPlanPriceUsd(plan, interval);
}

export function formatPlanPrice(
  plan: PlanMarketingId,
  interval: PlanBillingInterval,
  gateway: PlanCheckoutGateway
): string {
  return gateway === 'STRIPE'
    ? formatPlanPriceUsd(plan, interval)
    : formatPlanPriceBrl(plan, interval);
}

export function formatPlanPeriodTotalPriceBrl(
  plan: PlanMarketingId,
  interval: PlanBillingInterval
): string {
  return formatPlanPeriodTotalBrl(plan, interval);
}

export function formatPlanPeriodTotalPriceUsd(
  plan: PlanMarketingId,
  interval: PlanBillingInterval
): string {
  return formatPlanPeriodTotalUsd(plan, interval);
}

export function formatPlanPeriodTotalPrice(
  plan: PlanMarketingId,
  interval: PlanBillingInterval,
  gateway: PlanCheckoutGateway
): string {
  return gateway === 'STRIPE'
    ? formatPlanPeriodTotalPriceUsd(plan, interval)
    : formatPlanPeriodTotalPriceBrl(plan, interval);
}

/** Destaques do card — só diferenciais por plano (sem loja, 2FA e suporte básico universais). */
export function buildPlanCardHighlights(plan: PlanMarketingId): string[] {
  const l = limits(plan);
  const store = storageCells(plan);

  switch (plan) {
    case 'FREE':
      return [
        `Até ${l.maxLinks} link no perfil`,
        `${l.maxProducts} produto digital`,
        `${store.perFile} por arquivo · ${store.perProduct} por pacote`,
        'Posts no feed exigem link compartilhado',
      ];
    case 'LITE':
      return [
        `Até ${l.maxLinks} links no perfil`,
        `${l.maxProducts} produto digital (mais espaço no pacote)`,
        `${store.perFile} por arquivo · ${store.perProduct} por pacote`,
        'Posts no feed sem precisar de link',
        'Imagem de fundo personalizada',
        'Cor do texto e da bio',
      ];
    case 'STARTER':
      return [
        `Até ${l.maxLinks} links no perfil`,
        `${l.maxProducts} produtos digitais`,
        `${store.perFile} por arquivo · ${store.perProduct} por pacote`,
        'Imagens nos produtos da loja',
        'Cores do perfil, cards, likes e botões',
        'Receber doações',
        'Analytics avançado do perfil',
        'Lives: 1 por dia (até 30 min)',
      ];
    case 'PRO':
      return [
        `Até ${l.maxLinks} links no perfil`,
        `${l.maxProducts} produtos digitais`,
        '1 imagem por post no feed',
        'Efeito visual no @usuário',
        'Selo verificado (após validação)',
        'Imagem e modo de fundo da vitrine da loja',
        'Suporte VIP',
      ];
    case 'PRO_PLUS':
      return [
        `Até ${l.maxLinks} links no perfil`,
        `${l.maxProducts} produtos digitais`,
        '1 imagem por post no feed',
        'Analytics da loja',
        'Categorias personalizadas na loja',
        'Ocultar @ nas reações (PRO+)',
        'Ocultar visualizações dos stories (PRO+)',
        'Suporte premium',
      ];
    default:
      return [];
  }
}

export function formatPlanDisplayName(plan: string): string {
  if (plan === 'PRO_PLUS') return 'PRO+';
  if (plan === 'FREE') return 'FREE';
  return plan;
}
