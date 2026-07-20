import { api } from '../http-client';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

export const paymentApi = {
  createCheckoutSession: async (
    planName: string,
    gateway?: 'STRIPE' | 'MERCADOPAGO',
    billingInterval?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL',
    options?: { withTrial?: boolean }
  ) => {
    try {
      const response = await api.post<any>('/api/payments/create-checkout', {
        plano: planName.toUpperCase(), // STARTER, PRO, PRO_PLUS
        ...(gateway && { gateway }),
        ...(billingInterval && { billingInterval }),
        ...(options?.withTrial === true && { withTrial: true }),
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
