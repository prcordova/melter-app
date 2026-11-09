import { api } from '../http-client';
import type { ApiResponse } from '../shared/types';
import { APP_API } from '../../config/app/api-paths';
import type { AppDownloadInfo, AppVersionStatus } from '../../config/app/types';

export const appApi = {
  getVersion: async () => {
    const response = await api.get<ApiResponse<AppVersionStatus>>(APP_API.version);
    return response.data;
  },

  getDownloadInfo: async () => {
    const response = await api.get<ApiResponse<AppDownloadInfo>>(APP_API.downloadInfo);
    return response.data;
  },

  trackApkDownload: async () => {
    const response = await api.post<ApiResponse<unknown>>(APP_API.trackApkDownload);
    return response.data;
  },
};
