import { api } from '../http-client';
import { SHOP_API } from '../../config/shops/api-paths';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

export const sellerVerificationApi = {
  getVerification: async () => {
    const response = await api.get<ApiResponse<any>>(SHOP_API.verification.root);
    return response.data;
  },
  createVerification: async (data: any) => {
    const response = await api.post<ApiResponse<any>>(SHOP_API.verification.root, data);
    return response.data;
  },
  submitVerification: async (formData: FormData) => {
    const response = await api.post<ApiResponse<any>>(SHOP_API.verification.root, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    return response.data;
  },
  updateVerification: async (data: any) => {
    const response = await api.put<ApiResponse<any>>(SHOP_API.verification.root, data);
    return response.data;
  },
  submitAppeal: async (appealReason: string) => {
    const response = await api.post<ApiResponse<any>>(SHOP_API.verification.appeal, {
      appealReason,
    });
    return response.data;
  },
  getPresignedUploadUrl: async (fileName: string, fileType: string, fileSize: number, documentType: 'front' | 'back' | 'selfie' | 'videoProof') => {
    const response = await api.get<ApiResponse<{
      presignedUrl: string;
      fileKey: string;
      fileUrl: string;
      metadata: any;
    }>>(SHOP_API.verification.upload, {
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
