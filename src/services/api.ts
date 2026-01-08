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
  getFollowers: async (username: string) => {
    const response = await api.get<ApiResponse<any[]>>(`/api/users/${username}/followers`);
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

  updatePost: async (postId: string, data: {
    content?: string;
    imageUrl?: string | null;
    visibility?: string;
    category?: string;
  }) => {
    const response = await api.put<ApiResponse<any>>(`/api/posts/${postId}`, data);
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

  deletePost: async (postId: string) => {
    // Usamos POST como fallback para garantir compatibilidade em mobile
    const response = await api.post<ApiResponse<any>>(`/api/posts/${postId}/delete`);
    return response.data;
  },

  sharePost: async (postId: string, shareComment?: string, visibility?: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/posts/${postId}/share`, {
      shareComment: shareComment || null,
      visibility: visibility || 'PUBLIC',
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

  uploadStoryMedia: async (fileUri: string, fileName: string, fileType: string) => {
    const token = await AsyncStorage.getItem('token');
    
    try {
      // 1. Obter presigned URL
      const presignedResponse = await api.get<ApiResponse<{
        presignedUrl: string;
        fileKey: string;
        fileUrl: string;
        metadata: any;
      }>>('/api/stories/upload-presigned', {
        params: {
          fileName,
          fileType,
          fileSize: 0, // Tamanho será validado no upload
        },
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!presignedResponse.data.success || !presignedResponse.data.data) {
        throw new Error(presignedResponse.data.message || 'Erro ao obter URL de upload');
      }

      // 2. Fazer upload direto ao S3
      const fileBlob = await fetch(fileUri).then(res => res.blob());
      
      await axios.put(presignedResponse.data.data.presignedUrl, fileBlob, {
        headers: {
          'Content-Type': fileType,
        },
        timeout: 600000, // 10 minutos para uploads grandes
      });

      // 3. Registrar upload no backend
      const formData = new FormData();
      formData.append('fileUrl', presignedResponse.data.data.fileUrl);
      formData.append('fileName', fileName);

      const response = await axios.post(`${API_CONFIG.BASE_URL}/api/stories/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      return response.data;
    } catch (error: any) {
      console.error('[uploadStoryMedia] Erro:', error);
      throw error;
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

  deleteStory: async (storyId: string) => {
    const response = await api.delete<ApiResponse<any>>(`/api/stories/${storyId}`);
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
    const response = await api.put<ApiResponse<any>>(`/api/products/${productId}`, data);
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
  purchasePlan: async (planId: string, duration: 'oneMonth' | 'twoMonths' | 'threeMonths' | 'sixMonths' | 'oneYear') => {
    const response = await api.post<ApiResponse<any>>(`/api/subscription-plans/${planId}/purchase`, {
      duration,
    });
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
