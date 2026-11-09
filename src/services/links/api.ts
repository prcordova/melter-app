import axios from 'axios';
import { api } from '../http-client';
import { getAuthToken } from '../../lib/auth-token';
import { API_CONFIG } from '../../config/api.config';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

export interface LinkPreviewData {
  url: string;
  title: string;
  description: string;
  image: string | null;
  favicon?: string | null;
  site: string;
  type: 'website' | 'youtube';
}

export const linksApi = {
  /** Metadados Open Graph / YouTube (mesma rota do web `useLinkPreview`). */
  getPreview: async (url: string) => {
    const response = await api.get<ApiResponse<LinkPreviewData>>(
      `/api/link-preview?url=${encodeURIComponent(url)}`
    );
    return response.data;
  },

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
    const token = await getAuthToken();
    
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
