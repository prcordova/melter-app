/** Leitura de arquivo local + PUT direto em URL pré-assinada (S3). */
import * as FileSystem from 'expo-file-system/legacy';

/** "File not found" do fetch(file://) no Android tem 14 bytes — rejeitar lixo. */
const MIN_MEDIA_BYTES = 1024;

function looksLikeImageOrVideoMagic(bytes: Uint8Array, mimeType: string): boolean {
  if (bytes.length < 4) return false;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isGif = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
  const isWebp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  const isMp4Like =
    bytes.length >= 8 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70; // ....ftyp
  const isWebm = bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;

  const mime = mimeType.toLowerCase();
  if (mime.startsWith('image/')) return isJpeg || isPng || isGif || isWebp;
  if (mime.startsWith('video/')) return isMp4Like || isWebm;
  return isJpeg || isPng || isGif || isWebp || isMp4Like || isWebm;
}

function base64ToBytes(base64: string): Uint8Array {
  // Hermes/RN expõe `atob`; evitar `Buffer` (tipos Node não entram no tsconfig do app).
  const binary = globalThis.atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export async function getLocalFileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.isDirectory) {
    throw new Error('Arquivo local não encontrado');
  }
  const size = typeof info.size === 'number' ? info.size : 0;
  if (size < MIN_MEDIA_BYTES) {
    throw new Error('Arquivo de mídia inválido ou corrompido');
  }
  return size;
}

/** Copia para cache estável antes do upload em background (URI temp do Android some). */
export async function persistLocalMediaForUpload(
  uri: string,
  ext: string,
  mimeType: string
): Promise<string> {
  const base = FileSystem.cacheDirectory;
  if (!base) return uri;
  const safeExt = (ext.replace(/^\./, '') || 'jpg').toLowerCase();
  const dest = `${base}melter-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  await assertLocalMediaLooksValid(dest, mimeType);
  return dest;
}

export async function assertLocalMediaLooksValid(uri: string, mimeType: string): Promise<void> {
  const size = await getLocalFileSize(uri);
  const headerB64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
    position: 0,
    length: Math.min(16, size),
  });
  const bytes = base64ToBytes(headerB64);
  if (!looksLikeImageOrVideoMagic(bytes, mimeType)) {
    throw new Error('Arquivo de mídia inválido (conteúdo não é imagem/vídeo)');
  }
}

/**
 * Preferir isto em vez de fetch(uri).blob() — no Android o fetch de file://
 * pode “suceder” com corpo `"File not found"` (14 bytes) e o S3 grava lixo.
 */
export async function putLocalFileToPresignedUrl(
  url: string,
  fileUri: string,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  await assertLocalMediaLooksValid(fileUri, contentType);

  if (onProgress) onProgress(0);

  const result = await FileSystem.uploadAsync(url, fileUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': contentType,
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Erro ao enviar arquivo (${result.status})`);
  }

  if (onProgress) onProgress(100);
}

/** @deprecated Preferir putLocalFileToPresignedUrl para URIs locais no app. */
export async function readFileBlob(uri: string): Promise<Blob> {
  await assertLocalMediaLooksValid(uri, 'application/octet-stream');
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    if (blob.size >= MIN_MEDIA_BYTES) return blob;
  } catch {
    // fallback abaixo
  }

  return new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', uri, true);
    xhr.responseType = 'blob';
    xhr.onload = () => {
      if ((xhr.status === 200 || xhr.status === 0) && xhr.response?.size >= MIN_MEDIA_BYTES) {
        resolve(xhr.response);
      } else {
        reject(new Error(`Erro ao ler arquivo: ${xhr.status || 'conteúdo inválido'}`));
      }
    };
    xhr.onerror = () => reject(new Error('Erro de rede ao ler arquivo'));
    xhr.send();
  });
}

export function putBlobToPresignedUrl(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  if (blob.size < MIN_MEDIA_BYTES) {
    return Promise.reject(new Error('Arquivo de mídia inválido ou corrompido'));
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', contentType);
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`Erro ao enviar arquivo (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Erro de rede ao enviar arquivo'));
    xhr.send(blob);
  });
}
