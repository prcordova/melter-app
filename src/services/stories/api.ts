import { api } from '../http-client';
import { getAuthToken } from '../../lib/auth-token';
import { API_CONFIG } from '../../config/api.config';
import {
  getLocalFileSize,
  putLocalFileToPresignedUrl,
} from '../../utils/presigned-upload';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

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
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('Token de autenticação não encontrado. Faça login novamente.');
    }
    
    try {
      const normalizedFileType = fileType.toLowerCase().trim();
      // Nunca confiar em fetch(fileUri).blob() no Android — pode gravar "File not found" no S3.
      const actualFileSize = fileSize && fileSize > 0 ? fileSize : await getLocalFileSize(fileUri);

      const queryParams = new URLSearchParams();
      queryParams.append('fileName', fileName);
      queryParams.append('fileType', normalizedFileType);
      queryParams.append('fileSize', actualFileSize.toString());
      
      const url = `/api/stories/upload-presigned?${queryParams.toString()}`;
      const fullUrl = `${API_CONFIG.BASE_URL}${url}`;
      
      try {
        const presignedResponse = await api.get<any>(url);

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

        await putLocalFileToPresignedUrl(
          presignedResponse.data.presignedUrl,
          fileUri,
          normalizedFileType
        );

        const storageKey: string | undefined =
          presignedResponse.data.fileKey || presignedResponse.data.storageKey;
        if (!storageKey) {
          throw new Error('Chave de armazenamento não retornada após upload');
        }
        const formData = new FormData();
        formData.append('fileUrl', storageKey);
        formData.append('fileName', fileName);
        
        if (fileType.startsWith('video/') && startTime !== undefined && duration !== undefined) {
          formData.append('startTime', startTime.toString());
          formData.append('duration', duration.toString());
        }

        const response = await api.post('/api/stories/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        return response.data;
      } catch (axiosError: any) {
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
        
        if (axiosError.response) {
          const errorMessage = axiosError.response.data?.message || axiosError.response.data?.error || 'Erro ao obter URL de upload';
          throw new Error(errorMessage);
        }
        
        throw axiosError;
      }
    } catch (error: any) {
      console.error('[uploadStoryMedia] Erro:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro desconhecido ao fazer upload');
    }
  },
  getPresignedStoryUploadUrl: async (fileName: string, fileType: string, fileSize: number) => {
    const response = await api.get<ApiResponse<{
      presignedUrl: string;
      fileKey: string;
      storageKey: string;
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

  /** Renova URL assinada da mídia (bucket privado; TTL ~15 min). Paridade com web StoriesViewer. */
  signMedia: async (storyId: string) => {
    const response = await api.post<ApiResponse<{
      mediaUrl: string;
      contentType?: string;
      storageKey?: string | null;
      storyContentType?: string;
      expiresInSeconds?: number;
    }>>(`/api/stories/${storyId}/media/sign`, {});
    return response.data;
  },
};

// API de Pagamentos
