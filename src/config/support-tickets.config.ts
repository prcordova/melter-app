/**
 * Limites e opções alinhados ao backend Melter:
 * - melter/app/api/bugs/route.ts (bugSchema)
 * - melter/src/models/Bug.ts
 */
export const TICKET_TITLE_MIN_LENGTH = 3;
export const TICKET_TITLE_MAX_LENGTH = 50;
export const TICKET_DESCRIPTION_MIN_LENGTH = 5;
export const TICKET_DESCRIPTION_MAX_LENGTH = 2000;
export const TICKET_PAGE_OTHER_MAX_LENGTH = 300;
export const TICKET_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export const TICKET_PAGE_OPTIONS = [
  '/',
  '/feed',
  '/messages',
  '/profile/config/appearance',
  '/profile/config/wallet',
  '/profile/config/links',
  '/profile/config/financial/wallet',
  '/profile/config/financial/donations',
  '/profile/config/financial',
  '/profile/config',
  '/shop',
  '/plans',
  '/admin',
] as const;

export type TicketPageValue = (typeof TICKET_PAGE_OPTIONS)[number] | 'other';

export const TICKET_PRIORITIES = ['baixo', 'moderado', 'alto', 'critico'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
