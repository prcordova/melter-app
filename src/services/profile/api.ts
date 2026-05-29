import axios from 'axios';
import { api } from '../http-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../config/api.config';
import type { UsernameDisplayEffectConfig } from '../../types/username-display-effect';
import type { ApiResponse } from '../shared/types';
import type { ProfileContentSafetyPublic } from '../../types/profile-content-safety';

type ProfileMediaUploadResponse = ApiResponse<any> & {
  avatarUrl?: string;
  backgroundUrl?: string;
  contentSafety?: ProfileContentSafetyPublic;
};

type ProfileUpdateResponse = ApiResponse<{
  profile?: Record<string, unknown>;
  bio?: string;
  contentSafety?: ProfileContentSafetyPublic;
}>;

export const profileApi = {
  updateProfile: async (profileData: {
    bio?: string;
    profile?: {
      backgroundColor?: string;
      cardColor?: string;
      textColor?: string;
      cardTextColor?: string;
      displayMode?: 'list' | 'grid';
      gridAlignment?: 'flex-start' | 'center' | 'flex-end';
      cardStyle?: 'rounded' | 'square' | 'pill';
      animation?: 'none' | 'fade' | 'slide' | 'bounce';
      font?: 'default' | 'serif' | 'mono';
      spacing?: number;
      sortMode?: 'custom' | 'date' | 'name' | 'likes';
      likesColor?: string;
      backgroundImage?: string | null;
      backgroundMode?: 'full' | 'top';
      backgroundOverlay?: boolean;
      backgroundOverlayOpacity?: number;
      showLikes?: boolean;
      showViews?: boolean;
      showPosts?: boolean;
      postsLimit?: number;
      buttonBackgroundColor?: string | null;
      buttonTextColor?: string | null;
      usernameDisplayEffect?: UsernameDisplayEffectConfig | null;
      statusMessageTextColor?: string | null;
      statusMessageContainerBg?: string | null;
      statusMessageBubbleBg?: string | null;
      statusMessageDisplayEffect?: UsernameDisplayEffectConfig | null;
    };
    status?: {
      visibility?: 'online' | 'busy' | 'offline';
      customMessage?: string;
    };
  }) => {
    const response = await api.put<ProfileUpdateResponse>('/api/users/profile', profileData);
    return response.data;
  },

  deleteBackground: async () => {
    const response = await api.delete<ApiResponse<any>>('/api/users/background');
    return response.data;
  },

  uploadAvatar: async (imageUri: string) => {
    const token = await AsyncStorage.getItem('token');
    
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('avatar', {
      uri: imageUri,
      type,
      name: filename,
    } as any);

    const response = await axios.post(`${API_CONFIG.BASE_URL}/api/users/avatar`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data as ProfileMediaUploadResponse;
  },

  uploadBackground: async (imageUri: string) => {
    const token = await AsyncStorage.getItem('token');
    
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'background.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('background', {
      uri: imageUri,
      type,
      name: filename,
    } as any);

    const response = await axios.post(`${API_CONFIG.BASE_URL}/api/users/background`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data as ProfileMediaUploadResponse;
  },
};

/** Dicas / campanhas da plataforma no feed (alinhado ao web `usePlatformFeedInfo`). */
