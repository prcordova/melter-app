import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { api } from '../http-client';
import { SHOP_API } from '../../config/shops/api-paths';
import { API_CONFIG } from '../../config/api.config';
import type { ApiResponse } from '../shared/types';
import type { UsernameDisplayEffectConfig } from '../../types/username-display-effect';

export type ShopSettingsResponse = {
  isEnabled: boolean;
  visibility: 'public' | 'preview' | 'friends' | 'followers';
  saleNotifications: boolean;
  backgroundImage?: string | null;
  backgroundImageUrl?: string | null;
  backgroundMode?: 'full' | 'top';
  backgroundOverlay?: boolean;
  backgroundOverlayOpacity?: number;
  titleColor?: string | null;
  titleDisplayEffect?: UsernameDisplayEffectConfig | null;
  sellerVerification?: unknown;
};

export type ShopAppearanceUpdatePayload = {
  backgroundMode?: 'full' | 'top';
  backgroundOverlay?: boolean;
  backgroundOverlayOpacity?: number;
  titleColor?: string | null;
  titleDisplayEffect?: UsernameDisplayEffectConfig | null;
};

export type ShopPlanGate = {
  minPlanToCreateShop: string;
  canCreateShop: boolean;
  currentPlan: string;
  productStorageLimits: {
    maxProducts: number;
    maxFileSizePerFile: number;
    maxTotalFileSize: number;
    canUploadProductImages: boolean;
  };
  shopPlanMigration: {
    enabled: boolean;
    deadlineAt: string | null;
    bannerEnabled: boolean;
    noticeDays: number;
    enforceAfterDeadline: boolean;
  };
};

export type ShopOnboardingContextResponse = {
  shop: ShopSettingsResponse;
  platformPurposes?: string[];
  sellerVerification?: unknown;
  sellerNudge?: unknown;
  shopPlanGate?: ShopPlanGate;
};

export const shopApi = {
  getOnboardingContext: async () => {
    const response = await api.get<ApiResponse<ShopOnboardingContextResponse>>(
      SHOP_API.me.onboardingContext
    );
    return response.data;
  },
  getSettings: async () => {
    const response = await api.get<ApiResponse<ShopSettingsResponse>>(SHOP_API.me.settings);
    return response.data;
  },
  updateSettings: async (data: {
    isEnabled?: boolean;
    visibility?: 'public' | 'preview' | 'friends' | 'followers';
    saleNotifications?: boolean;
  } & ShopAppearanceUpdatePayload) => {
    const response = await api.put<ApiResponse<ShopSettingsResponse>>(SHOP_API.me.settings, data);
    return response.data;
  },
  updateAppearance: async (data: ShopAppearanceUpdatePayload) => {
    const response = await api.put<ApiResponse<ShopSettingsResponse>>(SHOP_API.me.settings, data);
    return response.data;
  },
  uploadShopBackground: async (imageUri: string) => {
    const token = await AsyncStorage.getItem('token');
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'shop-background.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('background', {
      uri: imageUri,
      type,
      name: filename,
    } as unknown as Blob);

    const response = await axios.post(
      `${API_CONFIG.BASE_URL}${SHOP_API.me.background}`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data as ApiResponse<{
      backgroundImage: string;
      backgroundUrl: string;
    }>;
  },
  deleteShopBackground: async () => {
    const response = await api.delete<ApiResponse<unknown>>(SHOP_API.me.background);
    return response.data;
  },
  deleteShop: async () => {
    const response = await api.delete<ApiResponse<unknown>>(SHOP_API.me.settings);
    return response.data;
  },
};
