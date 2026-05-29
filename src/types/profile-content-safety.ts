export const PROFILE_CONTENT_SAFETY_REASONS = [
  'avatar',
  'background',
  'bio',
  'username',
  'status',
  'links',
  'posts',
] as const;

export type ProfileContentSafetyReason = (typeof PROFILE_CONTENT_SAFETY_REASONS)[number];

export type ProfileContentSafetyPublic = {
  restrictedForGuests: boolean;
  reasons: ProfileContentSafetyReason[];
};
