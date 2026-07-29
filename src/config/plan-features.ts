export type PlanType = 'FREE' | 'LITE' | 'STARTER' | 'PRO' | 'PRO_PLUS';

/**
 * Configuração centralizada de features por plano
 * Facilita manutenção e garante consistência entre frontend e backend
 */

export interface PlanLimits {
  // Produtos e Loja
  maxProducts: number
  canCreateCategories: boolean
  canUploadProductImages: boolean
  canUploadPresentationVideo: boolean
  canEnableShop: boolean
  maxFileSizePerFile: number // MB
  maxTotalFileSize: number // MB por produto
  
  // Perfil - Aparência
  canUploadBackgroundImage: boolean
  canChangeBackgroundMode: boolean  // full vs top
  canToggleBackgroundOverlay: boolean
  canCustomizeColors: boolean  // textColor, cardColor, cardTextColor
  canCustomizeTextColor: boolean
  canCustomizeLikesColor: boolean
  canCustomizeButtonColors: boolean  // buttonBackgroundColor, buttonTextColor
  /** Gradiente / glow no nome (@user) no feed, perfil e explorer — apenas PRO e PRO+ */
  canCustomizeUsernameDisplayEffect: boolean
  /** Ocultar listas de seguidores/seguindo a visitantes — apenas PRO e PRO+ */
  canControlFollowListsPrivacy: boolean
  /** Ocultar identidade na lista expandida de reações em posts de terceiros — apenas PRO+ */
  canHideIdentityInPostReactions: boolean
  /** Ocultar lista de visualizações do story (para todos, inclusive autor) — apenas PRO+ */
  canHideStoryViewersList: boolean

  /** Aparência da vitrine da loja — apenas PRO e PRO+ */
  canUploadShopBackgroundImage: boolean
  canChangeShopBackgroundMode: boolean
  canToggleShopBackgroundOverlay: boolean
  canCustomizeShopTitleColor: boolean
  canCustomizeShopTitleDisplayEffect: boolean
  
  // Links
  maxLinks: number
  
  // Posts e Conteúdo
  /** Criar post no feed — LITE+ (teste; FREE bloqueado) */
  canCreateFeedPosts: boolean
  /** Criar story — LITE+ (teste; FREE bloqueado) */
  canCreateStories: boolean
  canUploadPostImages: boolean
  /** Máx. de imagens por post no feed (carrossel quando > 1). Hoje o post usa 1 imageUrl; limite vale para marketing e futura API. */
  maxImagesPerPost: number
  /**
   * @deprecated Todos podem postar sem link. Preferir `canAttachPostLink`.
   */
  canPostWithoutLink: boolean
  /** Anexar link do perfil ao post — STARTER+ */
  canAttachPostLink: boolean
  /** Negrito, itálico, cores, fundo e bullets no texto do post — LITE+ */
  canCustomizePostRichText: boolean
  
  // Monetização
  canReceiveDonations: boolean
  
  // Analytics e Recursos
  hasAnalytics: boolean
  hasShopAnalytics: boolean  // Analytics da loja (vendas, demografia, etc)
  hasPrioritySupport: boolean
  hasVerifiedBadge: boolean
  
  // Segurança
  hasTwoFactorAuth: boolean  // Autenticação de dois fatores (2FA) - GRATUITO PARA TODOS (segurança não deve ser cobrada)
  
  // Planos de Assinatura
  maxSubscriptionPlans: number
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  FREE: {
    // Produtos e Loja — FREE é perfil/comunidade; venda digital começa no LITE+
    maxProducts: 0,
    canCreateCategories: false,
    canUploadProductImages: false,
    canUploadPresentationVideo: false,
    canEnableShop: true,
    maxFileSizePerFile: 0,
    maxTotalFileSize: 0,
    
    // Perfil - Aparência (identidade básica no FREE; modos avançados de fundo no PRO)
    canUploadBackgroundImage: false,
    canChangeBackgroundMode: false,
    canToggleBackgroundOverlay: false,
    canCustomizeColors: false,
    canCustomizeTextColor: false,
    canCustomizeLikesColor: false,
    canCustomizeButtonColors: false,
    canCustomizeUsernameDisplayEffect: false,
    canControlFollowListsPrivacy: false,
    canHideIdentityInPostReactions: false,
    canHideStoryViewersList: false,
    canUploadShopBackgroundImage: false,
    canChangeShopBackgroundMode: false,
    canToggleShopBackgroundOverlay: false,
    canCustomizeShopTitleColor: false,
    canCustomizeShopTitleDisplayEffect: false,
    
    // Links
    maxLinks: 1,
    
    // Posts e Conteúdo
    canCreateFeedPosts: false,
    canCreateStories: false,
    canUploadPostImages: false,
    maxImagesPerPost: 0,
    canPostWithoutLink: true,
    canAttachPostLink: false,
    canCustomizePostRichText: false,
    
    // Monetização
    canReceiveDonations: false,
    
    // Recursos
    hasAnalytics: false,
    hasShopAnalytics: false,
    hasPrioritySupport: false,
    hasVerifiedBadge: false,
    
    // Segurança - GRATUITO PARA TODOS
    hasTwoFactorAuth: true,  // 2FA é segurança básica, não deve ser cobrado
    
    // Planos de Assinatura
    maxSubscriptionPlans: 1
  },

