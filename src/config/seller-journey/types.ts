/** Chaves estáveis — sync com melter/src/config/seller-journey/types.ts */
export const SELLER_JOURNEY_STEP_KEYS = [
  'hasCreatedShop',
  'hasPublishedFirstPack',
  'hasSharedShopLink',
  'hasFirstVisitor',
  'hasFirstSale',
] as const;

export type SellerJourneyStepKey = (typeof SELLER_JOURNEY_STEP_KEYS)[number];

export const SELLER_JOURNEY_STEP_UI_ACTION: Record<
  SellerJourneyStepKey,
  'open_shop' | 'create_product' | 'copy_referral_link'
> = {
  hasCreatedShop: 'open_shop',
  hasPublishedFirstPack: 'create_product',
  hasSharedShopLink: 'copy_referral_link',
  hasFirstVisitor: 'copy_referral_link',
  hasFirstSale: 'open_shop',
};

export type SellerJourneyRewardConfig = {
  planType: 'LITE';
  trialDays: number;
};

export type SellerJourneyStepStatus = {
  key: SellerJourneyStepKey;
  labelKey: string;
  hintKey?: string;
  order: number;
  completed: boolean;
  completedAt: string | null;
};

export type SellerJourneyProgressPayload = {
  show: boolean;
  campaignId: string;
  enrolledAt: string | null;
  deadlineAt: string | null;
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
  rewardClaimed: boolean;
  rewardEligible: boolean;
  reward: SellerJourneyRewardConfig;
  steps: SellerJourneyStepStatus[];
  username: string | null;
};
