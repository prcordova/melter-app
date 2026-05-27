import { sellerVerificationApi } from '../services/api';

export type SellerVerificationDocumentType = 'front' | 'back' | 'selfie' | 'videoProof';

type PickedSellerVerificationFile = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

async function readFileBlob(uri: string): Promise<Blob> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    if (blob.size > 0) return blob;
  } catch {
    // fallback abaixo
  }

  return new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', uri, true);
    xhr.responseType = 'blob';
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 0) {
        resolve(xhr.response);
      } else {
        reject(new Error(`Erro ao ler arquivo: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Erro de rede ao ler arquivo'));
    xhr.send();
  });
}

function putBlobToPresignedUrl(url: string, blob: Blob, contentType: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`Erro ao enviar documento (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Erro de rede ao enviar documento'));
    xhr.send(blob);
  });
}

export async function uploadSellerVerificationFileDirect(options: {
  file: PickedSellerVerificationFile;
  documentType: SellerVerificationDocumentType;
}): Promise<string> {
  const { file, documentType } = options;
  const blob = await readFileBlob(file.uri);
  if (!blob.size) {
    throw new Error('Arquivo vazio ou inválido');
  }

  const contentType =
    file.mimeType ||
    (documentType === 'videoProof' ? 'video/mp4' : 'image/jpeg');
  const fileName =
    file.fileName ||
    (documentType === 'videoProof' ? 'video-proof.mp4' : 'document.jpg');

  const presignedResponse = await sellerVerificationApi.getPresignedUploadUrl(
    fileName,
    contentType,
    blob.size,
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

  await putBlobToPresignedUrl(presignedUrl, blob, signedContentType);

  return fileKey;
}
