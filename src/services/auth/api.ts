import axios from 'axios';
import { api } from '../http-client';
import { API_CONFIG } from '../../config/api.config';
import { AUTH_API } from '../../config/auth/api-paths';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

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

      const response = await loginApi.post<LoginResult>(AUTH_API.login, {
        username,
        password,
        accessSource: 'app',
      });
      
      return response.data;
    } catch (error: any) {
      console.error('[API] Erro no login:', error.message);
      throw error;
    }
  },

  login2FA: async (tempToken: string, code: string): Promise<LoginResult> => {
    const response = await api.post<LoginResult>(AUTH_API.login2fa, {
      tempToken,
      code,
      accessSource: 'app',
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
    avatar: { uri: string; type: string; name: string };
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
    formData.append('avatar', {
      uri: userData.avatar.uri,
      type: userData.avatar.type,
      name: userData.avatar.name,
    } as any);

    // Não definir Content-Type manualmente: o axios precisa incluir o boundary do multipart.
    const response = await api.post<ApiResponse<any>>(AUTH_API.register, formData);
    return response.data;
  },
  forgotPassword: async (email: string): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>(AUTH_API.forgotPassword, { email });
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
    const response = await api.post<ApiResponse<any>>(AUTH_API.resetPassword, {
      email,
      token,
      newPassword,
    });
    return response.data;
  },
  verifyEmail: async (email: string, token: string): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>(AUTH_API.verifyEmail, {
      email,
      token,
    });
    return response.data;
  },
  resendVerification: async (email: string): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>(AUTH_API.resendVerification, {
      email,
    });
    return response.data;
  },
};

// API de usuário
