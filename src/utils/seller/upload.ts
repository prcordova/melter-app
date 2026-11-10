import { sellerVerificationApi } from '../../services/api';
import { getLocalFileSize, putLocalFileToPresignedUrl } from '../presigned-upload';

export type SellerVerificationDocumentType = 'front' | 'back' | 'selfie' | 'videoProof';

type PickedSellerVerificationFile = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

export async function uploadSellerVerificationFileDirect(options: {
  file: PickedSellerVerificationFile;
  documentType: SellerVerificationDocumentType;
}): Promise<string> {
  const { file, documentType } = options;

  const contentType =
    file.mimeType ||
    (documentType === 'videoProof' ? 'video/mp4' : 'image/jpeg');
  const fileName =
    file.fileName ||
    (documentType === 'videoProof' ? 'video-proof.mp4' : 'document.jpg');
  const fileSize = await getLocalFileSize(file.uri);

  const presignedResponse = await sellerVerificationApi.getPresignedUploadUrl(
    fileName,
    contentType,
    fileSize,
    documentType
  );

  const presignedUrl =
    (presignedResponse as { presignedUrl?: string }).presignedUrl ||
    presignedResponse.data?.presignedUrl;
  const fileKey =
    (presignedResponse as { fileKey?: string }).fileKey ||
    presignedResponse.data?.fileKey;

  if (!presignedResponse.success || !presignedUrl || !fileKey) {
    throw new Error(presignedResponse.message || 'Erro ao obter URL de upload');
  }

  const metadataFileType =
    (presignedResponse as { metadata?: { fileType?: string } }).metadata?.fileType ||
    presignedResponse.data?.metadata?.fileType;
  const signedContentType =
    typeof metadataFileType === 'string' && metadataFileType.trim()
      ? metadataFileType
      : contentType;

  await putLocalFileToPresignedUrl(presignedUrl, file.uri, signedContentType);

  return fileKey;
}
