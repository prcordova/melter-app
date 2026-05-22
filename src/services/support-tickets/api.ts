import type { SupportTicket } from './types';
import { api } from '../http-client';
import type { ApiResponse } from '../shared/types';

export const supportTicketsApi = {
  /** GET /api/bugs — apenas tickets do usuário autenticado (filtro no servidor). */
  listMine: async (params?: { q?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.q?.trim()) searchParams.set('q', params.q.trim());
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    const qs = searchParams.toString();
    const response = await api.get<ApiResponse<SupportTicket[]>>(
      `/api/bugs${qs ? `?${qs}` : ''}`
    );
    return response.data;
  },

  /** GET /api/admin/bugs — conta admin apenas. */
  listAdmin: async (params?: { q?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.q?.trim()) searchParams.set('q', params.q.trim());
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    const qs = searchParams.toString();
    const response = await api.get<ApiResponse<SupportTicket[]>>(
      `/api/admin/bugs${qs ? `?${qs}` : ''}`
    );
    return response.data;
  },

  /** POST /api/bugs — multipart (opcional imagem). */
  create: async (payload: {
    title: string;
    description: string;
    page: string;
    pageOther?: string;
    priority: string;
    image?: { uri: string; type?: string; name?: string } | null;
  }) => {
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('description', payload.description);
    formData.append('page', payload.page);
    if (payload.pageOther?.trim()) {
      formData.append('pageOther', payload.pageOther.trim());
    }
    formData.append('priority', payload.priority);
    if (payload.image?.uri) {
      formData.append(
        'image',
        {
          uri: payload.image.uri,
          type: payload.image.type || 'image/jpeg',
          name: payload.image.name || `ticket_${Date.now()}.jpg`,
        } as any
      );
    }
    const response = await api.post<ApiResponse<SupportTicket>>('/api/bugs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// API de Referrals (Indique e Ganhe)
