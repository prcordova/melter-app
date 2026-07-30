import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationSoundCategory =
  | 'message'
  | 'social'
  | 'engagement'
  | 'commerce'
  | 'system';

const STORAGE_KEY = 'melter-notification-sounds';

export type NotificationSoundPrefs = {
  enabled: boolean;
  categories: Partial<Record<NotificationSoundCategory, boolean>>;
};

const DEFAULT_PREFS: NotificationSoundPrefs = {
  enabled: true,
  categories: {},
};

const TYPE_TO_CATEGORY: Record<string, NotificationSoundCategory> = {
  MESSAGE: 'message',
  FOLLOW: 'social',
  FRIEND_REQUEST: 'social',
  FRIEND_ACCEPTED: 'social',
  POST_REACTION: 'engagement',
  POST_COMMENT: 'engagement',
  POST_MENTION: 'engagement',
  POST_SHARE: 'engagement',
  STORY_REACTION: 'engagement',
  LINK_LIKED: 'engagement',
  NEW_POST: 'engagement',
  DONATION_RECEIVED: 'commerce',
  DONATION_SENT: 'commerce',
  PRODUCT_SOLD: 'commerce',
  PRODUCT_PURCHASED: 'commerce',
  NEW_PRODUCT: 'commerce',
  WITHDRAWAL_APPROVED: 'commerce',
  WITHDRAWAL_REJECTED: 'commerce',
  ADMIN_CREDIT: 'commerce',
  ADMIN_DEBIT: 'commerce',
  REFERRAL_REWARD_AVAILABLE: 'commerce',
  REFERRAL_REWARD_CLAIMED: 'commerce',
  SUBSCRIPTION_RENEWAL_REMINDER: 'commerce',
  SUBSCRIPTION_LOW_BALANCE: 'commerce',
  SUBSCRIPTION_CANCELLED: 'commerce',
  PLATFORM_PLAN_PAYMENT_FAILED: 'commerce',
};

let memoryCache: NotificationSoundPrefs | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

async function loadFromStorage(): Promise<NotificationSoundPrefs> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PREFS, categories: { ...DEFAULT_PREFS.categories } };
    }
    const parsed = JSON.parse(raw) as Partial<NotificationSoundPrefs>;
    return {
      enabled: parsed.enabled !== false,
      categories: { ...(parsed.categories ?? {}) },
    };
  } catch {
    return { ...DEFAULT_PREFS, categories: { ...DEFAULT_PREFS.categories } };
  }
}

/** Carrega prefs na memória (chamar no boot do app). */
export async function initNotificationSoundPrefs(): Promise<void> {
  memoryCache = await loadFromStorage();
}

export function getNotificationSoundPrefs(): NotificationSoundPrefs {
  return memoryCache ?? { ...DEFAULT_PREFS, categories: { ...DEFAULT_PREFS.categories } };
}

export async function setNotificationSoundPrefs(prefs: NotificationSoundPrefs): Promise<void> {
  memoryCache = prefs;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  notifyListeners();
}

export function subscribeNotificationSoundPrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isNotificationSoundCategoryEnabled(category: NotificationSoundCategory): boolean {
  const prefs = getNotificationSoundPrefs();
  if (!prefs.enabled) return false;
  return prefs.categories[category] !== false;
}

export function resolveNotificationSoundCategory(type: string): NotificationSoundCategory {
  return TYPE_TO_CATEGORY[type] ?? 'system';
}

/** Prévia no app (sem Web Audio API — prefs aplicam-se ao som em foreground). */
export async function previewNotificationSoundCategory(
  _category: NotificationSoundCategory
): Promise<void> {
  /* noop — no mobile não há tom sintético como no web */
}
