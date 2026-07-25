export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/** Resposta de POST /api/friendships/requests (autoAccepted vem no topo, não em data). */
export interface SendFriendRequestApiResponse {
  success: boolean;
  message?: string;
  autoAccepted?: boolean;
  data?: {
    _id?: string;
    id?: string;
    status?: string;
  };
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    plan?: {
      type: string;
      expirationDate?: string;
      status?: string;
      gateway?: string;
      pendingPlan?: string;
    };
    verifiedBadge?: {
      isVerified: boolean;
      verifiedAt: string | null;
      source: 'plan' | 'manual' | 'partner' | null;
    };
    sellerVerificationStatus?: {
      status: 'pending' | 'approved' | 'rejected' | null;
      submittedAt?: string | null;
      rejectionReason?: string | null;
    };
    twoFactor?: {
      enabled: boolean;
    };
    phone?: string;
  };
}

export interface LoginResult {
  token?: string;
  tempToken?: string;
  success?: boolean;
  requires2FA?: boolean;
  requiresCancelDeletion?: boolean;
  deletionScheduledAt?: string | null;
  code?: string;
  message?: string;
  data?: AuthResponse;
}
