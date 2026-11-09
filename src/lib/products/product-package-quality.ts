import {
  formatPlanStorageLimit,
  getProductStorageLimits,
  resolveUserPlanType,
  type PlanType,
} from '../../config/plan-features';

/** Mesma régua do web (`melter/src/lib/product-package-quality*.ts`) — manter em sync. */
export const PACKAGE_QUALITY_STORAGE_WEAK_MB = 50;
export const PACKAGE_QUALITY_STORAGE_MEDIUM_MB = 200;
export const PACKAGE_QUALITY_STORAGE_EXCELLENT_MB = 500;

const MB = 1024 * 1024;

const STORAGE_TIER_BYTES = {
  weak: PACKAGE_QUALITY_STORAGE_WEAK_MB * MB,
  medium: PACKAGE_QUALITY_STORAGE_MEDIUM_MB * MB,
  excellent: PACKAGE_QUALITY_STORAGE_EXCELLENT_MB * MB,
} as const;

const MIN_IMAGES_BY_PLAN: Record<PlanType, number> = {
  FREE: 3,
  LITE: 3,
  STARTER: 4,
  PRO: 5,
  PRO_PLUS: 6,
};

const MIN_VIDEOS_BY_PLAN: Record<PlanType, number> = {
  FREE: 1,
  LITE: 1,
  STARTER: 1,
  PRO: 2,
  PRO_PLUS: 2,
};

const DESCRIPTION_MIN_CHARS = 80;
const TITLE_MIN_CHARS = 10;

export type PackageQualityLevel = 'basic' | 'starter' | 'good' | 'excellent';

export type PackageQualityDimensionId = 'storage' | 'images' | 'videos' | 'presentation';

export type PackageQualityCriterion =
  | 'add_media'
  | 'add_more_images'
  | 'add_videos'
  | 'add_storage'
  | 'add_cover'
  | 'add_description'
  | 'improve_title';

export type PackageQualityFile = {
  size?: number;
  /** Arquivos já hospedados: `image` | `video` | `document`. */
  fileType?: string | null;
  /** Arquivos novos no app: MIME type. */
  type?: string | null;
};

export type PackageQualityFormInput = {
  files?: PackageQualityFile[];
  title?: string;
  description?: string;
  coverImage?: string | null;
};

export type PackageQualityTargets = {
  maxTotalLabel: string;
  storageWeakMb: number;
  storageMediumMb: number;
  storageExcellentMb: number;
  minImages: number;
  minVideos: number;
};

export type PackageQualityDimension = {
  id: PackageQualityDimensionId;
  score: number;
  currentLabel: string;
  targetLabel: string;
};

export type PackageQualityResult = {
  score: number;
  level: PackageQualityLevel;
  tips: PackageQualityCriterion[];
  dimensions: PackageQualityDimension[];
  targets: PackageQualityTargets;
  stats: { imageCount: number; videoCount: number; usedBytes: number };
};

const DIMENSION_WEIGHTS: Record<PackageQualityDimensionId, number> = {
  storage: 0.35,
  images: 0.25,
  videos: 0.2,
  presentation: 0.2,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function ratioScore(current: number, target: number): number {
  if (target <= 0) return current > 0 ? 100 : 0;
  if (current <= 0) return 0;
  return Math.round(clamp(current / target, 0, 1) * 100);
}

function resolveLevel(score: number): PackageQualityLevel {
  if (score >= 76) return 'excellent';
  if (score >= 51) return 'good';
  if (score >= 26) return 'starter';
  return 'basic';
}

function resolveMediaKind(file: PackageQualityFile): 'image' | 'video' | 'other' {
  const fileType = (file.fileType || '').toLowerCase();
  if (fileType === 'image' || fileType === 'video') return fileType;
  const mime = (file.type || '').toLowerCase();
  if (mime === 'image' || mime.startsWith('image/')) return 'image';
  if (mime === 'video' || mime.startsWith('video/')) return 'video';
  return 'other';
}

export function formatQualityBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * MB) return `${Math.round(bytes / MB)} MB`;
  return `${(bytes / (1024 * MB)).toFixed(1)} GB`;
}

