import type { ShopProductCardLayout } from './shop-product-card-layout';

/** Metadados de vitrine retornados nas APIs de produtos (alinhado ao web). */
export type ShopProductsListMeta = {
  productCardLayout: ShopProductCardLayout;
  productCoverAvatarFallbackEnabled: boolean;
};

export const DEFAULT_SHOP_PRODUCTS_LIST_META: ShopProductsListMeta = {
  productCardLayout: 'vertical',
  productCoverAvatarFallbackEnabled: true,
};

export function normalizeShopProductsListMeta(
  raw: Partial<ShopProductsListMeta> | null | undefined
): ShopProductsListMeta {
  return {
    productCardLayout:
      raw?.productCardLayout === 'horizontal' ? 'horizontal' : 'vertical',
    productCoverAvatarFallbackEnabled: raw?.productCoverAvatarFallbackEnabled !== false,
  };
}
