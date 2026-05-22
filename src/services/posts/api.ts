import { api } from '../http-client';
import { API_CONFIG } from '../../config/api.config';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

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
