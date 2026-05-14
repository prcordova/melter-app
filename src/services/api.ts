import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';
import { Linking } from 'react-native';
import type { UsernameDisplayEffectConfig } from '../types/username-display-effect';
import type { PlatformFeedInfoItem } from '../types/platform-feed-info';

// Criar instância do axios
export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  // Garantir que headers customizados não sejam removidos
  validateStatus: (status) => status < 500, // Não lançar erro para 4xx
  // CRÍTICO: Configurações para React Native com HTTPS cross-origin
  // Garantir que headers sejam enviados corretamente
  withCredentials: false, // Não usar credentials em requisições cross-origin
  maxRedirects: 5, // Permitir redirecionamentos
});

// Interceptor para adicionar token nas requisições
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      // CRÍTICO: No React Native com HTTPS cross-origin, precisamos definir o header
      // usando múltiplas abordagens para garantir que seja enviado
      const authHeader = `Bearer ${token}`;
      
      // Método 1: Usar .set() (padrão do axios)
      config.headers.set('Authorization', authHeader);
      config.headers.set('authorization', authHeader);
      
      // Método 2: Definir como propriedade direta (fallback para React Native)
      // Isso é necessário porque o React Native pode não enviar headers definidos com .set()
      (config.headers as any)['Authorization'] = authHeader;
      (config.headers as any)['authorization'] = authHeader;
      
      // Método 3: Usar common headers (axios padrão)
      if (config.headers.common) {
        (config.headers.common as any)['Authorization'] = authHeader;
        (config.headers.common as any)['authorization'] = authHeader;
      }
      
      // Método 4: Enviar também como X-Auth-Token (header customizado que não é bloqueado)
      // O React Native pode bloquear o header Authorization em requisições HTTPS cross-origin
      config.headers.set('X-Auth-Token', token);
      config.headers.set('x-auth-token', token);
      (config.headers as any)['X-Auth-Token'] = token;
      (config.headers as any)['x-auth-token'] = token;
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
    return response;
  },
  async (error: AxiosError) => {
    if (__DEV__) {
      console.error(`[API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response?.status, error.response?.data || error.message);
      
      // Log detalhado do header enviado
      if (error.config?.headers) {
        const authHeader = error.config.headers.Authorization || error.config.headers.authorization;
        console.error(`[API ERROR] Header Authorization enviado:`, authHeader ? `${authHeader.substring(0, 30)}...` : 'NÃO ENVIADO');
      }
    }
    
    if (error.response?.status === 401) {
      const errorCode = (error.response?.data as any)?.code;
      const errorMessage = (error.response?.data as any)?.message;
      
      // Não limpar token se for TOKEN_VERSION_MISMATCH
      if (errorCode === 'TOKEN_VERSION_MISMATCH') {
        console.warn('[API] Token version mismatch');
        return Promise.reject(error);
      }
      
      // NÃO remover token imediatamente - pode ser problema temporário
      // Só remover se for erro explícito de token inválido/expirado
      // ou se for rota de auth (login falhou)
      if (error.config?.url && error.config.url.includes('/auth/')) {
        // Login/logout - pode remover token
        if (__DEV__) {
          console.warn('[API] Erro 401 em rota de auth - removendo token');
        }
        await AsyncStorage.removeItem('token');
      } else {
        // Para outras rotas, não remover token imediatamente
        // Pode ser problema de CORS, rede, ou header não chegando
        if (__DEV__) {
          console.warn('[API] Erro 401 em rota protegida - mantendo token (pode ser problema de rede/CORS)');
          console.warn('[API] Mensagem do servidor:', errorMessage);
        }
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
    } catch (error: any) {
      console.error('[API] Erro no login:', error.message);
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
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    phone: string;
    fullName: string;
    birthDate: string;
    country?: string;
    city?: string;
    language?: string;
    termsAccepted: boolean;
    referralCode?: string;
    avatar?: { uri: string; type: string; name: string };
  }): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('username', userData.username);
    formData.append('email', userData.email);
    formData.append('password', userData.password);
    formData.append('phone', userData.phone);
    formData.append('fullName', userData.fullName);
    formData.append('birthDate', userData.birthDate);
    formData.append('termsAccepted', String(userData.termsAccepted));
    if (userData.country) formData.append('country', userData.country);
    if (userData.city) formData.append('city', userData.city);
    if (userData.language) formData.append('language', userData.language);
    if (userData.referralCode) formData.append('referralCode', userData.referralCode);
    if (userData.avatar) {
      formData.append('avatar', {
        uri: userData.avatar.uri,
        type: userData.avatar.type,
        name: userData.avatar.name,
      } as any);
    }

    const response = await api.post<ApiResponse<any>>('/api/auth/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  forgotPassword: async (email: string): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>('/api/auth/forgot-password', { email });
    return response.data;
  },
  verifyResetToken: async (email: string, token: string): Promise<ApiResponse<{ valid: boolean }>> => {
    const response = await api.post<ApiResponse<{ valid: boolean }>>('/api/auth/verify-reset-token', {
      email,
      token,
    });
    return response.data;
  },
  resetPassword: async (email: string, token: string, newPassword: string): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>('/api/auth/reset-password', {
      email,
      token,
      newPassword,
    });
    return response.data;
  },
  verifyEmail: async (email: string, token: string): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>('/api/auth/verify-email', {
      email,
      token,
    });
    return response.data;
  },
  resendVerification: async (email: string): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>('/api/auth/resend-verification', {
      email,
    });
    return response.data;
  },
};

// API de usuário
export const userApi = {
  getMyProfile: async (params?: { scope?: 'basic' | 'full' }) => {
    const scope = params?.scope || 'basic';
    const response = await api.get<ApiResponse<any>>(`/api/users/profile?scope=${scope}`);
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
  getUserProfile: async (username: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/users/${username}`);
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
    const response = await api.put<ApiResponse<any>>('/api/users/status', statusData);
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

  getPost: async (postId: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/posts/${postId}`);
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

  updatePost: async (
    postId: string,
    data: {
      content?: string;
      imageUrl?: string | null;
      visibility?: string;
      category?: string;
    },
    options?: { adminSessionToken?: string | null }
  ) => {
    const headers: Record<string, string> = {};
    if (options?.adminSessionToken) {
      headers['x-admin-session-token'] = options.adminSessionToken;
    }
    const response = await api.put<ApiResponse<any>>(`/api/posts/${postId}`, data, { headers });
    return response.data;
  },

  getAnalytics: async (page = 1, limit = 10, sortBy: 'recent' | 'most-viewed' | 'most-engagement' | 'most-comments' | 'most-reactions' = 'recent') => {
    const response = await api.get<ApiResponse<any>>(`/api/posts/analytics?page=${page}&limit=${limit}&sortBy=${sortBy}`);
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

  deletePost: async (postId: string, options?: { adminSessionToken?: string | null }) => {
    const headers: Record<string, string> = {};
    if (options?.adminSessionToken) {
      headers['x-admin-session-token'] = options.adminSessionToken;
    }
    const response = await api.post<ApiResponse<any>>(`/api/posts/${postId}/delete`, {}, { headers });
    return response.data;
  },

  sharePost: async (postId: string, shareComment?: string, visibility?: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/posts/${postId}/share`, {
      shareComment: shareComment || null,
      visibility: visibility || 'PUBLIC',
    });
    return response.data;
  },

  reportPost: async (postId: string, data: {
    category: string;
    description: string;
    targetUsername?: string;
  }) => {
    const formData = new FormData();
    formData.append('targetId', postId);
    formData.append('targetType', 'POST');
    formData.append('targetUsername', data.targetUsername || '');
    formData.append('category', data.category);
    formData.append('description', data.description);

    const response = await api.post<ApiResponse<any>>('/api/reports', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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

  sendMessage: async (data: { 
    recipientId: string; 
    content: string; 
    type?: 'text' | 'image' | 'document';
    imageUrl?: string | null;
    documentUrl?: string | null;
    documentName?: string | null;
    documentSize?: number | null;
    storyReply?: {
      storyId: string;
      mediaUrl: string;
      mediaType: 'image' | 'video' | 'gif';
    } | null;
  }) => {
    const response = await api.post<ApiResponse<any>>('/api/messages', {
      recipientId: data.recipientId,
      content: data.content,
      type: data.type || 'text',
      imageUrl: data.imageUrl || null,
      documentUrl: data.documentUrl || null,
      documentName: data.documentName || null,
      documentSize: data.documentSize || null,
      storyReply: data.storyReply || null,
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

  searchMessages: async (query: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/messages/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get<ApiResponse<{ count: number }>>('/api/messages/unread-count');
    return response.data;
  },

  uploadImage: async (imageUri: string, recipientId: string) => {
    const token = await AsyncStorage.getItem('token');
    const userId = await AsyncStorage.getItem('userId');
    const formData = new FormData();
    
    // Criar objeto de arquivo compatível
    const imageFile = {
      uri: imageUri,
      type: 'image/jpeg',
      name: `image_${Date.now()}.jpg`,
    };
    
    formData.append('image', imageFile as any);
    if (userId) {
      formData.append('senderId', userId);
    }
    formData.append('recipientId', recipientId);

    const response = await axios.post<ApiResponse<{ imageUrl: string }>>(
      `${API_CONFIG.BASE_URL}/api/messages/upload-image`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      }
    );
    return response.data;
  },

  uploadDocument: async (documentUri: string, documentName: string, mimeType: string, recipientId: string) => {
    const token = await AsyncStorage.getItem('token');
    const formData = new FormData();
    
    // Criar objeto de arquivo compatível
    const documentFile = {
      uri: documentUri,
      type: mimeType,
      name: documentName,
    };
    
    formData.append('document', documentFile as any);
    formData.append('recipientId', recipientId);

    const response = await axios.post<ApiResponse<{ 
      documentUrl: string;
      fileName: string;
      fileSize: number;
    }>>(
      `${API_CONFIG.BASE_URL}/api/messages/upload-document`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000,
      }
    );
    return response.data;
  },
};

// API de Stories
export const storiesApi = {
  // Buscar stories do feed (agrupados por usuário) - usado no feed principal
  getStoriesFeed: async (page = 1, limit = 10) => {
    const response = await api.get<ApiResponse<any>>(`/api/stories/feed?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Buscar stories de um usuário específico - usado em perfis
  getStoriesByUser: async (userId?: string) => {
    const url = userId 
      ? `/api/stories?userId=${userId}`
      : '/api/stories'; // Se não passar userId, retorna stories do usuário atual
    const response = await api.get<ApiResponse<any>>(url);
    return response.data;
  },

  // Buscar um story específico por ID
  getStory: async (storyId: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/stories/${storyId}`);
    return response.data;
  },

  // Verificar limite de stories ativos do usuário
  checkStoriesLimit: async () => {
    const response = await api.get<ApiResponse<any>>('/api/stories?checkLimit=true');
    return response.data;
  },

  uploadStoryMedia: async (fileUri: string, fileName: string, fileType: string, fileSize?: number, startTime?: number, duration?: number) => {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('Token de autenticação não encontrado. Faça login novamente.');
    }
    
    try {
      // 1. Obter tamanho do arquivo se não fornecido
      let actualFileSize = fileSize;
      if (!actualFileSize || actualFileSize === 0) {
        try {
          const response = await fetch(fileUri);
          const blob = await response.blob();
          actualFileSize = blob.size;
        } catch (error) {
          console.error('[uploadStoryMedia] Erro ao obter tamanho do arquivo:', error);
          throw new Error('Não foi possível determinar o tamanho do arquivo');
        }
      }

      // Validar tamanho mínimo
      if (!actualFileSize || actualFileSize === 0) {
        throw new Error('Tamanho do arquivo inválido');
      }

      // Normalizar tipo de arquivo (garantir lowercase)
      // O backend aceita tanto image/jpg quanto image/jpeg, então manter como está
      let normalizedFileType = fileType.toLowerCase().trim();

      // 2. Obter presigned URL
      // Usar query string manual para garantir que os parâmetros sejam enviados corretamente no React Native
      // IMPORTANTE: NÃO usar encodeURIComponent aqui.
      // URLSearchParams já faz encoding; encodar manualmente vira double-encoding (ex: image%252Fjpeg)
      // e o backend recebe fileType inválido (ex: image%2Fjpeg) e rejeita.
      const queryParams = new URLSearchParams();
      queryParams.append('fileName', fileName);
      queryParams.append('fileType', normalizedFileType);
      queryParams.append('fileSize', actualFileSize.toString());
      
      const url = `/api/stories/upload-presigned?${queryParams.toString()}`;
      const fullUrl = `${API_CONFIG.BASE_URL}${url}`;
      
      // O interceptor já adiciona o token automaticamente, não precisa adicionar manualmente
      try {
        const presignedResponse = await api.get<any>(url);

        // A API retorna { success: true, presignedUrl, fileKey, fileUrl, metadata }
        // O axios coloca a resposta em response.data
        if (!presignedResponse || !presignedResponse.data) {
          throw new Error('Resposta inválida do servidor');
        }

        if (!presignedResponse.data.success) {
          const errorMessage = presignedResponse.data?.message || presignedResponse.data?.error || 'Erro ao obter URL de upload';
          throw new Error(errorMessage);
        }

        if (!presignedResponse.data.presignedUrl) {
          throw new Error('URL de upload não foi retornada pelo servidor');
        }

        // 3. Fazer upload direto ao S3
        // No React Native, precisamos usar XMLHttpRequest para uploads de arquivos locais
        // porque fetch() pode não funcionar corretamente com URIs locais (file://, content://)
        let fileBlob: Blob;
        try {
          // Tentar usar fetch primeiro
          const response = await fetch(fileUri);
          fileBlob = await response.blob();
          
          // Verificar se o blob tem tamanho válido
          if (!fileBlob || fileBlob.size === 0) {
            throw new Error('Blob vazio ou inválido');
          }
        } catch (fetchError) {
          console.error('[uploadStoryMedia] Erro ao criar blob com fetch, tentando XMLHttpRequest:', fetchError);
          // Fallback: usar XMLHttpRequest para ler o arquivo
          fileBlob = await new Promise<Blob>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', fileUri, true);
            xhr.responseType = 'blob';
            xhr.onload = () => {
              if (xhr.status === 200 || xhr.status === 0) {
                resolve(xhr.response);
              } else {
                reject(new Error(`Erro ao ler arquivo: ${xhr.status}`));
              }
            };
            xhr.onerror = () => reject(new Error('Erro de rede ao ler arquivo'));
            xhr.send();
          });
        }
        
        // Verificar se o tamanho do blob corresponde ao tamanho esperado
        if (fileBlob.size === 0) {
          throw new Error('Arquivo está vazio ou não foi lido corretamente');
        }
        
        if (fileBlob.size !== actualFileSize && fileBlob.size < actualFileSize * 0.9) {
          console.error('[uploadStoryMedia] AVISO: Tamanho do blob difere do esperado:', {
            blobSize: fileBlob.size,
            expectedSize: actualFileSize,
            difference: actualFileSize - fileBlob.size,
          });
        }
        
        // CRÍTICO: No React Native, axios pode não enviar blobs corretamente para S3
        // Usar XMLHttpRequest diretamente para garantir que o arquivo seja enviado corretamente
        const s3UploadResponse = await new Promise<{ status: number; headers: any }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.open('PUT', presignedResponse.data.presignedUrl, true);
          xhr.setRequestHeader('Content-Type', normalizedFileType);
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({
                status: xhr.status,
                headers: {
                  'content-length': xhr.getResponseHeader('content-length'),
                  'etag': xhr.getResponseHeader('etag'),
                },
              });
            } else {
              reject(new Error(`Erro ao fazer upload para S3: ${xhr.status} ${xhr.statusText}`));
            }
          };
          
          xhr.onerror = () => {
            console.error('[uploadStoryMedia] Erro no XMLHttpRequest:', {
              status: xhr.status,
              statusText: xhr.statusText,
            });
            reject(new Error(`Erro ao fazer upload para S3: ${xhr.statusText || 'Erro desconhecido'}`));
          };
          
          xhr.ontimeout = () => {
            reject(new Error('Timeout ao fazer upload para S3'));
          };
          
          xhr.timeout = 600000; // 10 minutos
          
          // Enviar o blob diretamente
          xhr.send(fileBlob);
        });
        
        if (s3UploadResponse.status !== 200) {
          throw new Error(`Erro ao fazer upload para S3: status ${s3UploadResponse.status}`);
        }

        // 4. Registrar upload no backend
        const formData = new FormData();
        formData.append('fileUrl', presignedResponse.data.fileUrl);
        formData.append('fileName', fileName);
        
        // Se for vídeo, adicionar parâmetros de corte
        if (fileType.startsWith('video/') && startTime !== undefined && duration !== undefined) {
          formData.append('startTime', startTime.toString());
          formData.append('duration', duration.toString());
        }

        // Usar a instância api para garantir que o interceptor adicione o token
        const response = await api.post('/api/stories/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        return response.data;
      } catch (axiosError: any) {
        // Tratamento específico para erros de rede
        if (axiosError.message === 'Network Error' || axiosError.code === 'ERR_NETWORK' || axiosError.code === 'ECONNABORTED') {
          console.error('[uploadStoryMedia] Erro de rede:', {
            url: fullUrl,
            baseURL: API_CONFIG.BASE_URL,
            hasToken: !!token,
            error: axiosError.message,
            code: axiosError.code,
            response: axiosError.response?.data,
          });
          throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
        }
        
        // Se for erro de resposta do servidor, extrair mensagem
        if (axiosError.response) {
          const errorMessage = axiosError.response.data?.message || axiosError.response.data?.error || 'Erro ao obter URL de upload';
          throw new Error(errorMessage);
        }
        
        // Re-lançar outros erros
        throw axiosError;
      }
    } catch (error: any) {
      console.error('[uploadStoryMedia] Erro:', error);
      // Se já for um Error com mensagem, re-lançar
      if (error instanceof Error) {
        throw error;
      }
      // Caso contrário, criar um novo Error
      throw new Error(error?.message || 'Erro desconhecido ao fazer upload');
    }
  },
  getPresignedStoryUploadUrl: async (fileName: string, fileType: string, fileSize: number) => {
    const response = await api.get<ApiResponse<{
      presignedUrl: string;
      fileKey: string;
      fileUrl: string;
      metadata: any;
    }>>('/api/stories/upload-presigned', {
      params: {
        fileName,
        fileType,
        fileSize,
      },
    });
    return response.data;
  },

  createStory: async (data: {
    content: {
      type: 'image' | 'video' | 'gif';
      mediaUrl: string;
      text?: string | null;
      elements?: Array<{
        type: 'text' | 'music';
        content: string;
        x: number;
        y: number;
        fontSize?: number;
        color?: string;
        backgroundColor?: string;
        strokeColor?: string;
        fontWeight?: 'normal' | 'bold';
      }> | null;
      zoom?: number;
      panX?: number;
      panY?: number;
    };
    visibility?: 'followers' | 'friends' | 'public';
    duration?: number;
  }) => {
    const response = await api.post<ApiResponse<any>>('/api/stories', data);
    return response.data;
  },

  deleteStory: async (storyId: string, options?: { adminSessionToken?: string | null }) => {
    const headers: Record<string, string> = {};
    if (options?.adminSessionToken) {
      headers['x-admin-session-token'] = options.adminSessionToken;
    }
    const response = await api.delete<ApiResponse<any>>(`/api/stories/${storyId}`, { headers });
    return response.data;
  },

  patchStoryVisibility: async (
    storyId: string,
    visibility: 'public' | 'followers' | 'friends',
    options?: { adminSessionToken?: string | null }
  ) => {
    const headers: Record<string, string> = {};
    if (options?.adminSessionToken) {
      headers['x-admin-session-token'] = options.adminSessionToken;
    }
    const response = await api.patch<ApiResponse<any>>(
      `/api/stories/${storyId}`,
      { visibility },
      { headers }
    );
    return response.data;
  },

  // Marcar story como visualizado
  viewStory: async (storyId: string) => {
    const response = await api.put<ApiResponse<any>>(`/api/stories/${storyId}`, {});
    return response.data;
  },

  // Denunciar story
  reportStory: async (storyId: string, data: { category?: string; description?: string }) => {
    const response = await api.post<ApiResponse<any>>(`/api/stories/${storyId}/report`, {
      reason: data.category || 'OTHER',
      description: data.description || 'Denúncia de story',
    });
    return response.data;
  },

  // Reagir ao story
  reactToStory: async (storyId: string, reactionType: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/stories/${storyId}/reactions`, {
      type: reactionType,
    });
    return response.data;
  },

  // Buscar reações do story
  getStoryReactions: async (storyId: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/stories/${storyId}/reactions`);
    return response.data;
  },
};

