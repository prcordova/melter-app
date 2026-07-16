/**
 * Sync com melter/src/constants/affiliate-content-categories.ts
 */
export const AFFILIATE_CONTENT_CATEGORY_VALUES = [
  'TECH',
  'EDUCATION',
  'ENTERTAINMENT',
  'LIFESTYLE',
  'GAMES',
  'FINANCE',
  'HEALTH_FITNESS',
  'BEAUTY_FASHION',
  'FOOD',
  'MUSIC',
  'SPORTS',
  'BUSINESS',
  'ADULT',
  'OTHER',
] as const

export type AffiliateContentCategory = (typeof AFFILIATE_CONTENT_CATEGORY_VALUES)[number]

export const AFFILIATE_CONTENT_CATEGORY_LABELS: Record<AffiliateContentCategory, string> = {
  TECH: 'Tecnologia',
  EDUCATION: 'Educação / cursos',
  ENTERTAINMENT: 'Entretenimento',
  LIFESTYLE: 'Lifestyle',
  GAMES: 'Games',
  FINANCE: 'Finanças / investimentos',
  HEALTH_FITNESS: 'Saúde / fitness',
  BEAUTY_FASHION: 'Beleza / moda',
  FOOD: 'Gastronomia',
  MUSIC: 'Música',
  SPORTS: 'Esportes',
  BUSINESS: 'Negócios / marketing',
  ADULT: 'Conteúdo adulto',
  OTHER: 'Outro',
}
