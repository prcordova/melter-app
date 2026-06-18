export type ShopWorkspaceTabsDensity =
  | 'desktop'
  | 'wideTablet'
  | 'tablet'
  | 'mobile'
  | 'mobileXs'

export function resolveShopWorkspaceTabsDensity(width: number): ShopWorkspaceTabsDensity {
  if (width < 400) return 'mobileXs'
  if (width < 600) return 'mobile'
  if (width < 800) return 'tablet'
  if (width < 1200) return 'wideTablet'
  return 'desktop'
}

export type ShopWorkspaceTabsDensityTokens = {
  shellPaddingH: number
  shellPaddingV: number
  tabPaddingV: number
  tabPaddingH: number
  tabFontSize: number
}

export const SHOP_WORKSPACE_TABS_DENSITY: Record<
  ShopWorkspaceTabsDensity,
  ShopWorkspaceTabsDensityTokens
> = {
  desktop: {
    shellPaddingH: 12,
    shellPaddingV: 4,
    tabPaddingV: 10,
    tabPaddingH: 16,
    tabFontSize: 12,
  },
  wideTablet: {
    shellPaddingH: 8,
    shellPaddingV: 2,
    tabPaddingV: 6,
    tabPaddingH: 10,
    tabFontSize: 11,
  },
  tablet: {
    shellPaddingH: 6,
    shellPaddingV: 2,
    tabPaddingV: 5,
    tabPaddingH: 8,
    tabFontSize: 11,
  },
  mobile: {
    shellPaddingH: 6,
    shellPaddingV: 1,
    tabPaddingV: 4,
    tabPaddingH: 7,
    tabFontSize: 10,
  },
  mobileXs: {
    shellPaddingH: 4,
    shellPaddingV: 1,
    tabPaddingV: 3,
    tabPaddingH: 6,
    tabFontSize: 9,
  },
}
