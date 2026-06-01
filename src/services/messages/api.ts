import axios from 'axios';
import { api } from '../http-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../config/api.config';
import { MESSAGES_API } from '../../config/messages/api-paths';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

export const messageApi = {
  getConversations: async (params?: {
    limit?: number
    cursor?: string | null
    archived?: boolean
  }) => {
    const search = new URLSearchParams()
    if (params?.limit != null) search.set('limit', String(params.limit))
    if (params?.cursor) search.set('cursor', params.cursor)
    if (params?.archived != null) search.set('archived', params.archived ? 'true' : 'false')
    const qs = search.toString()
    const url = qs ? `${MESSAGES_API.conversations}?${qs}` : MESSAGES_API.conversations
    const response = await api.get<ApiResponse<any>>(url)
    return response.data
  },

  getMessages: async (userId: string, otherUserId: string, date?: string) => {
    const url = date
      ? MESSAGES_API.threadWithDate(userId, otherUserId, date)
      : MESSAGES_API.thread(userId, otherUserId);
    const response = await api.get<ApiResponse<any>>(url);
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
    asMessageRequest?: boolean;
    storyReply?: {
      storyId: string;
      mediaUrl: string;
      mediaType: 'image' | 'video' | 'gif';
    } | null;
  }) => {
    const response = await api.post<ApiResponse<any>>(MESSAGES_API.root, {
      recipientId: data.recipientId,
      content: data.content,
      type: data.type || 'text',
      imageUrl: data.imageUrl || null,
      documentUrl: data.documentUrl || null,
      documentName: data.documentName || null,
      documentSize: data.documentSize || null,
      storyReply: data.storyReply || null,
      ...(data.asMessageRequest ? { asMessageRequest: true } : {}),
    });
    return response.data;
  },

  markAsRead: async (senderId: string) => {
    const response = await api.post<ApiResponse<any>>(MESSAGES_API.markRead, { senderId });
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

  getRequestsInbox: async () => {
    const response = await api.get<
      ApiResponse<{
        items: Array<{
          friendshipId: string;
          requesterId: string;
          requesterUsername: string;
          requesterAvatar?: string;
          createdAt: string;
          hasMessageRequest: boolean;
          messagePreview?: string;
          messageRequestId?: string;
        }>;
        count: number;
        withMessageCount: number;
      }>
    >(MESSAGES_API.requestsInbox);
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
