/** Paths do domínio App mobile — sync com melter/src/config/app/api-paths.ts */
export const APP_API = {
  version: '/api/app/version',
  downloadInfo: '/api/app/download-info',
  trackDownloadView: '/api/app/download/track-view',
  trackApkDownload: '/api/app/download/track-apk',
  apkDownload: '/api/app/download/apk',
} as const

/** Rota da página pública de download (web). */
export const APP_DOWNLOAD_PAGE_PATH = '/download';

/** `actionType` / `data.type` do aviso de nova versão — sync com melter/src/lib/app/app-release-broadcast.ts */
export const APP_RELEASE_NOTIFICATION_ACTION_TYPE = 'VIEW_APP_RELEASE_NOTES';
export const APP_RELEASE_PUSH_TYPE = 'APP_UPDATE';
