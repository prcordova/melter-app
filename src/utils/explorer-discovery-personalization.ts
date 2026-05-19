import {
  parsePlatformPurposesInput,
  type UserPlatformPurpose,
} from '../constants/user-platform-purposes';

/** Alinhado à web: `shops` = Vendedores/Lojas, `users` = Comunidade. */
export type DiscoveryViewMode = 'shops' | 'users';

export const EXPLORER_SELL_PLATFORM_PURPOSES = [
  'SELL_ADULT_CONTENT',
  'SELL_EDUCATIONAL_CONTENT',
] as const satisfies readonly UserPlatformPurpose[];

export const EXPLORER_BUY_PLATFORM_PURPOSES = [
  'BUY_DIGITAL_CONTENT',
] as const satisfies readonly UserPlatformPurpose[];

export type DiscoveryPreference = {
  defaultViewMode: DiscoveryViewMode;
  modeButtonOrder: readonly [DiscoveryViewMode, DiscoveryViewMode];
};

const NEUTRAL_PREFERENCE: DiscoveryPreference = {
  defaultViewMode: 'users',
  modeButtonOrder: ['users', 'shops'],
};

export function resolveExplorerDiscoveryPreference(
  platformPurposes: unknown
): DiscoveryPreference {
  const purposes = parsePlatformPurposesInput(platformPurposes);
  const hasBuy = purposes.some((p) =>
    (EXPLORER_BUY_PLATFORM_PURPOSES as readonly string[]).includes(p)
  );

  if (hasBuy) {
    return {
      defaultViewMode: 'shops',
      modeButtonOrder: ['shops', 'users'],
    };
  }

  return NEUTRAL_PREFERENCE;
}

export const DISCOVERY_TAB_NAMES = {
  shops: 'ShopsTab',
  users: 'CommunityStack',
} as const satisfies Record<DiscoveryViewMode, string>;

export function discoveryModeToTabName(mode: DiscoveryViewMode): string {
  return DISCOVERY_TAB_NAMES[mode];
}
