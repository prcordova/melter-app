import type { PostReactionsCount, ReactionType } from '../types/feed';

export const EMPTY_REACTIONS_COUNT: PostReactionsCount = {
  LIKE: 0,
  LOVE: 0,
  HAPPY: 0,
  FIRE: 0,
  STRONG: 0,
  SAD: 0,
  ANGRY: 0,
  total: 0,
};

export function normalizeReactionsCount(counts: unknown): PostReactionsCount {
  if (!counts || typeof counts !== 'object') {
    return { ...EMPTY_REACTIONS_COUNT };
  }
  const c = counts as Record<string, unknown>;
  const pick = (key: ReactionType | 'total') => {
    const n = Number(c[key]);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  return {
    LIKE: pick('LIKE'),
    LOVE: pick('LOVE'),
    HAPPY: pick('HAPPY'),
    FIRE: pick('FIRE'),
    STRONG: pick('STRONG'),
    SAD: pick('SAD'),
    ANGRY: pick('ANGRY'),
    total: pick('total'),
  };
}

export function applyOptimisticReaction(
  prevReaction: ReactionType | null,
  prevCounts: unknown,
  reactionType: ReactionType
): { userReaction: ReactionType | null; reactionsCount: PostReactionsCount } {
  const newCounts = normalizeReactionsCount(prevCounts);
  let newReaction: ReactionType | null = prevReaction;

  if (prevReaction === reactionType) {
    newReaction = null;
    if (newCounts[reactionType] > 0) newCounts[reactionType] -= 1;
    if (newCounts.total > 0) newCounts.total -= 1;
  } else if (prevReaction === null) {
    newReaction = reactionType;
    newCounts[reactionType] += 1;
    newCounts.total += 1;
  } else {
    if (newCounts[prevReaction] > 0) newCounts[prevReaction] -= 1;
    newCounts[reactionType] += 1;
    newReaction = reactionType;
  }

  return { userReaction: newReaction, reactionsCount: newCounts };
}
