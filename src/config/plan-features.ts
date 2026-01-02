export type PlanType = 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS';

export interface PlanLimits {
  // Produtos e Loja
  maxProducts: number;
  canCreateCategories: boolean;
  canUploadProductImages: boolean;
  canEnableShop: boolean;
  maxFileSizePerFile: number; // MB
  maxTotalFileSize: number; // MB por produto
  
  // Perfil - Aparência
  canUploadBackgroundImage: boolean;
  canChangeBackgroundMode: boolean; // full vs top
  canToggleBackgroundOverlay: boolean;
  canCustomizeColors: boolean; // textColor, cardColor, cardTextColor
  canCustomizeLikesColor: boolean;
  canCustomizeButtonColors: boolean; // buttonBackgroundColor, buttonTextColor
  
  // Links
  maxLinks: number;
  
  // Posts e Conteúdo
  canUploadPostImages: boolean;
  maxImagesPerPost: number;
  canPostWithoutLink: boolean; // Permite postar no feed sem compartilhar um link
  
  // Monetização
  canReceiveDonations: boolean;
  
  // Analytics e Recursos
  hasAnalytics: boolean;
  hasShopAnalytics: boolean; // Analytics da loja (vendas, demografia, etc)
  hasPrioritySupport: boolean;
  hasVerifiedBadge: boolean;
  
  // Segurança
  hasTwoFactorAuth: boolean; // Autenticação de dois fatores (2FA) - GRATUITO PARA TODOS (segurança não deve ser cobrada)
  
  // Planos de Assinatura
  maxSubscriptionPlans: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  FREE: {
    // Produtos e Loja
    maxProducts: 1,
    canCreateCategories: false,
    canUploadProductImages: false,
    canEnableShop: false,
    maxFileSizePerFile: 100, // 100MB por arquivo
    maxTotalFileSize: 300, // 300MB total por produto
    
    // Perfil - Aparência
    canUploadBackgroundImage: false,
    canChangeBackgroundMode: false,
    canToggleBackgroundOverlay: false,
    canCustomizeColors: false, // Cores padrão apenas
    canCustomizeLikesColor: false,
    canCustomizeButtonColors: false,
    
    // Links
    maxLinks: 3,
    
    // Posts e Conteúdo
    canUploadPostImages: true, // Todos podem, mas com limite
    maxImagesPerPost: 1,
    canPostWithoutLink: false, // FREE precisa compartilhar um link
    
    // Monetização
    canReceiveDonations: false,
    
    // Recursos
    hasAnalytics: false,
    hasShopAnalytics: false,
    hasPrioritySupport: false,
    hasVerifiedBadge: false,
    
    // Segurança - GRATUITO PARA TODOS
    hasTwoFactorAuth: true, // 2FA é segurança básica, não deve ser cobrado
    
    // Planos de Assinatura
    maxSubscriptionPlans: 1,
  },
  
  STARTER: {
    // Produtos e Loja
    maxProducts: 3,
    canCreateCategories: false,
    canUploadProductImages: true,
    canEnableShop: false,
    maxFileSizePerFile: 500, // 500MB por arquivo
    maxTotalFileSize: 1000, // 1GB total por produto
    
    // Perfil - Aparência
    canUploadBackgroundImage: true,
    canChangeBackgroundMode: false, // Sempre 'full'
    canToggleBackgroundOverlay: false, // Sempre ligado
    canCustomizeColors: true, // Pode personalizar cores
    canCustomizeLikesColor: true,
    canCustomizeButtonColors: true,
    
    // Links
    maxLinks: 10,
    
    // Posts e Conteúdo
    canUploadPostImages: true,
    maxImagesPerPost: 4,
    canPostWithoutLink: true, // STARTER pode postar sem link ✅
    
    // Monetização
    canReceiveDonations: true, // STARTER pode receber doações
    
    // Recursos
    hasAnalytics: true,
    hasShopAnalytics: false, // STARTER não tem analytics da loja
    hasPrioritySupport: true,
    hasVerifiedBadge: false,
    
    // Segurança - GRATUITO PARA TODOS
    hasTwoFactorAuth: true, // 2FA é segurança básica, não deve ser cobrado
    
    // Planos de Assinatura
    maxSubscriptionPlans: 2,
  },
  
