/** Paths do domínio App mobile — sync com melter/src/config/app/api-paths.ts */
export const APP_API = {
  version: '/api/app/version',
  downloadInfo: '/api/app/download-info',
  trackDownloadView: '/api/app/download/track-view',
  trackApkDownload: '/api/app/download/track-apk',
  apkDownload: '/api/app/download/apk',
  closedBetaApply: '/api/app/closed-beta/apply',
} as const

/** Rota da página pública de download (web). */
export const APP_DOWNLOAD_PAGE_PATH = '/download';
