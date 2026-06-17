export type ProductContentStatsLike = {
  videoCount: number
  imageCount: number
  documentCount: number
};

type ProductDigitalForAiDisclosure = {
  filesCount?: number;
  contentStats?: ProductContentStatsLike | null;
};

export type ProductForAiCheckoutDisclosure = {
  isAiContent?: boolean;
  digital?: ProductDigitalForAiDisclosure | null;
};

function getDeliverableItemCount(digital?: ProductDigitalForAiDisclosure | null): number {
  if (!digital) return 1;

  if (typeof digital.filesCount === 'number' && digital.filesCount > 0) {
    return digital.filesCount;
  }

  const stats = digital.contentStats;
  if (stats) {
    const total = stats.videoCount + stats.imageCount + stats.documentCount;
    if (total > 0) return total;
  }

  return 1;
}

export function getProductAiCheckoutDisclosureMessage(
  product: ProductForAiCheckoutDisclosure
): string | null {
  if (!product.isAiContent) return null;

  const itemCount = getDeliverableItemCount(product.digital);

  if (itemCount > 1) {
    return 'Um ou mais conteúdos deste pacote podem ter sido gerados utilizando inteligência artificial (IA). Ao confirmar a compra, você declara estar ciente de que o material pode não retratar pessoas reais.';
  }

  return 'Este conteúdo foi gerado utilizando inteligência artificial (IA). Ao confirmar a compra, você declara estar ciente de que o material pode não retratar uma pessoa real.';
}