  LITE: {
    maxProducts: 1,
    canCreateCategories: false,
    canUploadProductImages: false,
    canUploadPresentationVideo: false,
    canEnableShop: true,
    maxFileSizePerFile: 300,
    maxTotalFileSize: 500,
    canUploadBackgroundImage: true,
    canChangeBackgroundMode: false,
    canToggleBackgroundOverlay: false,
    canCustomizeColors: false,
    canCustomizeTextColor: true,
    canCustomizeLikesColor: false,
    canCustomizeButtonColors: false,
    canCustomizeUsernameDisplayEffect: false,
    canControlFollowListsPrivacy: false,
    canHideIdentityInPostReactions: false,
    canHideStoryViewersList: false,
    canUploadShopBackgroundImage: false,
    canChangeShopBackgroundMode: false,
    canToggleShopBackgroundOverlay: false,
    canCustomizeShopTitleColor: false,
    canCustomizeShopTitleDisplayEffect: false,
    maxLinks: 3,
    canCreateFeedPosts: true,
    canCreateStories: true,
    canUploadPostImages: false,
    maxImagesPerPost: 0,
    canPostWithoutLink: true,
    canAttachPostLink: false,
    canCustomizePostRichText: true,
    canReceiveDonations: false,
    hasAnalytics: false,
    hasShopAnalytics: false,
    hasPrioritySupport: false,
    hasVerifiedBadge: false,
    hasTwoFactorAuth: true,
    maxSubscriptionPlans: 1,
  },
  
  STARTER: {
    // Produtos e Loja
    maxProducts: 3,
    canCreateCategories: false,
    canUploadProductImages: true,
    canUploadPresentationVideo: false,
    canEnableShop: true,
    maxFileSizePerFile: 500,
    maxTotalFileSize: 800,
    
    // Perfil - Aparência
    canUploadBackgroundImage: true,
    canChangeBackgroundMode: false,  // Sempre 'full'
    canToggleBackgroundOverlay: false, // Overlay de cor só a partir do PRO; FREE/STARTER ficam com opacidade 0
    canCustomizeColors: true,  // Pode personalizar cores
    canCustomizeTextColor: true,
    canCustomizeLikesColor: true,
    canCustomizeButtonColors: true,
    canCustomizeUsernameDisplayEffect: false,
    canControlFollowListsPrivacy: false,
    canHideIdentityInPostReactions: false,
    canHideStoryViewersList: false,
    canUploadShopBackgroundImage: false,
    canChangeShopBackgroundMode: false,
    canToggleShopBackgroundOverlay: false,
    canCustomizeShopTitleColor: true,
    canCustomizeShopTitleDisplayEffect: false,
    
    // Links
    maxLinks: 5,
    
    // Posts e Conteúdo
    canCreateFeedPosts: true,
    canCreateStories: true,
    canUploadPostImages: false,
    maxImagesPerPost: 0,
    canPostWithoutLink: true,
    canAttachPostLink: true,
    canCustomizePostRichText: true,
    
    // Monetização
    canReceiveDonations: true,  // STARTER pode receber doações
    
    // Recursos
    hasAnalytics: true,
    hasShopAnalytics: false,  // STARTER não tem analytics da loja
    hasPrioritySupport: true,
    hasVerifiedBadge: false,
    
    // Segurança - GRATUITO PARA TODOS
    hasTwoFactorAuth: true,  // 2FA é segurança básica, não deve ser cobrado
    
    // Planos de Assinatura
    maxSubscriptionPlans: 2
  },
  
