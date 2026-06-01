import { hasCustomProductCover } from './product-cover-display';

export function getProductCoverDefaultHint(avatarFallbackEnabled: boolean): string {
  if (avatarFallbackEnabled) {
    return 'Se você não enviar uma capa, sua foto de avatar será usada na vitrine da loja e no marketplace.';
  }
  return 'Se você não enviar uma capa, o fundo padrão Melter será exibido na vitrine.';
}

export function getProductCoverPreviewOverlayLabel(
  avatarFallbackEnabled: boolean,
  hasCustomCover: boolean
): string {
  if (hasCustomCover) return '';
  if (avatarFallbackEnabled) {
    return 'Prévia: capa com seu avatar (sem capa personalizada)';
  }
  return 'Prévia: fundo padrão Melter (sem capa personalizada)';
}

export { hasCustomProductCover };
