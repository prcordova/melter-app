/** Espelho leve de `melter/src/lib/product-content-stats` para cards do app. */

export type ProductContentStats = {
  videoCount: number;
  imageCount: number;
  documentCount: number;
  totalVideoDurationSeconds?: number;
};

export type ProductFileForStats = {
  fileType?: string;
  duration?: number | null;
};

export function computeProductContentStats(
  files?: ProductFileForStats[] | null
): ProductContentStats | null {
  if (!files?.length) return null;

  let videoCount = 0;
  let imageCount = 0;
  let documentCount = 0;
  let totalVideoDurationSeconds = 0;

  for (const file of files) {
    const type = (file.fileType || '').toLowerCase();
    if (type === 'video') {
      videoCount += 1;
      const raw = file.duration;
      if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
        totalVideoDurationSeconds += Math.round(raw);
      }
    } else if (type === 'image') {
      imageCount += 1;
    } else if (type === 'document') {
      documentCount += 1;
    }
  }

  if (videoCount === 0 && imageCount === 0 && documentCount === 0) {
    return null;
  }

  return {
    videoCount,
    imageCount,
    documentCount,
    totalVideoDurationSeconds,
  };
}

export type ProductContentStatsInput = {
  videoCount?: number;
  imageCount?: number;
  documentCount?: number;
  totalVideoDurationSeconds?: number;
};

export function resolveProductContentStats(product: {
  digital?: {
    contentStats?: ProductContentStatsInput | null;
    files?: ProductFileForStats[];
  } | null;
}): ProductContentStats {
  const fromApi = product.digital?.contentStats;
  if (fromApi) {
    return {
      videoCount: Math.max(0, fromApi.videoCount ?? 0),
      imageCount: Math.max(0, fromApi.imageCount ?? 0),
      documentCount: Math.max(0, fromApi.documentCount ?? 0),
      totalVideoDurationSeconds: fromApi.totalVideoDurationSeconds ?? 0,
    };
  }
  const computed = computeProductContentStats(product.digital?.files);
  return {
    videoCount: computed?.videoCount ?? 0,
    imageCount: computed?.imageCount ?? 0,
    documentCount: computed?.documentCount ?? 0,
    totalVideoDurationSeconds: computed?.totalVideoDurationSeconds ?? 0,
  };
}
