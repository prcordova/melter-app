import { api } from '../http-client';
import { SHOP_API } from '../../config/shops/api-paths';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

export const shopCommunityApi = {
  getComments: async () => {
    const response = await api.get<ApiResponse<{
      comments: any[];
    }>>(SHOP_API.me.commentsModeration);
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
    }>>(SHOP_API.me.likes);
    return response.data;
  },
};