// API de Pagamentos
export const paymentApi = {
  createCheckoutSession: async (planName: string, gateway?: 'STRIPE' | 'MERCADOPAGO') => {
    try {
      const response = await api.post<any>('/api/payments/create-checkout', {
        plano: planName.toUpperCase(), // STARTER, PRO, PRO_PLUS
        ...(gateway && { gateway }),
      });
      
      // A API retorna { url, gateway } diretamente (sem success ou data)
      // Vamos normalizar para o formato esperado pelo componente
      if (response.data.url) {
        // Formato direto: { url, gateway }
        return {
          success: true,
          data: {
            url: response.data.url,
            gateway: response.data.gateway
          }
        };
      } else if (response.data.success && response.data.data?.url) {
        // Formato ApiResponse: { success: true, data: { url, gateway } }
        return response.data;
      } else if (response.data.success && response.data.url) {
        // Formato alternativo: { success: true, url, gateway }
        return {
          success: true,
          data: {
            url: response.data.url,
            gateway: response.data.gateway
          }
        };
      }
      
      // Retornar a resposta como está, mas garantir que tenha a estrutura esperada
      return {
        success: false,
        data: response.data
      };
    } catch (error) {
      console.error('[paymentApi] Erro ao criar sessão de checkout:', error);
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
      usernameDisplayEffect?: UsernameDisplayEffectConfig | null;
      statusMessageTextColor?: string | null;
      statusMessageContainerBg?: string | null;
      statusMessageBubbleBg?: string | null;
      statusMessageDisplayEffect?: UsernameDisplayEffectConfig | null;
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

/** Dicas / campanhas da plataforma no feed (alinhado ao web `usePlatformFeedInfo`). */
export const platformFeedInfoApi = {
  getItems: async () => {
    const response = await api.get<ApiResponse<{ items: PlatformFeedInfoItem[] }>>('/api/platform-feed-info');
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
  // Promoções - Gerenciamento de Campanhas
  listMyAds: async () => {
    const response = await api.get<ApiResponse<any[]>>('/api/ads/list?myAds=true');
    return response.data;
  },
  createAd: async (payload: any) => {
    const response = await api.post<ApiResponse<any>>('/api/ads/create', payload);
    return response.data;
  },
  reactivateAd: async (adId: string, payload: any) => {
    const response = await api.post<ApiResponse<any>>(`/api/ads/reactivate/${adId}`, payload);
    return response.data;
  },
  extendAd: async (adId: string, days: number) => {
    const response = await api.post<ApiResponse<any>>(`/api/ads/extend/${adId}`, { days });
    return response.data;
  },
  deleteAd: async (adId: string) => {
    const response = await api.delete<ApiResponse<any>>(`/api/ads/delete/${adId}`);
    return response.data;
  },
  uploadMedia: async (fileUri: string) => {
    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'media';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('file', {
      uri: fileUri,
      name: filename,
      type,
    } as any);

    const response = await axios.post(`${API_CONFIG.BASE_URL}/api/ads/upload-media`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    });
    
    return response.data;
  },
  getCampaignConfig: async () => {
    const response = await api.get<ApiResponse<any>>('/api/ads/campaign-config');
    return response.data;
  },
  getHistory: async () => {
    const response = await api.get<ApiResponse<any[]>>('/api/ads/history');
    return response.data;
  },
  clearHistory: async () => {
    const response = await api.delete<ApiResponse<any>>('/api/ads/history/clear');
    return response.data;
  },
};

// API de Carteira
export const walletApi = {
  getBalance: async () => {
    const response = await api.get<ApiResponse<{
      balance: number;
      totalEarned: number;
      totalSpent: number;
      username: string;
    }>>('/api/wallet/balance');
    return response.data;
  },
  getTransactions: async (type: string = 'all', limit: number = 50) => {
    const response = await api.get<ApiResponse<{
      transactions: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>>(`/api/wallet/transactions?type=${type}&limit=${limit}`);
    return response.data;
  },
  createCheckout: async (data: {
    packageType?: string;
    provider: 'STRIPE' | 'MERCADOPAGO';
    customAmount?: number;
  }) => {
    const response = await api.post<ApiResponse<{
      checkoutUrl: string;
      gateway: string;
    }>>('/api/wallet/create-checkout', data);
    return response.data;
  },
  requestWithdrawal: async (data: {
    amount: number;
    pixKey: string;
    pixKeyType: string;
    personalData: {
      fullName: string;
      cpf: string;
      address: {
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        zipCode?: string;
      };
      phone?: string;
      email?: string;
    };
  }) => {
    const response = await api.post<ApiResponse<any>>('/api/wallet/withdraw', data);
    return response.data;
  },
  getPaymentStatus: async (paymentId: string) => {
    const response = await api.get<ApiResponse<{
      status: string;
    }>>(`/api/mercadopago/payment-status?payment_id=${paymentId}`);
    return response.data;
  },
  getBalancePackages: async () => {
    const response = await api.get<ApiResponse<any[]>>('/api/balance-packages/public');
    return response.data;
  },
  getCustomDepositFee: async () => {
    const response = await api.get<ApiResponse<{
      customDepositFeePercentage: number;
    }>>('/api/settings/fees/custom-deposit-fee');
    return response.data;
  },
  getFees: async () => {
    const response = await api.get<ApiResponse<{
      fees: {
        customDepositFeePercentage: number;
        depositFeePercentage: number;
        donationFeePercentage: number;
        productSaleFeePercentage: number;
        planPurchaseFeePercentage: number;
        minimumWithdrawal: number;
        maximumWithdrawal: number;
        maximumDailyWithdrawals: number;
        withdrawalFeeType: 'percentage' | 'fixed';
        withdrawalFee: number;
      };
      lastUpdated?: string | Date;
    }>>('/api/public/fees');
    return response.data;
  },
  getWithdrawalFees: async () => {
    const response = await api.get<ApiResponse<{
      fees: {
        minimumWithdrawal: number;
        maximumWithdrawal: number;
        withdrawalFeeType: 'percentage' | 'fixed';
        withdrawalFee: number;
      };
    }>>('/api/public/fees');
    return response.data;
  },
  donate: async (data: { recipientUsername: string; amount: number; message?: string }) => {
    const response = await api.post<ApiResponse<{
      grossAmount: number;
      platformFee: number;
      netAmount: number;
      feePercentage: number;
      recipient: string;
      newBalance: number;
    }>>('/api/wallet/donate', data);
    return response.data;
  },
};

// API de Lojas (Shops)
export const shopsApi = {
  getProducts: async (params: {
    page?: number;
    limit?: number;
    categoryId?: string;
    search?: string;
    sortBy?: 'createdAt' | 'price' | 'salesCount';
    sortOrder?: 'asc' | 'desc';
    showAdultContent?: boolean;
    sellerUsername?: string;
    onlyPurchased?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.categoryId && params.categoryId !== 'all') {
      queryParams.append('categoryId', params.categoryId);
    }
    if (params.search && params.search.trim()) {
      queryParams.append('search', params.search.trim());
    }
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.showAdultContent !== undefined) {
      queryParams.append('showAdultContent', String(params.showAdultContent));
    }
    if (params.sellerUsername && params.sellerUsername !== 'all') {
      queryParams.append('sellerUsername', params.sellerUsername);
    }
    if (params.onlyPurchased) {
      queryParams.append('onlyPurchased', 'true');
    }

    const response = await api.get<ApiResponse<any>>(`/api/shops/products?${queryParams.toString()}`);
    return response.data;
  },
};

// Pedidos / checkout de produto único (saldo na carteira)
export const ordersApi = {
  checkoutProduct: async (productId: string, quantity: number = 1) => {
    const response = await api.post<ApiResponse<any>>('/api/orders/checkout', {
      productId,
      quantity,
    });
    return response.data;
  },
};

// API de Configurações da Loja
export const shopApi = {
  getSettings: async () => {
    const response = await api.get<ApiResponse<{
      isEnabled: boolean;
      visibility: 'public' | 'preview' | 'friends' | 'followers';
      saleNotifications: boolean;
      sellerVerification?: any;
    }>>('/api/users/shop/settings');
    return response.data;
  },
  updateSettings: async (data: {
    isEnabled?: boolean;
    visibility?: 'public' | 'preview' | 'friends' | 'followers';
    saleNotifications?: boolean;
  }) => {
    const response = await api.put<ApiResponse<any>>('/api/users/shop/settings', data);
    return response.data;
  },
  deleteShop: async () => {
    const response = await api.delete<ApiResponse<any>>('/api/users/shop/settings');
    return response.data;
  },
};

// API de Verificação de Vendedor
export const sellerVerificationApi = {
  getVerification: async () => {
    const response = await api.get<ApiResponse<any>>('/api/users/seller-verification');
    return response.data;
  },
  createVerification: async (data: any) => {
    const response = await api.post<ApiResponse<any>>('/api/users/seller-verification', data);
    return response.data;
  },
  updateVerification: async (data: any) => {
    const response = await api.put<ApiResponse<any>>('/api/users/seller-verification', data);
    return response.data;
  },
  submitAppeal: async (appealReason: string) => {
    const response = await api.post<ApiResponse<any>>('/api/users/seller-verification/appeal', {
      appealReason,
    });
    return response.data;
  },
  getPresignedUploadUrl: async (fileName: string, fileType: string, fileSize: number, documentType: 'front' | 'back' | 'selfie') => {
    const response = await api.get<ApiResponse<{
      presignedUrl: string;
      fileKey: string;
      fileUrl: string;
      metadata: any;
    }>>('/api/users/seller-verification/upload-presigned', {
      params: {
        fileName,
        fileType,
        fileSize,
        documentType,
      },
    });
    return response.data;
  },
};

// API de Produtos
export const productsApi = {
  getProducts: async (params?: {
    username?: string;
    isActive?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.username) queryParams.append('username', params.username);
    if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
    
    const url = `/api/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get<ApiResponse<any[]>>(url);
    return response.data;
  },
  getProduct: async (productId: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/products/${productId}`);
    return response.data;
  },
  createProduct: async (data: any) => {
    const response = await api.post<ApiResponse<any>>('/api/products', data);
    return response.data;
  },
  updateProduct: async (productId: string, data: any) => {
    const response = await api.patch<ApiResponse<any>>(`/api/products/${productId}`, data);
    return response.data;
  },
  deleteProduct: async (productId: string) => {
    const response = await api.patch<ApiResponse<any>>(`/api/products/${productId}`, {
      status: 'INACTIVE',
    });
    return response.data;
  },
  getPurchaseStatus: async (productId: string) => {
    const response = await api.get<ApiResponse<{
      hasPurchased: boolean;
      canPurchase: boolean;
      isActive?: boolean;
      expiresAt?: string;
      orderId?: string;
      accessVia?: 'DIRECT_PURCHASE' | 'SUBSCRIPTION_PLAN';
      subscriptionPlanId?: string;
    }>>(`/api/products/${productId}/purchase-status`);
    return response.data;
  },
  uploadFile: async (productId: string, fileData: FormData, onUploadProgress?: (progress: number) => void) => {
    const token = await AsyncStorage.getItem('token');
    const response = await axios.post(`${API_CONFIG.BASE_URL}/api/products/upload-file`, fileData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        // Não definir Content-Type manualmente - axios faz isso automaticamente com boundary
      },
      timeout: 300000, // 5 minutos para uploads grandes
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onUploadProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(progress);
        }
      },
    });
    return response.data;
  },
  getPresignedUploadUrl: async (productId: string, fileName: string, fileType: string, fileSize: number, order: number = 0) => {
    const token = await AsyncStorage.getItem('token');
    const response = await api.get<ApiResponse<{
      presignedUrl: string;
      fileKey: string;
      fileUrl: string;
      metadata: any;
    }>>(`/api/products/upload-presigned`, {
      params: {
        productId,
        fileName,
        fileType,
        fileSize,
        order,
      },
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  },
  registerFile: async (productId: string, fileUrl: string, fileName: string, fileType: string, fileSize: number, customFileName?: string, description?: string, order: number = 0) => {
    const response = await api.post<ApiResponse<any>>(`/api/products/register-file`, {
      productId,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      customFileName,
      description,
      order,
    });
    return response.data;
  },
  deleteFile: async (productId: string, fileId: string) => {
    const response = await api.delete<ApiResponse<any>>(`/api/products/${productId}/files/${fileId}`);
    return response.data;
  },
};

// API de Categorias
export const categoriesApi = {
  getCategories: async (username?: string) => {
    const queryParams = new URLSearchParams();
    if (username) queryParams.append('username', username);
    
    const url = `/api/categories${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get<ApiResponse<any[]>>(url);
    return response.data;
  },
};

// API de Planos de Assinatura
export const subscriptionPlansApi = {
  getPlans: async () => {
    const response = await api.get<ApiResponse<any[]>>('/api/subscription-plans');
    return response.data;
  },
  getShopPlans: async (username: string) => {
    const response = await api.get<ApiResponse<any[]>>(`/api/subscription-plans/shop/${username}`);
    return response.data;
  },
  getPlan: async (planId: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/subscription-plans/${planId}`);
    return response.data;
  },
  createPlan: async (data: any) => {
    const response = await api.post<ApiResponse<any>>('/api/subscription-plans', data);
    return response.data;
  },
  updatePlan: async (planId: string, data: any) => {
    const response = await api.put<ApiResponse<any>>(`/api/subscription-plans/${planId}`, data);
    return response.data;
  },
  deletePlan: async (planId: string) => {
    const response = await api.delete<ApiResponse<any>>(`/api/subscription-plans/${planId}`);
    return response.data;
  },
  getPlanProducts: async (planId: string) => {
    const response = await api.get<ApiResponse<any[]>>(`/api/subscription-plans/${planId}/products`);
    return response.data;
  },
  /** Compra de assinatura de plano da loja (corpo: durationMonths 1 | 2 | 3 | 6 | 12) */
  purchasePlanWithDuration: async (planId: string, durationMonths: 1 | 2 | 3 | 6 | 12) => {
    const response = await api.post<ApiResponse<any>>(
      `/api/subscriptions/plans/${planId}/purchase`,
      { durationMonths }
    );
    return response.data;
  },
  getMySubscriptionStatusForPlan: async (planId: string) => {
    const response = await api.get<ApiResponse<{
      hasActiveSubscription: boolean;
      isCancelled?: boolean;
      daysRemaining?: number;
      expiresAt?: string | null;
      orderId?: string | null;
    }>>(`/api/subscriptions/plans/${planId}/status`);
    return response.data;
  },
};

// API de Analytics da Loja
export const shopAnalyticsApi = {
  getAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
    productId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.productId) queryParams.append('productId', params.productId);
    
    const url = `/api/shop/analytics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get<ApiResponse<any>>(url);
    return response.data;
  },
};

// API de Comunidade da Loja
export const shopCommunityApi = {
  getComments: async () => {
    const response = await api.get<ApiResponse<{
      comments: any[];
    }>>('/api/shop/comments/moderation');
    return response.data;
  },
  approveComment: async (productId: string, commentId: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/products/${productId}/comments/${commentId}/moderate`, {
      status: 'APPROVED',
    });
    return response.data;
  },
  rejectComment: async (productId: string, commentId: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/products/${productId}/comments/${commentId}/moderate`, {
      status: 'REJECTED',
    });
    return response.data;
  },
  deleteComment: async (productId: string, fileId: string, commentId: string) => {
    const response = await api.delete<ApiResponse<any>>(`/api/products/${productId}/files/${fileId}/comments/${commentId}`);
    return response.data;
  },
  getLikes: async () => {
    const response = await api.get<ApiResponse<{
      likesByProduct: any[];
    }>>('/api/shop/products/likes');
    return response.data;
  },
};

// API de Referrals (Indique e Ganhe)
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
};
