export type MarketplaceSortMode =
  | 'recent'
  | 'oldest'
  | 'price_high'
  | 'price_low'
  | 'best_sellers'

export type MarketplaceGenderFilter =
  | 'all'
  | 'men'
  | 'women'
  | 'trans_men'
  | 'trans_women'
  | 'other'

export function marketplaceSortModeToQuery(mode: MarketplaceSortMode): {
  sortBy: 'createdAt' | 'price' | 'salesCount'
  sortOrder: 'asc' | 'desc'
} {
  switch (mode) {
    case 'oldest':
      return { sortBy: 'createdAt', sortOrder: 'asc' }
    case 'price_high':
      return { sortBy: 'price', sortOrder: 'desc' }
    case 'price_low':
      return { sortBy: 'price', sortOrder: 'asc' }
    case 'best_sellers':
      return { sortBy: 'salesCount', sortOrder: 'desc' }
    case 'recent':
    default:
      return { sortBy: 'createdAt', sortOrder: 'desc' }
  }
}

export const MARKETPLACE_SORT_LABELS: Record<MarketplaceSortMode, string> = {
  recent: 'Mais recentes',
  oldest: 'Mais antigos',
  price_high: 'Preço — maior para menor',
  price_low: 'Preço — menor para maior',
  best_sellers: 'Mais vendidos',
}

export const MARKETPLACE_GENDER_LABELS: Record<MarketplaceGenderFilter, string> = {
  women: 'Mulheres',
  men: 'Homens',
  trans_women: 'Mulheres trans',
  trans_men: 'Homens trans',
  other: 'Outros',
  all: 'Todos',
}
