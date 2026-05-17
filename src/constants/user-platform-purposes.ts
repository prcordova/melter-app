export const USER_PLATFORM_PURPOSE_VALUES = [
  'MEET_FRIENDS',
  'SERIOUS_RELATIONSHIP',
  'CASUAL_DATING',
  'WORK_NETWORKING',
  'STUDIES',
  'GAMES',
  'SELL_ADULT_CONTENT',
  'SELL_EDUCATIONAL_CONTENT',
  'BUY_DIGITAL_CONTENT',
  'PROMOTE_BRAND',
  'FITNESS_WELLNESS',
  'MUSIC_ART_CREATIVITY',
  'TECH_DEVELOPMENT',
  'EVENTS_COMMUNITY',
  'OTHER',
] as const

export type UserPlatformPurpose = (typeof USER_PLATFORM_PURPOSE_VALUES)[number]

export const USER_PLATFORM_PURPOSE_LABELS: Record<UserPlatformPurpose, string> = {
  MEET_FRIENDS: 'Conhecer amigos',
  SERIOUS_RELATIONSHIP: 'Relacionamento sério',
  CASUAL_DATING: 'Encontros casuais',
  WORK_NETWORKING: 'Trabalho / networking',
  STUDIES: 'Estudos',
  GAMES: 'Jogos',
  SELL_ADULT_CONTENT: 'Venda de conteúdo adulto (+18)',
  SELL_EDUCATIONAL_CONTENT: 'Venda de conteúdo educacional',
  BUY_DIGITAL_CONTENT: 'Comprar conteúdos digitais',
  PROMOTE_BRAND: 'Divulgar marca / influência',
  FITNESS_WELLNESS: 'Fitness e bem-estar',
  MUSIC_ART_CREATIVITY: 'Música, arte e criatividade',
  TECH_DEVELOPMENT: 'Tecnologia e desenvolvimento',
  EVENTS_COMMUNITY: 'Eventos e comunidade',
  OTHER: 'Outros',
}

export function isUserPlatformPurpose(value: unknown): value is UserPlatformPurpose {
  return (
    typeof value === 'string' &&
    (USER_PLATFORM_PURPOSE_VALUES as readonly string[]).includes(value)
  )
}

export function parsePlatformPurposesInput(value: unknown): UserPlatformPurpose[] {
  if (!Array.isArray(value)) return []
  return value.filter(isUserPlatformPurpose)
}
