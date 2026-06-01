import {
  PLAN_LIMITS,
  formatPlanStorageLimit,
  type PlanLimits,
  type PlanType,
} from './plan-features';
import {
  formatPlatformPlanPriceBrl,
  formatPlanPeriodTotalBrl,
  type PlanBillingInterval,
} from './plan-billing';

export type PlanMarketingId = PlanType;

export const PLAN_ORDER: PlanMarketingId[] = ['FREE', 'STARTER', 'PRO', 'PRO_PLUS'];

export const MARKETING_PLANS: {
  id: PlanMarketingId;
  displayName?: string;
  recommended: boolean;
  color: string;
}[] = [
  { id: 'FREE', recommended: false, color: '#64748b' },
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

export function formatPlanPeriodTotalPriceBrl(
  plan: PlanMarketingId,
  interval: PlanBillingInterval
): string {
  return formatPlanPeriodTotalBrl(plan, interval);
}

/** Destaques do card — gerados a partir de PLAN_LIMITS (igual ao web). */
export function buildPlanCardHighlights(plan: PlanMarketingId): string[] {
  const l = limits(plan);
  const store = storageCells(plan);
  const items: string[] = [];

  items.push(`Até ${l.maxLinks} links no perfil`);
  items.push(`${l.maxProducts} produtos digitais`);
  items.push(`${l.maxImagesPerPost} imagens por post no feed`);
  items.push(`${l.maxSubscriptionPlans} planos de assinatura para vender`);
  items.push(`${store.perFile} por arquivo · ${store.perProduct} por produto`);

  if (l.canPostWithoutLink) {
    items.push('Posts no feed sem precisar de link');
  }
  if (l.canUploadBackgroundImage) {
    items.push('Imagem de fundo personalizada');
  }
  if (l.canCustomizeColors) {
    items.push('Cores do perfil, cards, likes e botões');
  }
  if (l.canUploadProductImages && plan !== 'FREE') {
    items.push('Imagens nos produtos da loja');
  }
  if (l.canReceiveDonations) {
    items.push('Receber doações');
  }
  if (l.canEnableShop) {
    items.push('Loja completa habilitada');
  }
  if (l.hasShopAnalytics) {
    items.push('Analytics da loja — vendas, demografia e conversão (PRO+)');
  }
  if (l.canCreateCategories) {
    items.push('Categorias personalizadas na loja');
  }
  if (l.canCustomizeUsernameDisplayEffect) {
    items.push('Efeito visual no @usuário (gradiente e brilho)');
  }
  if (l.canControlFollowListsPrivacy) {
    items.push(
      'Oculte listas e números (visitantes veem 0); controle seguidores e seguindo; não apareça nas listas de outros perfis'
    );
  }
  if (l.canHideIdentityInPostReactions) {
    items.push('Ocultar seu @ na lista expandida de reações (PRO+)');
  }
  if (l.canHideStoryViewersList) {
    items.push('Ocultar quem viu seus stories, inclusive para você (PRO+)');
  }
  if (l.hasVerifiedBadge) {
    items.push('Selo verificado (após validação)');
  }
  if (l.hasAnalytics) {
    items.push('Analytics avançado do perfil');
  }
  if (l.hasTwoFactorAuth) {
    items.push('Autenticação em 2 fatores (2FA) incluída');
  }
  if (l.hasPrioritySupport) {
    if (plan === 'PRO_PLUS') {
      items.push('Suporte premium');
    } else if (plan === 'PRO') {
      items.push('Suporte VIP');
    } else {
      items.push('Suporte prioritário');
    }
  } else {
    items.push('Suporte básico');
  }

  return items;
}

export function formatPlanDisplayName(plan: string): string {
  if (plan === 'PRO_PLUS') return 'PRO+';
  if (plan === 'FREE') return 'FREE';
  return plan;
}
