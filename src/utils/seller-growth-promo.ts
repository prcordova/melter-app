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

export function getSellerShopApprovedContent(
  placement: SellerGrowthPromoPlacement,
  variant: SellerGrowthPromoVariant = 'large'
): SellerGrowthPromoContent {
  const compact = variant === 'small';

  if (compact && placement !== 'shop') {
    return {
      title: 'Sua loja está ativa',
      description: 'Acesse sua vitrine para gerenciar produtos e vendas.',
      primaryCta: { label: 'Minha loja', action: 'shop' },
    };
  }

  if (placement === 'shop') {
    return {
      title: 'Loja aprovada',
      description:
        'Sua loja está pronta. Acesse a vitrine para publicar produtos e acompanhar vendas.',
      primaryCta: { label: 'Minha loja', action: 'shop' },
    };
  }

  return {
    title: 'Sua loja está ativa',
    description: 'Gerencie produtos, vendas e a vitrine da sua loja.',
    primaryCta: { label: 'Minha loja', action: 'shop' },
  };
}

export type SellerGrowthPromoCta = {
  label: string;
  action: 'shop' | 'links' | 'appearance' | 'feed' | 'explorer';
};

export type SellerGrowthPromoContent = {
  title: string;
  description: string;
  hint?: string;
  primaryCta?: SellerGrowthPromoCta;
  secondaryCta?: SellerGrowthPromoCta;
  tertiaryCta?: SellerGrowthPromoCta;
};

function getShopPlacementContent(status: SellerVerificationStatusValue): SellerGrowthPromoContent {
  if (!status) {
    return {
      title: 'Prepare seu perfil para vender',
      description:
        'Adicione links e personalize seu perfil antes de concluir o cadastro da loja.',
      primaryCta: { label: 'Adicionar links', action: 'links' },
      secondaryCta: { label: 'Personalizar perfil', action: 'appearance' },
    };
  }

  let description =
    'Complete seu perfil e adicione links para ganhar visibilidade enquanto sua loja é analisada.';

  if (status === 'rejected') {
    description =
      'Enquanto corrige o cadastro acima, mantenha links e perfil atualizados para sua audiência continuar te encontrando.';
  } else if (status === 'pending' || status === 'appeal') {
    description = 'Use este tempo para fortalecer seu perfil, adicionar links e interagir no feed.';
  } else if (status === 'needs_review') {
    description =
      'Além de concluir o cadastro acima, deixe seu perfil completo para atrair seguidores.';
  } else if (status === 'disabled') {
    description = 'Mantenha perfil e links ativos para sua audiência continuar te encontrando.';
  }

  return {
    title: 'Atualize links e perfil enquanto aguarda',
    description,
    primaryCta: { label: 'Adicionar links', action: 'links' },
    secondaryCta: { label: 'Personalizar perfil', action: 'appearance' },
    tertiaryCta: { label: 'Ir ao feed', action: 'feed' },
  };
}

export function getSellerGrowthPromoContent(
  status: SellerVerificationStatusValue,
  placement: SellerGrowthPromoPlacement
): SellerGrowthPromoContent {
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
