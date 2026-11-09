/** Sync com melter/src/config/app/types.ts */
export type AppVersionStatus = {
  latestVersion: string;
  latestVersionCode: number;
  minVersionCode: number;
  apkUrl: string | null;
};

export type AppReleaseNote = {
  id: string;
  title: string;
  description: string;
  version: string;
  publishedAt: string;
};

/** Resposta pública de `APP_API.downloadInfo` (campos usados no app). */
export type AppDownloadInfo = {
  currentVersion: string;
  releaseNotes: AppReleaseNote[];
};
