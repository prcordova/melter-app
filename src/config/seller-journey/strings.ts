/** Textos da Jornada do Vendedor (app). Alinhado a melter i18n sellerJourney (pt). */
export const SELLER_JOURNEY_STRINGS = {
  title: 'Jornada do Vendedor',
  progress: (completed: number, total: number) => `${completed} de ${total} metas`,
  rewardHint: (days: number, plan: string) =>
    `Complete todas as metas no prazo e ganhe ${plan} grátis por ${days} dias!`,
  rewardClaimed: (days: number, plan: string) =>
    `Parabéns! Você ganhou o plano ${plan} por ${days} dias.`,
  linkCopied: 'Link da loja copiado!',
  linkCopyError: 'Não foi possível copiar o link.',
  shareRecorded: 'Compartilhamento registrado!',
  shareRecordError: 'Não foi possível registrar o compartilhamento.',
  actions: {
    copyLink: 'Copiar link',
    share: 'Compartilhar',
    openShop: 'Abrir loja',
    createProduct: 'Criar pack',
  },
  steps: {
    hasCreatedShop: 'Criou a loja',
    hasCreatedShopHint: 'Ative e aprove sua loja no cadastro de vendedor.',
    hasPublishedFirstPack: 'Publicou o primeiro pack',
    hasPublishedFirstPackHint: 'Crie um produto e aguarde a aprovação.',
    hasSharedShopLink: 'Compartilhou o link da loja',
    hasSharedShopLinkHint: 'Use os botões abaixo para compartilhar nas redes.',
    hasFirstVisitor: 'Trouxe o primeiro visitante',
    hasFirstVisitorHint: 'Alguém logado com e-mail confirmado visitou sua loja.',
    hasFirstSale: 'Conseguiu a primeira venda',
    hasFirstSaleHint: 'Complete uma venda na sua loja.',
  },
} as const;
