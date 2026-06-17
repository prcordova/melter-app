import { api } from '../http-client';
import { USERS_API } from '../../config/users/api-paths';
import type {
  UserGenderIdentity,
  UserInterestedIn,
} from '../../constants/user-demographics';
import type { ApiResponse, SendFriendRequestApiResponse } from '../shared/types';
import type { ProfileContentSafetyPublic } from '../../types/profile-content-safety';

export const userApi = {
  getMyProfile: async (params?: { scope?: 'basic' | 'full' }) => {
    const scope = params?.scope || 'basic';
    const response = await api.get<ApiResponse<any>>(
      `${USERS_API.me.profile}?scope=${scope}`
    );
    return response.data;
  },
  listUsers: async (params: {
    page?: number;
    limit?: number;
    filter?: 'popular' | 'recent' | 'most-viewed' | 'most-liked';
    search?: string;
    excludeFriends?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.filter) queryParams.append('filter', params.filter);
    if (params.search) queryParams.append('search', params.search);
    if (params.excludeFriends) queryParams.append('excludeFriends', 'true');

    const response = await api.get<ApiResponse<any>>(`/api/users?${queryParams.toString()}`);
    return response.data;
  },
  sendFriendRequest: async (userId: string): Promise<SendFriendRequestApiResponse> => {
    const response = await api.post<SendFriendRequestApiResponse>('/api/friendships/requests', {
      recipientId: userId,
    });
    return response.data;
  },
  acceptFriendRequest: async (requestId: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/friendships/requests/${requestId}/accept`);
    return response.data;
  },
  rejectFriendRequest: async (requestId: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/friendships/requests/${requestId}/reject`);
    return response.data;
  },
  cancelFriendRequest: async (requestId: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/friendships/requests/${requestId}/reject`);
    return response.data;
  },
  removeFriend: async (friendshipId: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/friendships/${friendshipId}/unfriend`);
    return response.data;
  },
  getFriendRequestsSent: async () => {
    const response = await api.get<ApiResponse<any>>('/api/friendships/requests/sent');
    return response.data;
  },
  getFriendRequestsReceived: async () => {
    const response = await api.get<ApiResponse<any>>('/api/friendships/requests/received');
    return response.data;
  },
  getMyFriends: async (params?: { search?: string; sort?: 'recent' | 'name' }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.sort) query.append('sort', params.sort);
    const response = await api.get<ApiResponse<any>>(`/api/friendships/friends?${query.toString()}`);
    return response.data;
  },
  checkFriendshipStatus: async (userId: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/friendships/status/${userId}`);
    return response.data;
  },
  followUser: async (username: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/users/${username}/follow`);
    return response.data;
  },
  unfollowUser: async (username: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/users/${username}/unfollow`);
    return response.data;
  },
  getFollowStatus: async (username: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/users/${username}/follow-status`);
    return response.data;
  },
  getUserProfile: async (
    username: string,
    options?: { guestContentAck?: boolean; context?: 'shop' }
  ) => {
    const search = new URLSearchParams();
    if (options?.guestContentAck) search.set('guestContentAck', '1');
    if (options?.context) search.set('context', options.context);
    const qs = search.toString();
    const response = await api.get<ApiResponse<any>>(
      `${USERS_API.byUsername(username)}${qs ? `?${qs}` : ''}`
    );
    return response.data;
  },
  /** Lista paginada: `data.items`, `data.hasMore`, `data.page` */
  getFollowers: async (username: string, params?: { page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.page != null) search.set('page', String(params.page));
    if (params?.limit != null) search.set('limit', String(params.limit));
    const qs = search.toString();
    const response = await api.get<ApiResponse<any>>(
      `/api/users/${encodeURIComponent(username)}/followers${qs ? `?${qs}` : ''}`
    );
    return response.data;
  },
  getFollowing: async (username: string, params?: { page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.page != null) search.set('page', String(params.page));
    if (params?.limit != null) search.set('limit', String(params.limit));
    const qs = search.toString();
    const response = await api.get<ApiResponse<any>>(
      `/api/users/${encodeURIComponent(username)}/following${qs ? `?${qs}` : ''}`
    );
    return response.data;
  },
  blockUser: async (username: string, reason?: string) => {
    const response = await api.post<ApiResponse<any>>('/api/blocks', { targetUsername: username, reason });
    return response.data;
  },
  unblockUser: async (username: string) => {
    const response = await api.delete<ApiResponse<any>>(`/api/blocks/${username}`);
    return response.data;
  },
  getBlockStatus: async (username: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/blocks/${username}`);
    return response.data;
  },
  reportUser: async (targetUsername: string, data: {
    category: string;
    description: string;
    targetType?: string;
    targetId?: string;
  }) => {
    const formData = new FormData();
    formData.append('targetUsername', targetUsername);
    formData.append('targetType', data.targetType || 'PROFILE');
    if (data.targetId) formData.append('targetId', data.targetId);
    formData.append('category', data.category);
    formData.append('description', data.description);

    const response = await api.post<ApiResponse<any>>('/api/reports', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getBlockedUsers: async () => {
    const response = await api.get<ApiResponse<Array<{
      userId: string;
      username: string;
      avatar?: string;
      blockedAt: string;
    }>>>('/api/blocks/list');
    return response.data;
  },
  getCategoryPreferences: async () => {
    const response = await api.get<ApiResponse<{
      categoryInteractions: { [key: string]: number };
      blockedCategories: string[];
      categoryRanking: Array<{ category: string; count: number }>;
    }>>('/api/users/preferences/category-preferences');
    return response.data;
  },
  updateCategoryPreferences: async (blockedCategories: string[]) => {
    const response = await api.put<ApiResponse<any>>('/api/users/preferences/category-preferences', {
      blockedCategories,
    });
    return response.data;
  },
  resetCategoryPreferences: async () => {
    const response = await api.delete<ApiResponse<any>>('/api/users/preferences/category-preferences');
    return response.data;
  },
  updateEmailMarketing: async (enabled: boolean) => {
    const response = await api.patch<ApiResponse<any>>('/api/users/preferences/email-marketing', {
      enabled,
    });
    return response.data;
  },
  updateUserGender: async (gender: UserGenderIdentity) => {
    const response = await api.patch<ApiResponse<{ gender: UserGenderIdentity }>>(
      '/api/users/preferences/gender',
      { gender }
    );
    return response.data;
  },
  getUserDemographics: async () => {
    const response = await api.get<
      ApiResponse<{
        gender: UserGenderIdentity | null;
        interestedIn: UserInterestedIn[];
        platformPurposes: string[];
        sexualOrientation: string | null;
      }>
    >('/api/users/preferences/demographics');
    return response.data;
  },
  getLocationPreference: async () => {
    const response = await api.get<
      ApiResponse<{
        country: string | null;
        city: string | null;
        hideLocation?: boolean;
      }>
    >(USERS_API.me.preferences.location);
    return response.data;
  },
  patchLocationPreference: async (payload: {
    country?: string | null;
    city?: string | null;
    hideLocation?: boolean;
  }) => {
    const response = await api.patch<ApiResponse<unknown>>(
      USERS_API.me.preferences.location,
      payload
    );
    return response.data;
  },
  getUsernameChangeStatus: async () => {
    const response = await api.get<ApiResponse<unknown>>(USERS_API.me.username.changeStatus);
    return response.data;
  },
  checkUsernameAvailability: async (username: string, signal?: AbortSignal) => {
    const response = await api.get<ApiResponse<unknown>>(USERS_API.me.username.availability, {
      params: { username },
      signal,
    });
    return response.data;
  },
  sendUsernameChangeCode: async (newUsername: string) => {
    const response = await api.post<ApiResponse<{ message?: string }>>(
      USERS_API.me.username.sendCode,
      { newUsername }
    );
    return response.data;
  },
  updateUsername: async (payload: {
    newUsername: string;
    password: string;
    emailCode: string;
  }) => {
    const response = await api.patch<
      ApiResponse<{ username?: string }> & { newToken?: string; message?: string }
    >(USERS_API.me.username.update, payload);
    return response.data;
  },
  updateUserDemographics: async (payload: {
    gender: UserGenderIdentity;
    interestedIn: UserInterestedIn[];
    platformPurposes: string[];
    sexualOrientation?: string | null;
  }) => {
    const response = await api.patch<
      ApiResponse<{
        gender: UserGenderIdentity | null;
        interestedIn: UserInterestedIn[];
        platformPurposes: string[];
        sexualOrientation: string | null;
      }>
    >('/api/users/preferences/demographics', payload);
    return response.data;
  },
  updateTransactionalEmailPreferences: async (partial: {
    emailNotifyNewFollowers?: boolean;
    emailNotifyFriendRequests?: boolean;
    emailNotifyMessagesWhenOffline?: boolean;
  }) => {
    const response = await api.patch<
      ApiResponse<{
        emailNotifyNewFollowers: boolean;
        emailNotifyFriendRequests: boolean;
        emailNotifyMessagesWhenOffline: boolean;
      }>
    >('/api/users/preferences/transactional-emails', partial);
    return response.data;
  },
  acceptTerms: async (version: string) => {
    const response = await api.post<ApiResponse<any>>('/api/users/accept-terms', { version });
    return response.data;
  },
  getStatus: async () => {
    const response = await api.get<ApiResponse<any>>('/api/users/status');
    return response.data;
  },
  updateStatus: async (statusData: { visibility?: 'online' | 'busy' | 'offline'; customMessage?: string }) => {
    const response = await api.put<
      ApiResponse<any> & { contentSafety?: ProfileContentSafetyPublic }
    >('/api/users/status', statusData);
    return response.data;
  },
  searchMentions: async (query: string) => {
    const response = await api.get<ApiResponse<Array<{ _id: string; username: string; avatar?: string }>>>(`/api/users/search-mentions?q=${encodeURIComponent(query)}`);
    return response.data;
  },
  getMyPurchases: async () => {
    const response = await api.get<ApiResponse<any[]>>('/api/users/my-purchases');
    return response.data;
  },
  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
    twoFactorCode?: string;
    logoutAllDevices?: boolean;
  }) => {
    const response = await api.post<ApiResponse<{ newToken?: string }>>('/api/users/change-password', data);
    return response.data;
  },
  setup2FA: async () => {
    const response = await api.post<ApiResponse<{ secret: string; qrCode: string }>>('/api/users/2fa/setup', {});
    return response.data;
  },
  verify2FA: async (code: string) => {
    const response = await api.post<ApiResponse<{ backupCodes: string[] }>>('/api/users/2fa/verify', { code });
    return response.data;
  },

  /** Selo verificado (PRO ou PRO+, 2FA, documentos) — mesmo endpoint do web `VerificationBadge`. */
  submitAccountVerification: async (formData: FormData) => {
    const response = await api.post<ApiResponse<any>>('/api/users/verification/submit', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000,
    });
    return response.data;
  },
};

// API de Posts (Feed)
