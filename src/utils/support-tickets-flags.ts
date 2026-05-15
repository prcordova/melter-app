import Constants from 'expo-constants';

/**
 * Espelha NEXT_PUBLIC_SUPPORT_HIDE_BUG_LIST no web.
 * Admin continua vendo a lista completa (endpoint /api/admin/bugs).
 */
export function isSupportTicketListHiddenForUser(isAdmin: boolean): boolean {
  if (isAdmin) return false;
  const raw = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPPORT_HIDE_BUG_LIST;
  return raw === true || raw === 'true';
}