  PRO: {
    // Produtos e Loja
    maxProducts: 10,
    canCreateCategories: false,  // Feature removida - categorias personalizadas não disponíveis
    canUploadProductImages: true,
    canUploadPresentationVideo: false,
    canEnableShop: true,
    maxFileSizePerFile: 1000, // 1 GB por arquivo
    maxTotalFileSize: 3000, // 3 GB total por produto
    
    // Perfil - Aparência
    canUploadBackgroundImage: true,
    canChangeBackgroundMode: true,  // Pode escolher full ou top
    canToggleBackgroundOverlay: true,  // Pode ligar/desligar
    canCustomizeColors: true,  // Pode personalizar cores
    canCustomizeTextColor: true,
    canCustomizeLikesColor: true,
    canCustomizeButtonColors: true,
    canCustomizeUsernameDisplayEffect: true,
    canControlFollowListsPrivacy: true,
    canHideIdentityInPostReactions: false,
    canHideStoryViewersList: false,
    canUploadShopBackgroundImage: true,
    canChangeShopBackgroundMode: true,
    canToggleShopBackgroundOverlay: true,
    canCustomizeShopTitleColor: true,
    canCustomizeShopTitleDisplayEffect: true,
    
    // Links
    maxLinks: 10,
    
    // Posts e Conteúdo
    canCreateFeedPosts: true,
    canCreateStories: true,
    canUploadPostImages: true,
    maxImagesPerPost: 1,
    canPostWithoutLink: true,
    canAttachPostLink: true,
    canCustomizePostRichText: true,
    
    // Monetização
    canReceiveDonations: true,  // PRO pode receber doações
    
    // Recursos
    hasAnalytics: true,
    hasShopAnalytics: false,  // Analytics da loja apenas no PRO+
    hasPrioritySupport: true,
    hasVerifiedBadge: true,
    
    // Segurança - GRATUITO PARA TODOS
    hasTwoFactorAuth: true,  // 2FA é segurança básica, não deve ser cobrado
    
    // Planos de Assinatura
    maxSubscriptionPlans: 3
  },
  
  PRO_PLUS: {
    // Produtos e Loja (20 × 5 GB máx. teórico ≈ 100 GB — limite é por produto, não global na loja)
    maxProducts: 20,
    canCreateCategories: true,  // PRO_PLUS pode criar categorias personalizadas
    canUploadProductImages: true,
    canUploadPresentationVideo: true,
    canEnableShop: true,
    maxFileSizePerFile: 2000, // 2 GB por arquivo
    maxTotalFileSize: 5000, // 5 GB total por produto
    
    // Perfil - Aparência
    canUploadBackgroundImage: true,
    canChangeBackgroundMode: true,
    canToggleBackgroundOverlay: true,
    canCustomizeColors: true,
    canCustomizeTextColor: true,
    canCustomizeLikesColor: true,
    canCustomizeButtonColors: true,
    canCustomizeUsernameDisplayEffect: true,
    canControlFollowListsPrivacy: true,
    canHideIdentityInPostReactions: true,
    canHideStoryViewersList: true,
    canUploadShopBackgroundImage: true,
    canChangeShopBackgroundMode: true,
    canToggleShopBackgroundOverlay: true,
    canCustomizeShopTitleColor: true,
    canCustomizeShopTitleDisplayEffect: true,
    
    // Links
    maxLinks: 50,
    
    // Posts e Conteúdo
    canCreateFeedPosts: true,
    canCreateStories: true,
    canUploadPostImages: true,
    maxImagesPerPost: 1,
    canPostWithoutLink: true,
    canAttachPostLink: true,
    canCustomizePostRichText: true,
    
    // Monetização
    canReceiveDonations: true,
    
    // Recursos
    hasAnalytics: true,
    hasShopAnalytics: true,
    hasPrioritySupport: true,
    hasVerifiedBadge: true,  // Selo verificado (fluxo com documentos) — também em PRO
    
    // Segurança - GRATUITO PARA TODOS
    hasTwoFactorAuth: true,  // 2FA é segurança básica, não deve ser cobrado
    
    // Planos de Assinatura
    maxSubscriptionPlans: 10  // 3x mais que PRO
  }
}

/**
 * Helper para verificar se o usuário tem acesso a uma feature
 */
export function hasFeatureAccess(
  userPlan: PlanType,
  feature: keyof PlanLimits
): boolean {
  return PLAN_LIMITS[userPlan][feature] as boolean
}

/**
 * Helper para obter o limite numérico de uma feature
 */