function buildTips(input: {
  hasMedia: boolean;
  imageCount: number;
  videoCount: number;
  usedBytes: number;
  hasCover: boolean;
  descriptionLength: number;
  titleLength: number;
  targets: PackageQualityTargets;
}): PackageQualityCriterion[] {
  const tips: Array<{ id: PackageQualityCriterion; priority: number }> = [];

  if (!input.hasMedia) tips.push({ id: 'add_media', priority: 100 });

  if (input.usedBytes < STORAGE_TIER_BYTES.excellent) {
    tips.push({
      id: 'add_storage',
      priority:
        input.usedBytes < STORAGE_TIER_BYTES.weak
          ? 95
          : input.usedBytes < STORAGE_TIER_BYTES.medium
            ? 88
            : 72,
    });
  }
  if (input.imageCount < input.targets.minImages) {
    tips.push({ id: 'add_more_images', priority: 85 - input.imageCount * 8 });
  }
  if (input.videoCount < input.targets.minVideos) {
    tips.push({ id: 'add_videos', priority: 75 - input.videoCount * 10 });
  }
  if (!input.hasCover) tips.push({ id: 'add_cover', priority: 45 });
  if (input.descriptionLength < DESCRIPTION_MIN_CHARS) {
    tips.push({
      id: 'add_description',
      priority: 35 - Math.floor(input.descriptionLength / 25),
    });
  }
  if (input.titleLength < TITLE_MIN_CHARS) tips.push({ id: 'improve_title', priority: 25 });

  return tips
    .sort((a, b) => b.priority - a.priority)
    .map((tip) => tip.id)
    .slice(0, 2);
}

export function computePackageQuality(
  formData: PackageQualityFormInput,
  planTypeInput?: string | null
): PackageQualityResult {
  const planType = resolveUserPlanType(planTypeInput);
  const targets: PackageQualityTargets = {
    maxTotalLabel: formatPlanStorageLimit(getProductStorageLimits(planType).maxTotalFileSizeMb),
    storageWeakMb: PACKAGE_QUALITY_STORAGE_WEAK_MB,
    storageMediumMb: PACKAGE_QUALITY_STORAGE_MEDIUM_MB,
    storageExcellentMb: PACKAGE_QUALITY_STORAGE_EXCELLENT_MB,
    minImages: MIN_IMAGES_BY_PLAN[planType],
    minVideos: MIN_VIDEOS_BY_PLAN[planType],
  };

  const files = formData.files ?? [];
  let imageCount = 0;
  let videoCount = 0;
  let usedBytes = 0;
  for (const file of files) {
    const kind = resolveMediaKind(file);
    if (kind === 'image') imageCount += 1;
    else if (kind === 'video') videoCount += 1;
    usedBytes += file.size || 0;
  }

  const hasCover = Boolean(formData.coverImage?.trim());
  const descriptionLength = (formData.description ?? '').trim().length;
  const titleLength = (formData.title ?? '').trim().length;

  const presentationScore = Math.round(
    clamp(
      (hasCover ? 40 : 0) +
        ratioScore(descriptionLength, DESCRIPTION_MIN_CHARS) * 0.35 +
        ratioScore(titleLength, TITLE_MIN_CHARS) * 0.25,
      0,
      100
    )
  );

  const dimensions: PackageQualityDimension[] = [
    {
      id: 'storage',
      score: ratioScore(usedBytes, STORAGE_TIER_BYTES.excellent),
      currentLabel: formatQualityBytes(usedBytes),
      targetLabel: `${PACKAGE_QUALITY_STORAGE_EXCELLENT_MB} MB`,
    },
    {
      id: 'images',
      score: ratioScore(imageCount, targets.minImages),
      currentLabel: String(imageCount),
      targetLabel: String(targets.minImages),
    },
    {
      id: 'videos',
      score: ratioScore(videoCount, targets.minVideos),
      currentLabel: String(videoCount),
      targetLabel: String(targets.minVideos),
    },
    {
      id: 'presentation',
      score: presentationScore,
      currentLabel: hasCover ? '✓' : '—',
      targetLabel: '✓',
    },
  ];

  const score = clamp(
    Math.round(dimensions.reduce((total, d) => total + d.score * DIMENSION_WEIGHTS[d.id], 0)),
    0,
    100
  );

  return {
    score,
    level: resolveLevel(score),
    tips: buildTips({
      hasMedia: files.length > 0,
      imageCount,
      videoCount,
      usedBytes,
      hasCover,
      descriptionLength,
      titleLength,
      targets,
    }),
    dimensions,
    targets,
    stats: { imageCount, videoCount, usedBytes },
  };
}

/** Cor do marcador na régua conforme a pontuação (0–100). */
export function resolvePackageQualityRulerColor(score: number): string {
  if (score >= 76) return '#2E7D32';
  if (score >= 51) return '#66BB6A';
  if (score >= 26) return '#FF9800';
  return '#EF5350';
}
