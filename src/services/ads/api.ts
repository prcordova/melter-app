import axios from 'axios';
import { api } from '../http-client';
import { API_CONFIG } from '../../config/api.config';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

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