export function getFeatureLimit(
  userPlan: PlanType,
  feature: 'maxProducts' | 'maxLinks' | 'maxImagesPerPost' | 'maxFileSizePerFile' | 'maxTotalFileSize' | 'maxSubscriptionPlans'
): number {
  return PLAN_LIMITS[userPlan][feature]
}

export function resolveUserPlanType(planType?: string | null): PlanType {
  if (planType && planType in PLAN_LIMITS) {
    return planType as PlanType
  }

  return 'FREE'
}

/** Rótulo curto para UI (chips, header, preview). Mantém o enum da API (`PRO_PLUS`) → "PRO+". */
export function formatPlanTypeForDisplay(planType?: string | null): string {
  if (!planType) return 'FREE'
  if (planType === 'PRO_PLUS') return 'PRO+'
  return planType
}

export function getProductStorageLimits(userPlan: PlanType) {
  const limits = PLAN_LIMITS[userPlan]

  return {
    maxFileSizePerFileMb: limits.maxFileSizePerFile,
    maxTotalFileSizeMb: limits.maxTotalFileSize,
    maxFileSizePerFileBytes: limits.maxFileSizePerFile * 1024 * 1024,
    maxTotalFileSizeBytes: limits.maxTotalFileSize * 1024 * 1024,
  }
}

export function formatPlanStorageLimit(megabytes: number): string {
  if (megabytes >= 1024) {
    const gigabytes = megabytes / 1024
    return Number.isInteger(gigabytes) ? `${gigabytes} GB` : `${gigabytes.toFixed(1)} GB`
  }

  return `${megabytes} MB`
}

/**
 * Validar tamanho de arquivo baseado no plano
 */
