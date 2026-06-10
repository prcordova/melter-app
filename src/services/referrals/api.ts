import { api } from '../http-client';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

export const referralsApi = {
  getMyStats: async () => {
    const response = await api.get<ApiResponse<{
      totalReferrals: number;
      activeReferrals: number;
      totalPoints: number;
      totalSpent: number;
      currentLevel: string;
      nextLevel?: {
        name: string;
        referralsNeeded: number;
        spentNeeded: number;
        pointsNeeded: number;
      };
      topSpenders: Array<{
        username: string;
        avatar?: string;
        totalSpent: number;
        points: number;
      }>;
      recentActivity: Array<{
        username: string;
        action: string;
        amount?: number;
        points?: number;
        date: string;
      }>;
      referralLink: string;
      availableReward?: {
        level: string;
        rewards: string[];
        canClaim: boolean;
      } | null;
    }>>('/api/referrals/my-stats');
    return response.data;
  },
  getStatus: async () => {
    const response = await api.get<ApiResponse<{
      isActive: boolean;
    }>>('/api/referrals/status');
    return response.data;
  },
  claimReward: async () => {
    const response = await api.post<ApiResponse<any>>('/api/referrals/claim-reward');
    return response.data;
  },
  getMyReferrals: async () => {
    const response = await api.get<ApiResponse<any[]>>('/api/referrals/my-referrals');
    return response.data;
  },

  resolveReferrer: async (ref: string) => {
    const response = await api.get<ApiResponse<{
      userId: string;
      username: string;
      avatar?: string | null;
    }>>(`/api/referrals/resolve?ref=${encodeURIComponent(ref)}`);
    return response.data;
  },
};

