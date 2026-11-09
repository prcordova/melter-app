import { productsApi } from '../../services/products';
import type { RegisteredProductFile } from '../../services/products';
import { putBlobToPresignedUrl, readFileBlob } from '../presigned-upload';

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
  const blob = await readFileBlob(file.uri);
  if (!blob.size) {
    throw new ProductUploadError('Arquivo vazio ou inválido');
  }

  const requestedType = file.mimeType || 'application/octet-stream';
  const presigned = await productsApi.getPresignedUploadUrl(
    productId,
    file.name,
    requestedType,
    blob.size,
    order
  );
  if (!presigned.success || !presigned.presignedUrl || !presigned.fileKey) {
    throw new ProductUploadError(
      presigned.message || 'Erro ao obter URL de upload',
      Boolean(presigned.upgradeRequired)
    );
  }

  const signedType = presigned.metadata?.fileType?.trim() || requestedType;
  await putBlobToPresignedUrl(presigned.presignedUrl, blob, signedType, onProgress);

  const registered = await productsApi.registerUploadedFile({
    productId,
    fileUrl: presigned.storageRef || presigned.fileKey,
    fileName: file.name,
    fileSize: blob.size,
    mimeType: signedType,
    order,
    customFileName: customFileName ?? null,
    description: description ?? null,
    duration: file.durationSeconds ?? null,
  });
  if (!registered.success || !registered.data) {
    throw new ProductUploadError(
      registered.message || 'Erro ao registrar arquivo',
      Boolean(registered.upgradeRequired)
    );
  }
  return registered.data;
}
