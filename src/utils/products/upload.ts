import * as VideoThumbnails from 'expo-video-thumbnails';
import { productsApi } from '../../services/products';
import type { RegisteredProductFile } from '../../services/products';
import {
  getLocalFileSize,
  persistLocalMediaForUpload,
  putLocalFileToPresignedUrl,
} from '../presigned-upload';

export type PickedProductFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  /** Segundos (vídeo) — `expo-image-picker` devolve ms em `duration`. */
  durationSeconds?: number | null;
};

export class ProductUploadError extends Error {
  constructor(message: string, readonly upgradeRequired = false) {
    super(message);
  }
}

/**
 * Mesmo fluxo do web (`uploadProductFileDirect`): presigned privado →
 * PUT S3 → `POST /api/products/upload/files` (posse da key + cota + MIME).
 */
export async function uploadProductFileDirect(options: {
  productId: string;
  file: PickedProductFile;
  order: number;
  customFileName?: string | null;
  description?: string | null;
  onProgress?: (percent: number) => void;
}): Promise<RegisteredProductFile> {
  const { productId, file, order, customFileName, description, onProgress } = options;
  const requestedType = file.mimeType || 'application/octet-stream';
  let fileSize = file.size && file.size > 0 ? file.size : 0;
  try {
    fileSize = fileSize || (await getLocalFileSize(file.uri));
  } catch {
    throw new ProductUploadError('Arquivo vazio ou inválido');
  }

  const presigned = await productsApi.getPresignedUploadUrl(
    productId,
    file.name,
    requestedType,
    fileSize,
    order
  );
  if (!presigned.success || !presigned.presignedUrl || !presigned.fileKey) {
    throw new ProductUploadError(
      presigned.message || 'Erro ao obter URL de upload',
      Boolean(presigned.upgradeRequired)
    );
  }

  const signedType = presigned.metadata?.fileType?.trim() || requestedType;
  await putLocalFileToPresignedUrl(presigned.presignedUrl, file.uri, signedType, onProgress);

  // Preview JPEG para cards (vídeo) — mesmo padrão dos stories / web CustomCard.
  let thumbnailUrl: string | null = null;
  if (signedType.startsWith('video/')) {
    try {
      const frame = await VideoThumbnails.getThumbnailAsync(file.uri, {
        time: 250,
        quality: 0.7,
      });
      const thumbUri = await persistLocalMediaForUpload(frame.uri, 'jpg', 'image/jpeg');
      const thumbSize = await getLocalFileSize(thumbUri);
      const thumbName = `product_thumb_${Date.now()}.jpg`;
      const thumbPresigned = await productsApi.getPresignedUploadUrl(
        productId,
        thumbName,
        'image/jpeg',
        thumbSize,
        order
      );
      if (thumbPresigned.success && thumbPresigned.presignedUrl && thumbPresigned.fileKey) {
        await putLocalFileToPresignedUrl(
          thumbPresigned.presignedUrl,
          thumbUri,
          'image/jpeg'
        );
        thumbnailUrl = thumbPresigned.storageRef || thumbPresigned.fileKey;
      }
    } catch (thumbError) {
      console.warn('[uploadProductFileDirect] Falha ao gerar thumbnail do vídeo:', thumbError);
    }
  }

  const registered = await productsApi.registerUploadedFile({
    productId,
    fileUrl: presigned.storageRef || presigned.fileKey,
    fileName: file.name,
    fileSize,
    mimeType: signedType,
    order,
    customFileName: customFileName ?? null,
    description: description ?? null,
    duration: file.durationSeconds ?? null,
    thumbnailUrl,
  });
  if (!registered.success || !registered.data) {
    throw new ProductUploadError(
      registered.message || 'Erro ao registrar arquivo',
      Boolean(registered.upgradeRequired)
    );
  }
  return registered.data;
}