export function validateFileSize(
  userPlan: PlanType,
  fileSize: number, // em bytes
  currentTotalSize: number = 0 // tamanho total atual do produto em bytes
): { valid: boolean; error?: string } {
  const limits = PLAN_LIMITS[userPlan]
  const maxFileSizeBytes = limits.maxFileSizePerFile * 1024 * 1024 // converter MB para bytes
  const maxTotalSizeBytes = limits.maxTotalFileSize * 1024 * 1024 // converter MB para bytes
  
  // Verificar tamanho do arquivo individual
  if (fileSize > maxFileSizeBytes) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo ${limits.maxFileSizePerFile}MB por arquivo no plano ${userPlan}`
    }
  }
  
  // Verificar tamanho total do produto
  if (currentTotalSize + fileSize > maxTotalSizeBytes) {
    return {
      valid: false,
      error: `Limite de tamanho total atingido. Máximo ${limits.maxTotalFileSize}MB por produto no plano ${userPlan}`
    }
  }
  
  return { valid: true }
}

/**
 * Validar se o plano do usuário permite as configurações enviadas
 * Retorna erro se algo não for permitido
 */
export function validateProfileSettings(
  userPlan: PlanType,
  settings: {
    backgroundImage?: string | null
    backgroundMode?: 'full' | 'top'
    backgroundOverlay?: boolean
    backgroundOverlayOpacity?: number
    usernameDisplayEffect?: unknown
    statusMessageDisplayEffect?: unknown
    showFollowersFollowing?: boolean
    showFollowersCount?: boolean
    showFollowingCount?: boolean
    hideFromOthersFollowLists?: boolean
    hideIdentityInPostReactions?: boolean
    hideStoryViewersList?: boolean
  }
): { valid: boolean; error?: string } {
  const limits = PLAN_LIMITS[userPlan]

  if (
    settings.showFollowersFollowing === false &&
    !limits.canControlFollowListsPrivacy
  ) {
    return {
      valid: false,
      error: 'Ocultar listas de seguidores e seguindo está disponível apenas nos planos PRO e PRO+',
    }
  }

  if (
    (settings.showFollowersCount === false || settings.showFollowingCount === false) &&
    !limits.canControlFollowListsPrivacy
  ) {
    return {
      valid: false,
      error: 'Ocultar contagens de seguidores ou seguindo está disponível apenas nos planos PRO e PRO+',
    }
  }

  if (
    settings.hideFromOthersFollowLists === true &&
    !limits.canControlFollowListsPrivacy
  ) {
    return {
      valid: false,
      error: 'Ocultar-se das listas de seguidores de outros perfis está disponível apenas nos planos PRO e PRO+',
    }
  }

  if (
    settings.hideIdentityInPostReactions === true &&
    !limits.canHideIdentityInPostReactions
  ) {
    return {
      valid: false,
      error: 'Ocultar identidade nas reações de posts está disponível apenas no plano PRO+',
    }
  }

  if (
    settings.hideStoryViewersList === true &&
    !limits.canHideStoryViewersList
  ) {
    return {
      valid: false,
      error: 'Ocultar lista de visualizações de stories está disponível apenas no plano PRO+',
    }
  }

  if (settings.usernameDisplayEffect !== undefined && !limits.canCustomizeUsernameDisplayEffect) {
    return {
      valid: false,
      error: 'Efeito no nome de usuário disponível apenas nos planos PRO e PRO+',
    }
  }

  if (settings.statusMessageDisplayEffect !== undefined && !limits.canCustomizeUsernameDisplayEffect) {
    return {
      valid: false,
      error: 'Efeito na mensagem de status disponível apenas nos planos PRO e PRO+',
    }
  }

  // Validar background image
  if (settings.backgroundImage && !limits.canUploadBackgroundImage) {
    return {
      valid: false,
      error: 'Imagem de fundo não disponível no seu plano atual'
    }
  }

  // Validar background mode
  if (settings.backgroundMode && settings.backgroundMode !== 'full' && !limits.canChangeBackgroundMode) {
    return {
      valid: false,
      error: 'Modo de exibição do background disponível apenas para plano PRO'
    }
  }

  // Overlay de cor: apenas PRO+ pode ativar (opacidade > 0 ou overlay ligado)
  if (!limits.canToggleBackgroundOverlay) {
    if (settings.backgroundOverlay === true) {
      return {
        valid: false,
        error: 'Controle de overlay do fundo disponível apenas para plano PRO',
      }
    }
    if (
      typeof settings.backgroundOverlayOpacity === 'number' &&
      settings.backgroundOverlayOpacity > 0
    ) {
      return {
        valid: false,
        error: 'Opacidade do overlay disponível apenas para plano PRO',
      }
    }
  }

  return { valid: true }
}

/**
 * Sanitizar configurações de perfil baseado no plano
 * Remove/ajusta configurações que o usuário não tem acesso
 * 
 * @param userPlan - Plano do usuário
 * @param settings - Configurações do perfil
 * @param forceRemove - Se true, remove campos não permitidos mesmo se não foram enviados (útil para cron jobs)
 */
export function sanitizeProfileSettings(
  userPlan: PlanType,
  settings: any,
  forceRemove: boolean = false
): any {
  const limits = PLAN_LIMITS[userPlan]
  const sanitized = { ...settings }

  // Remover background se não tiver acesso
  // Se forceRemove=true (cron job), sempre remove. Caso contrário, só remove se foi explicitamente enviado
  if (!limits.canUploadBackgroundImage) {
    if (forceRemove || settings.backgroundImage !== undefined) {
      sanitized.backgroundImage = null
    }
  }

  // Remover cores personalizadas se não tiver acesso
  // Se forceRemove=true (cron job), sempre remove. Caso contrário, só remove se foram explicitamente enviadas
  if (!limits.canCustomizeColors) {
    if (forceRemove || settings.textColor !== undefined) {
      sanitized.textColor = null
    }
    if (forceRemove || settings.cardColor !== undefined) {
      sanitized.cardColor = null
    }
    if (forceRemove || settings.cardTextColor !== undefined) {
      sanitized.cardTextColor = null
    }
    if (forceRemove || settings.backgroundColor !== undefined) {
      sanitized.backgroundColor = null
    }
  }

  // Remover cor dos likes se não tiver acesso
  if (!limits.canCustomizeLikesColor) {
    if (forceRemove || settings.likesColor !== undefined) {
      sanitized.likesColor = null
    }
  }

  // Remover cores dos botões se não tiver acesso
  if (!limits.canCustomizeButtonColors) {
    if (forceRemove || settings.buttonBackgroundColor !== undefined) {
      sanitized.buttonBackgroundColor = null
    }
    if (forceRemove || settings.buttonTextColor !== undefined) {
      sanitized.buttonTextColor = null
    }
  }

  // Forçar modo full se não puder mudar
  if (!limits.canChangeBackgroundMode) {
    sanitized.backgroundMode = 'full'
  }

  // Sem permissão de overlay: fundo sem véu de cor (imagem / bg padrão visíveis)
  if (!limits.canToggleBackgroundOverlay) {
    sanitized.backgroundOverlay = false
    sanitized.backgroundOverlayOpacity = 0
  }

  if (!limits.canCustomizeUsernameDisplayEffect) {
    if (forceRemove || settings.usernameDisplayEffect !== undefined) {
      sanitized.usernameDisplayEffect = null
    }
    if (forceRemove || settings.statusMessageDisplayEffect !== undefined) {
      sanitized.statusMessageDisplayEffect = null
    }
  }

  if (!limits.canCustomizeColors) {
    if (forceRemove || settings.statusMessageTextColor !== undefined) {
      sanitized.statusMessageTextColor = null
    }
    if (forceRemove || settings.statusMessageContainerBg !== undefined) {
      sanitized.statusMessageContainerBg = null
    }
    if (forceRemove || settings.statusMessageBubbleBg !== undefined) {
      sanitized.statusMessageBubbleBg = null
    }
  }

  if (!limits.canControlFollowListsPrivacy) {
    sanitized.showFollowersFollowing = true
    sanitized.showFollowersCount = true
    sanitized.showFollowingCount = true
    sanitized.hideFromOthersFollowLists = false
  }

  if (!limits.canHideIdentityInPostReactions) {
    sanitized.hideIdentityInPostReactions = false
  }

  if (!limits.canHideStoryViewersList) {
    sanitized.hideStoryViewersList = false
  }

  return sanitized
}

export type ShopAppearanceSettings = {
  backgroundImage?: string | null
  backgroundMode?: 'full' | 'top'
  backgroundOverlay?: boolean
  backgroundOverlayOpacity?: number
  titleColor?: string | null
  titleDisplayEffect?: unknown
}

export function validateShopAppearanceSettings(
  userPlan: PlanType,
  settings: ShopAppearanceSettings
): { valid: boolean; error?: string } {
  const limits = PLAN_LIMITS[userPlan]

  if (settings.backgroundImage && !limits.canUploadShopBackgroundImage) {
    return {
      valid: false,
      error: 'Imagem de fundo da loja disponível apenas nos planos PRO e PRO+',
    }
  }

  if (
    settings.backgroundMode &&
    settings.backgroundMode !== 'full' &&
    !limits.canChangeShopBackgroundMode
  ) {
    return {
      valid: false,
      error: 'Modo de exibição do fundo da loja disponível apenas nos planos PRO e PRO+',
    }
  }

  if (!limits.canToggleShopBackgroundOverlay) {
    if (settings.backgroundOverlay === true) {
      return {
        valid: false,
        error: 'Overlay do fundo da loja disponível apenas nos planos PRO e PRO+',
      }
    }
    if (
      typeof settings.backgroundOverlayOpacity === 'number' &&
      settings.backgroundOverlayOpacity > 0
    ) {
      return {
        valid: false,
        error: 'Opacidade do overlay da loja disponível apenas nos planos PRO e PRO+',
      }
    }
  }

  if (settings.titleColor && !limits.canCustomizeShopTitleColor) {
    return {
      valid: false,
      error: 'Cor do título da loja disponível a partir do plano Starter',
    }
  }

  if (
    settings.titleDisplayEffect !== undefined &&
    !limits.canCustomizeShopTitleDisplayEffect
  ) {
    return {
      valid: false,
      error: 'Efeito no título da loja disponível apenas nos planos PRO e PRO+',
    }
  }

  return { valid: true }
}

export function sanitizeShopAppearanceSettings(
  userPlan: PlanType,
  settings: ShopAppearanceSettings,
  forceRemove = false
): ShopAppearanceSettings {
  const limits = PLAN_LIMITS[userPlan]
  const sanitized: ShopAppearanceSettings = { ...settings }

  if (!limits.canUploadShopBackgroundImage) {
    if (forceRemove || settings.backgroundImage !== undefined) {
      sanitized.backgroundImage = null
    }
  }

  if (!limits.canChangeShopBackgroundMode) {
    sanitized.backgroundMode = 'full'
  }

  if (!limits.canToggleShopBackgroundOverlay) {
    sanitized.backgroundOverlay = false
    sanitized.backgroundOverlayOpacity = 0
  }

  if (!limits.canCustomizeShopTitleColor) {
    if (forceRemove || settings.titleColor !== undefined) {
      sanitized.titleColor = null
    }
  }

  if (!limits.canCustomizeShopTitleDisplayEffect) {
    if (forceRemove || settings.titleDisplayEffect !== undefined) {
      sanitized.titleDisplayEffect = null
    }
  }

  return sanitized
}

