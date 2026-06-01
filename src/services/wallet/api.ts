import { api } from '../http-client';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

export const walletApi = {
  getBalance: async () => {
    const response = await api.get<ApiResponse<{
      balance: number;
      totalEarned: number;
      totalSpent: number;
      username: string;
    }>>('/api/wallet/balance');
    return response.data;
  },
  getTransactions: async (type: string = 'all', limit: number = 50) => {
    const response = await api.get<ApiResponse<{
      transactions: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>>(`/api/wallet/transactions?type=${type}&limit=${limit}`);
    return response.data;
  },
  createCheckout: async (data: {
    packageType?: string;
    provider: 'STRIPE' | 'MERCADOPAGO';
    customAmount?: number;
  }) => {
    const response = await api.post<ApiResponse<{
      checkoutUrl: string;
      sessionId?: string;
      provider: string;
      pendingDepositId?: string;
    }>>('/api/wallet/create-checkout', data);
    return response.data;
  },
  requestWithdrawal: async (data: {
    amount: number;
    pixKey: string;
    pixKeyType: string;
    personalData: {
      fullName: string;
      cpf: string;
      address: {
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        zipCode?: string;
      };
      phone?: string;
      email?: string;
    };
  }) => {
    const response = await api.post<ApiResponse<any>>('/api/wallet/withdraw', data);
    return response.data;
  },
  getPaymentStatus: async (paymentId: string, options?: { confirm?: boolean }) => {
    const confirm = options?.confirm ? '&confirm=true' : '';
    const response = await api.get<ApiResponse<{
      status: string;
      confirmation?: { outcome?: string };
    }>>(`/api/mercadopago/payment-status?payment_id=${encodeURIComponent(paymentId)}${confirm}`);
    return response.data;
  },
  syncPendingDeposit: async (pendingDepositId: string) => {
    const response = await api.post<ApiResponse<{ outcome?: string }>>(
      '/api/mercadopago/sync-pending-deposit',
      { pendingDepositId }
    );
    return response.data;
  },
  getBalancePackages: async () => {
    const response = await api.get<ApiResponse<any[]>>('/api/balance-packages/public');
    return response.data;
  },
  getCustomDepositFee: async () => {
    const response = await api.get<ApiResponse<{
      customDepositFeePercentage: number;
    }>>('/api/settings/fees/custom-deposit-fee');
    return response.data;
  },
  getFees: async () => {
    const response = await api.get<ApiResponse<{
      fees: {
        customDepositFeePercentage: number;
        depositFeePercentage: number;
        donationFeePercentage: number;
        productSaleFeePercentage: number;
        planPurchaseFeePercentage: number;
        minimumWithdrawal: number;
        maximumWithdrawal: number;
        maximumDailyWithdrawals: number;
        withdrawalFeeType: 'percentage' | 'fixed';
        withdrawalFee: number;
      };
      lastUpdated?: string | Date;
    }>>('/api/public/fees');
    return response.data;
  },
  getWithdrawalFees: async () => {
    const response = await api.get<ApiResponse<{
      fees: {
        minimumWithdrawal: number;
        maximumWithdrawal: number;
        withdrawalFeeType: 'percentage' | 'fixed';
        withdrawalFee: number;
      };
    }>>('/api/public/fees');
    return response.data;
  },
  donate: async (data: { recipientUsername: string; amount: number; message?: string }) => {
    const response = await api.post<ApiResponse<{
      grossAmount: number;
      platformFee: number;
      netAmount: number;
      feePercentage: number;
      recipient: string;
      newBalance: number;
    }>>('/api/wallet/donate', data);
    return response.data;
  },
};

// API de Lojas (Shops)
