/** Leitura de arquivo local + PUT direto em URL pré-assinada (S3). */

export async function readFileBlob(uri: string): Promise<Blob> {
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

export function putBlobToPresignedUrl(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
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
