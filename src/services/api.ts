import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';
import { Linking } from 'react-native';

// Criar instância do axios
export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token nas requisições
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (__DEV__) {
      console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API RESPONSE] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
    }
    return response;
  },
  async (error: AxiosError) => {
    if (__DEV__) {
      console.error(`[API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response?.status, error.response?.data || error.message);
    }
    
    if (error.response?.status === 401) {
      const errorCode = (error.response?.data as any)?.code;
      
      // Não limpar token se for TOKEN_VERSION_MISMATCH
      if (errorCode === 'TOKEN_VERSION_MISMATCH') {
        console.warn('[API] Token version mismatch');
        return Promise.reject(error);
      }
      
      // Se for 401 e não for rota de auth, limpar token
      if (error.config?.url && !error.config.url.includes('/auth/')) {
        await AsyncStorage.removeItem('token');
      }
    }
    return Promise.reject(error);
  }
);

// Interface para resposta da API
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface AuthResponse {
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

interface LoginResult {
  token?: string;
  tempToken?: string;
  success?: boolean;
  data?: AuthResponse;
}

// API de autenticação
export const authApi = {
  login: async (username: string, password: string): Promise<LoginResult> => {
    try {
      // Criar instância sem interceptor para login
      const loginApi = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        timeout: API_CONFIG.TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await loginApi.post<LoginResult>('/api/auth/login', { 
        username, 
        password 
      });
      
      return response.data;
    } catch (error) {
      console.error('[API] Erro no login:', error);
      throw error;
    }
  },

  login2FA: async (tempToken: string, code: string): Promise<LoginResult> => {
    const response = await api.post<LoginResult>('/api/auth/login/2fa', {
      tempToken,
      code,
    });
    return response.data;
  },
};

// API de usuário
export const userApi = {
  getMyProfile: async () => {
    const response = await api.get<ApiResponse<any>>('/api/users/profile');
    return response.data;
  },
  listUsers: async (params: {
    page?: number;
    limit?: number;
    filter?: 'popular' | 'recent' | 'most-viewed' | 'most-liked';
    search?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.filter) queryParams.append('filter', params.filter);
    if (params.search) queryParams.append('search', params.search);

    const response = await api.get<ApiResponse<any>>(`/api/users?${queryParams.toString()}`);
    return response.data;
  },
  sendFriendRequest: async (userId: string) => {
    const response = await api.post<ApiResponse<any>>('/api/friendships/requests', { recipientId: userId });
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
  getUserProfile: async (username: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/users/${username}`);
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
  acceptTerms: async (version: string) => {
    const response = await api.post<ApiResponse<any>>('/api/users/accept-terms', { version });
    return response.data;
  },
  getStatus: async () => {
    const response = await api.get<ApiResponse<any>>('/api/users/status');
    return response.data;
  },
  updateStatus: async (statusData: { visibility?: 'online' | 'busy' | 'offline'; customMessage?: string }) => {
    const response = await api.put<ApiResponse<any>>('/api/users/status', statusData);
    return response.data;
  },
};

// API de Posts (Feed)
export const postsApi = {
  BASE_URL: API_CONFIG.BASE_URL, // Exportar para uso no upload
  
  getPosts: async (page = 1, limit = 20) => {
    const response = await api.get<ApiResponse<any>>(`/api/posts?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  getUserPosts: async (username: string, page = 1, limit = 10) => {
    const response = await api.get<ApiResponse<any>>(`/api/posts/user/${username}?page=${page}&limit=${limit}`);
    return response.data;
  },

  createPost: async (data: {
    content: string;
    imageUrl?: string | null;
    visibility: string;
    category: string;
    linkId?: string | null;
    hideAutoPreview?: boolean;
  }) => {
    const response = await api.post<ApiResponse<any>>('/api/posts', data);
    return response.data;
  },

  reactToPost: async (postId: string, reactionType: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/posts/${postId}/react`, {
      reactionType,
    });
    return response.data;
  },

  commentOnPost: async (postId: string, content: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/posts/${postId}/comments`, {
      content,
    });
    return response.data;
  },

  getComments: async (postId: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/posts/${postId}/comments`);
    return response.data;
  },

  reactToComment: async (postId: string, commentId: string, reactionType = 'LIKE') => {
    const response = await api.post<ApiResponse<any>>(`/api/posts/${postId}/comments/${commentId}/react`, {
      reactionType,
    });
    return response.data;
  },

  deletePost: async (postId: string) => {
    // Usamos POST como fallback para garantir compatibilidade em mobile
    const response = await api.post<ApiResponse<any>>(`/api/posts/${postId}/delete`);
    return response.data;
  },

  sharePost: async (postId: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/posts/${postId}/share`);
    return response.data;
  },
};

// API de Mensagens
export const messageApi = {
  getConversations: async () => {
    const response = await api.get<ApiResponse<any>>('/api/messages/conversations');
    return response.data;
  },

  getMessages: async (userId: string, otherUserId: string, date?: string) => {
    const params = new URLSearchParams();
    if (date) params.append('beforeDate', date);
    const response = await api.get<ApiResponse<any>>(`/api/messages/${userId}/${otherUserId}?${params.toString()}`);
    return response.data;
  },

  sendMessage: async (data: { recipientId: string; content: string; type?: 'text' | 'image' | 'document' }) => {
    const response = await api.post<ApiResponse<any>>('/api/messages', {
      recipientId: data.recipientId,
      content: data.content,
      type: data.type || 'text',
    });
    return response.data;
  },

  markAsRead: async (senderId: string) => {
    const response = await api.post<ApiResponse<any>>('/api/messages/mark-read', { senderId });
    return response.data;
  },

  archiveConversation: async (conversationId: string) => {
    const response = await api.put<ApiResponse<any>>(`/api/messages/conversations/${conversationId}/archive`, {});
    return response.data;
  },

  deleteConversation: async (conversationId: string) => {
    const response = await api.delete<ApiResponse<any>>(`/api/messages/conversations/${conversationId}`);
    return response.data;
  },
};

// API de Stories
export const storiesApi = {
  getStories: async (myStoriesOnly = false) => {
    const response = await api.get<ApiResponse<any>>(`/api/stories?myStoriesOnly=${myStoriesOnly}`);
    return response.data;
  },

  createStory: async (data: FormData) => {
    const token = await AsyncStorage.getItem('token');
    const response = await axios.post(`${API_CONFIG.BASE_URL}/api/stories`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteStory: async (storyId: string) => {
    const response = await api.delete<ApiResponse<any>>(`/api/stories/${storyId}`);
    return response.data;
  },
};

// API de Pagamentos
export const paymentApi = {
  createCheckoutSession: async (planName: string, gateway?: 'STRIPE' | 'MERCADOPAGO') => {
    try {
      const response = await api.post<ApiResponse<{ url: string; gateway?: string }>>('/api/payments/create-checkout', {
        plano: planName.toUpperCase(), // STARTER, PRO, PRO_PLUS
        ...(gateway && { gateway }),
      });
      
      if (response.data.success && response.data.data?.url) {
        // Abrir URL no navegador
        const canOpen = await Linking.canOpenURL(response.data.data.url);
        if (canOpen) {
          await Linking.openURL(response.data.data.url);
        } else {
          throw new Error('Não foi possível abrir o link de pagamento');
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Erro ao criar sessão de checkout:', error);
      throw error;
    }
  },

  cancelSubscription: async (newPlan?: string) => {
    try {
      const response = await api.post<ApiResponse<any>>('/api/payments/cancel-subscription', { newPlan });
      return response.data;
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      throw error;
    }
  },
};

// API de Links
export const linksApi = {
  getLinks: async () => {
    const response = await api.get<ApiResponse<any>>('/api/links');
    return response.data;
  },

  createLink: async (linkData: { title: string; url: string; visible: boolean; description?: string }) => {
    const response = await api.post<ApiResponse<any>>('/api/links', linkData);
    return response.data;
  },

  updateLink: async (id: string, linkData: { title?: string; url?: string; visible?: boolean; description?: string; imageUrl?: string | null }) => {
    const response = await api.put<ApiResponse<any>>(`/api/links/${id}`, linkData);
    return response.data;
  },

  deleteLink: async (id: string) => {
    const response = await api.delete<ApiResponse<any>>(`/api/links/${id}`);
    return response.data;
  },

  reorderLinks: async (links: string[]) => {
    const response = await api.post<ApiResponse<any>>('/api/links/reorder', { links });
    return response.data;
  },

  uploadLinkImage: async (linkId: string, imageUri: string) => {
    const token = await AsyncStorage.getItem('token');
    
    // Criar FormData
    const formData = new FormData();
    
    // Converter URI para File/Blob
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('image', {
      uri: imageUri,
      type,
      name: filename,
    } as any);
    formData.append('linkId', linkId);

    const response = await axios.post(`${API_CONFIG.BASE_URL}/api/links/upload-image`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
};

// API de Perfil
export const profileApi = {
  updateProfile: async (profileData: {
    bio?: string;
    profile?: {
      backgroundColor?: string;
      cardColor?: string;
      textColor?: string;
      cardTextColor?: string;
      displayMode?: 'list' | 'grid';
      gridAlignment?: 'flex-start' | 'center' | 'flex-end';
      cardStyle?: 'rounded' | 'square' | 'pill';
      animation?: 'none' | 'fade' | 'slide' | 'bounce';
      font?: 'default' | 'serif' | 'mono';
      spacing?: number;
      sortMode?: 'custom' | 'date' | 'name' | 'likes';
      likesColor?: string;
      backgroundImage?: string | null;
      backgroundMode?: 'full' | 'top';
      backgroundOverlay?: boolean;
      backgroundOverlayOpacity?: number;
      showLikes?: boolean;
      showViews?: boolean;
      showPosts?: boolean;
      postsLimit?: number;
      buttonBackgroundColor?: string | null;
      buttonTextColor?: string | null;
    };
    status?: {
      visibility?: 'online' | 'busy' | 'offline';
      customMessage?: string;
    };
  }) => {
    const response = await api.put<ApiResponse<any>>('/api/users/profile', profileData);
    return response.data;
  },

  deleteBackground: async () => {
    const response = await api.delete<ApiResponse<any>>('/api/users/background');
    return response.data;
  },

  uploadAvatar: async (imageUri: string) => {
    const token = await AsyncStorage.getItem('token');
    
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('avatar', {
      uri: imageUri,
      type,
      name: filename,
    } as any);

    const response = await axios.post(`${API_CONFIG.BASE_URL}/api/users/avatar`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  uploadBackground: async (imageUri: string) => {
    const token = await AsyncStorage.getItem('token');
    
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'background.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('background', {
      uri: imageUri,
      type,
      name: filename,
    } as any);

    const response = await axios.post(`${API_CONFIG.BASE_URL}/api/users/background`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
};

// API de Anúncios
export const adsApi = {
  getAds: async (multiple: boolean = false, limit: number = 10) => {
    const response = await api.get<ApiResponse<any>>(`/api/ads?multiple=${multiple}&limit=${limit}`);
    return response.data;
  },
  viewAd: async (adId: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/ads/${adId}/view`);
    return response.data;
  },
  clickAd: async (adId: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/ads/${adId}/click`);
    return response.data;
  },
};
