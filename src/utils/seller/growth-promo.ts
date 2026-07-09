export type SellerVerificationStatusValue =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'needs_review'
  | 'disabled'
  | 'appeal'
  | null
  | undefined;

export type SellerGrowthPromoVariant = 'small' | 'medium' | 'large';

export type SellerGrowthPromoPlacement = 'shop' | 'feed' | 'explorer' | 'marketplace';

export function shouldShowSellerGrowthPromo(status: SellerVerificationStatusValue): boolean {
  return status !== 'approved';
}

export function isSellerVerificationApproved(status: SellerVerificationStatusValue): boolean {
  return status === 'approved';
}

export const SELLER_REACH_SHARE_CTA_LABEL = 'Compartilhar link da loja';

export function getSellerShopApprovedContent(
  placement: SellerGrowthPromoPlacement,
  variant: SellerGrowthPromoVariant = 'large'
): SellerGrowthPromoContent {
  const compact = variant === 'small';

  const sharePrimary: SellerGrowthPromoCta = {
    label: SELLER_REACH_SHARE_CTA_LABEL,
    action: 'share_shop',
  };
  const manageSecondary: SellerGrowthPromoCta = { label: 'Gerenciar loja', action: 'shop' };

  const shareHint =
    'O link inclui sua indicação: quem criar conta por ele conta no programa Indique.';

  if (compact && placement !== 'shop') {
    return {
      title: 'Sua loja está ativa',
      description:
        'Compartilhe sua vitrine no Instagram, WhatsApp ou na bio e traga seguidores para comprar.',
      hint: shareHint,
      primaryCta: sharePrimary,
      secondaryCta: manageSecondary,
    };
  }

  if (placement === 'shop') {
    return {
      title: 'Divulgue sua loja',
      description:
        'Sua vitrine está no ar. Copie o link e compartilhe nas redes onde sua audiência já está.',
      hint: shareHint,
      primaryCta: sharePrimary,
      secondaryCta: { label: 'Ver produtos', action: 'shop' },
    };
  }

  return {
    title: 'Sua loja está ativa',
    description:
      'Divulgue o link da vitrine, publique novos produtos e acompanhe vendas na sua loja.',
    hint: shareHint,
    primaryCta: sharePrimary,
    secondaryCta: manageSecondary,
  };
}

export type SellerGrowthPromoCta = {
  label: string;
  action: 'shop' | 'links' | 'appearance' | 'feed' | 'explorer' | 'share_shop';
};

export type SellerGrowthPromoContent = {
  title: string;
  description: string;
  hint?: string;
  primaryCta?: SellerGrowthPromoCta;
  secondaryCta?: SellerGrowthPromoCta;
  tertiaryCta?: SellerGrowthPromoCta;
};

function getShopPlacementContent(
  _status: SellerVerificationStatusValue
): SellerGrowthPromoContent | null {
  /**
   * Temporariamente desativado — card “Prepare seu perfil” na vitrine (aba Pacotes).
   * Reativar quando quiser incentivar links/aparência antes da loja abrir.
   */
  return null

  /*
  if (!status) {
    return {
      title: 'Prepare seu perfil para vender',
      ...
    }
  }
  ...
  */
}

export function getSellerGrowthPromoContent(
  status: SellerVerificationStatusValue,
  placement: SellerGrowthPromoPlacement
): SellerGrowthPromoContent | null {
  if (placement === 'shop') {
    return getShopPlacementContent(status);
  }

  if (!status) {
    const activateLabel =
      placement === 'marketplace'
        ? 'Ativar loja para vender'
        : placement === 'feed' || placement === 'explorer'
          ? 'Abrir minha loja'
          : 'Cadastrar loja';

    return {
      title: 'Venda seus conteúdos na Melter',
      description:
        'Ative sua loja para publicar produtos digitais. Enquanto isso, deixe seu perfil completo para ganhar visibilidade.',
      hint: 'Perfis com links e bio costumam receber mais visitas.',
      primaryCta: { label: activateLabel, action: 'shop' },
      secondaryCta: { label: 'Adicionar links', action: 'links' },
      tertiaryCta:
        placement === 'feed' || placement === 'explorer'
          ? { label: 'Explorar comunidade', action: 'explorer' }
          : { label: 'Personalizar perfil', action: 'appearance' },
    };
  }

  if (status === 'pending' || status === 'appeal') {
    return {
      title: status === 'appeal' ? 'Reivindicação em análise' : 'Aguardando abertura da loja',
      description:
        'Seu cadastro está em análise. Aproveite para fortalecer seu perfil, adicionar links e interagir no feed.',
      hint: 'Quanto mais completo o perfil, mais fácil seus seguidores te encontram.',
      primaryCta: { label: 'Ver status da loja', action: 'shop' },
      secondaryCta: { label: 'Adicionar links', action: 'links' },
      tertiaryCta:
        placement === 'feed'
          ? { label: 'Ir ao feed', action: 'feed' }
          : { label: 'Conhecer pessoas', action: 'explorer' },
    };
  }

  if (status === 'rejected') {
    return {
      title: 'Cadastro não aprovado',
      description:
        'Corrija os itens solicitados e reenvie sua loja. Enquanto isso, mantenha links e perfil atualizados.',
      primaryCta: { label: 'Corrigir cadastro da loja', action: 'shop' },
      secondaryCta: { label: 'Adicionar links', action: 'links' },
      tertiaryCta: { label: 'Personalizar perfil', action: 'appearance' },
    };
  }

  if (status === 'needs_review') {
    return {
      title: 'Complete o cadastro da loja',
      description:
        'Há pendências no seu cadastro de vendedor. Finalize os dados e enriqueça seu perfil.',
      primaryCta: { label: 'Completar cadastro', action: 'shop' },
      secondaryCta: { label: 'Adicionar links', action: 'links' },
      tertiaryCta: { label: 'Explorar comunidade', action: 'explorer' },
    };
  }

  if (status === 'disabled') {
    return {
      title: 'Loja desabilitada',
      description:
        'Sua loja está indisponível. Mantenha perfil e links ativos para sua audiência te encontrar.',
      primaryCta: { label: 'Ver minha loja', action: 'shop' },
      secondaryCta: { label: 'Adicionar links', action: 'links' },
      tertiaryCta: { label: 'Ir ao feed', action: 'feed' },
    };
  }

  return {
    title: 'Prepare sua loja',
    description: 'Complete seu perfil e cadastro para vender na plataforma.',
    primaryCta: { label: 'Ir para a loja', action: 'shop' },
    secondaryCta: { label: 'Adicionar links', action: 'links' },
  };
}