  PRO: {
    // Produtos e Loja
    maxProducts: 20,
    canCreateCategories: false, // Feature removida - categorias personalizadas não disponíveis
    canUploadProductImages: true,
    canEnableShop: true, // PRO pode ter loja
    maxFileSizePerFile: 1000, // 1GB por arquivo
    maxTotalFileSize: 5000, // 5GB total por produto
    
    // Perfil - Aparência
    canUploadBackgroundImage: true,
    canChangeBackgroundMode: true, // Pode escolher full ou top
    canToggleBackgroundOverlay: true, // Pode ligar/desligar
    canCustomizeColors: true, // Pode personalizar cores
    canCustomizeLikesColor: true,
    canCustomizeButtonColors: true,
    
    // Links
    maxLinks: 20,
    
    // Posts e Conteúdo
    canUploadPostImages: true,
    maxImagesPerPost: 10,
    canPostWithoutLink: true, // PRO pode postar sem link ✅
    
    // Monetização
    canReceiveDonations: true, // PRO pode receber doações
    
    // Recursos
    hasAnalytics: true,
    hasShopAnalytics: true, // PRO tem analytics completo da loja
    hasPrioritySupport: true,
    hasVerifiedBadge: true,
    
    // Segurança - GRATUITO PARA TODOS
    hasTwoFactorAuth: true, // 2FA é segurança básica, não deve ser cobrado
    
    // Planos de Assinatura
    maxSubscriptionPlans: 3,
  },
  
  PRO_PLUS: {
    // Produtos e Loja
    maxProducts: 50, // 2.5x mais que PRO
    canCreateCategories: true, // PRO_PLUS pode criar categorias personalizadas
    canUploadProductImages: true,
    canEnableShop: true,
    maxFileSizePerFile: 2000, // 2GB por arquivo
    maxTotalFileSize: 10000, // 10GB total por produto
    
    // Perfil - Aparência
    canUploadBackgroundImage: true,
    canChangeBackgroundMode: true,
    canToggleBackgroundOverlay: true,
    canCustomizeColors: true,
    canCustomizeLikesColor: true,
    canCustomizeButtonColors: true,
    
    // Links
    maxLinks: 100, // 2x mais que PRO
    
    // Posts e Conteúdo
    canUploadPostImages: true,
    maxImagesPerPost: 20, // 2x mais que PRO
    canPostWithoutLink: true, // PRO_PLUS pode postar sem link ✅
    
    // Monetização
    canReceiveDonations: true,
    
    // Recursos
    hasAnalytics: true,
    hasShopAnalytics: true,
    hasPrioritySupport: true,
    hasVerifiedBadge: true, // Selo verificado - DIFERENCIAL EXCLUSIVO PRO_PLUS
    
    // Segurança - GRATUITO PARA TODOS
    hasTwoFactorAuth: true, // 2FA é segurança básica, não deve ser cobrado
    
    // Planos de Assinatura
    maxSubscriptionPlans: 10, // 3x mais que PRO
  },
};

/**
 * Helper para verificar se o usuário tem acesso a uma feature
 */
export function hasFeatureAccess(
  userPlan: PlanType,
  feature: keyof PlanLimits
): boolean {
  return PLAN_LIMITS[userPlan][feature] as boolean;
}

/**
 * Helper para obter o limite numérico de uma feature
 */
export function getFeatureLimit(
  userPlan: PlanType,
  feature: 'maxProducts' | 'maxLinks' | 'maxImagesPerPost' | 'maxFileSizePerFile' | 'maxTotalFileSize' | 'maxSubscriptionPlans'
): number {
  return PLAN_LIMITS[userPlan][feature];
}

/**
 * Validar tamanho de arquivo baseado no plano
 */
export function validateFileSize(
  userPlan: PlanType,
  fileSize: number, // em bytes
  currentTotalSize: number = 0 // tamanho total atual do produto em bytes
): { valid: boolean; error?: string } {
  const limits = PLAN_LIMITS[userPlan];
  const maxFileSizeBytes = limits.maxFileSizePerFile * 1024 * 1024; // converter MB para bytes
  const maxTotalSizeBytes = limits.maxTotalFileSize * 1024 * 1024; // converter MB para bytes
  
  // Verificar tamanho do arquivo individual
  if (fileSize > maxFileSizeBytes) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo ${limits.maxFileSizePerFile}MB por arquivo no plano ${userPlan}`,
    };
  }
  
  // Verificar tamanho total do produto
  if (currentTotalSize + fileSize > maxTotalSizeBytes) {
    return {
      valid: false,
      error: `Limite de tamanho total atingido. Máximo ${limits.maxTotalFileSize}MB por produto no plano ${userPlan}`,
    };
  }
  
  return { valid: true };
}

