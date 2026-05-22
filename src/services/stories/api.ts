import { api } from '../http-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../config/api.config';
import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from '../shared/types';

export const storiesApi = {
  // Buscar stories do feed (agrupados por usuário) - usado no feed principal
  getStoriesFeed: async (page = 1, limit = 10) => {
    const response = await api.get<ApiResponse<any>>(`/api/stories/feed?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Buscar stories de um usuário específico - usado em perfis
  getStoriesByUser: async (userId?: string) => {
    const url = userId 
      ? `/api/stories?userId=${userId}`
      : '/api/stories'; // Se não passar userId, retorna stories do usuário atual
    const response = await api.get<ApiResponse<any>>(url);
    return response.data;
  },

  // Buscar um story específico por ID
  getStory: async (storyId: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/stories/${storyId}`);
    return response.data;
  },

  // Verificar limite de stories ativos do usuário
  checkStoriesLimit: async () => {
    const response = await api.get<ApiResponse<any>>('/api/stories?checkLimit=true');
    return response.data;
  },

  uploadStoryMedia: async (fileUri: string, fileName: string, fileType: string, fileSize?: number, startTime?: number, duration?: number) => {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('Token de autenticação não encontrado. Faça login novamente.');
    }
    
    try {
      // 1. Obter tamanho do arquivo se não fornecido
      let actualFileSize = fileSize;
      if (!actualFileSize || actualFileSize === 0) {
        try {
          const response = await fetch(fileUri);
          const blob = await response.blob();
          actualFileSize = blob.size;
        } catch (error) {
          console.error('[uploadStoryMedia] Erro ao obter tamanho do arquivo:', error);
          throw new Error('Não foi possível determinar o tamanho do arquivo');
        }
      }

      // Validar tamanho mínimo
      if (!actualFileSize || actualFileSize === 0) {
        throw new Error('Tamanho do arquivo inválido');
      }

      // Normalizar tipo de arquivo (garantir lowercase)
      // O backend aceita tanto image/jpg quanto image/jpeg, então manter como está
      let normalizedFileType = fileType.toLowerCase().trim();

      // 2. Obter presigned URL
      // Usar query string manual para garantir que os parâmetros sejam enviados corretamente no React Native
      // IMPORTANTE: NÃO usar encodeURIComponent aqui.
      // URLSearchParams já faz encoding; encodar manualmente vira double-encoding (ex: image%252Fjpeg)
      // e o backend recebe fileType inválido (ex: image%2Fjpeg) e rejeita.
      const queryParams = new URLSearchParams();
      queryParams.append('fileName', fileName);
      queryParams.append('fileType', normalizedFileType);
      queryParams.append('fileSize', actualFileSize.toString());
      
      const url = `/api/stories/upload-presigned?${queryParams.toString()}`;
      const fullUrl = `${API_CONFIG.BASE_URL}${url}`;
      
      // O interceptor já adiciona o token automaticamente, não precisa adicionar manualmente
      try {
        const presignedResponse = await api.get<any>(url);

        // A API retorna { success: true, presignedUrl, fileKey, fileUrl, metadata }
        // O axios coloca a resposta em response.data
        if (!presignedResponse || !presignedResponse.data) {
          throw new Error('Resposta inválida do servidor');
        }

        if (!presignedResponse.data.success) {
          const errorMessage = presignedResponse.data?.message || presignedResponse.data?.error || 'Erro ao obter URL de upload';
          throw new Error(errorMessage);
        }

        if (!presignedResponse.data.presignedUrl) {
          throw new Error('URL de upload não foi retornada pelo servidor');
        }

        // 3. Fazer upload direto ao S3
        // No React Native, precisamos usar XMLHttpRequest para uploads de arquivos locais
        // porque fetch() pode não funcionar corretamente com URIs locais (file://, content://)
        let fileBlob: Blob;
        try {
          // Tentar usar fetch primeiro
          const response = await fetch(fileUri);
          fileBlob = await response.blob();
          
          // Verificar se o blob tem tamanho válido
          if (!fileBlob || fileBlob.size === 0) {
            throw new Error('Blob vazio ou inválido');
          }
        } catch (fetchError) {
          console.error('[uploadStoryMedia] Erro ao criar blob com fetch, tentando XMLHttpRequest:', fetchError);
          // Fallback: usar XMLHttpRequest para ler o arquivo
          fileBlob = await new Promise<Blob>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', fileUri, true);
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
        
        // Verificar se o tamanho do blob corresponde ao tamanho esperado
        if (fileBlob.size === 0) {
          throw new Error('Arquivo está vazio ou não foi lido corretamente');
        }
        
        if (fileBlob.size !== actualFileSize && fileBlob.size < actualFileSize * 0.9) {
          console.error('[uploadStoryMedia] AVISO: Tamanho do blob difere do esperado:', {
            blobSize: fileBlob.size,
            expectedSize: actualFileSize,
            difference: actualFileSize - fileBlob.size,
          });
        }
        
        // CRÍTICO: No React Native, axios pode não enviar blobs corretamente para S3
        // Usar XMLHttpRequest diretamente para garantir que o arquivo seja enviado corretamente
        const s3UploadResponse = await new Promise<{ status: number; headers: any }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.open('PUT', presignedResponse.data.presignedUrl, true);
          xhr.setRequestHeader('Content-Type', normalizedFileType);
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({
                status: xhr.status,
                headers: {
                  'content-length': xhr.getResponseHeader('content-length'),
                  'etag': xhr.getResponseHeader('etag'),
                },
              });
            } else {
              reject(new Error(`Erro ao fazer upload para S3: ${xhr.status} ${xhr.statusText}`));
            }
          };
          
          xhr.onerror = () => {
            console.error('[uploadStoryMedia] Erro no XMLHttpRequest:', {
              status: xhr.status,
              statusText: xhr.statusText,
            });
            reject(new Error(`Erro ao fazer upload para S3: ${xhr.statusText || 'Erro desconhecido'}`));
          };
          
          xhr.ontimeout = () => {
            reject(new Error('Timeout ao fazer upload para S3'));
          };
          
          xhr.timeout = 600000; // 10 minutos
          
          // Enviar o blob diretamente
          xhr.send(fileBlob);
        });
        
        if (s3UploadResponse.status !== 200) {
          throw new Error(`Erro ao fazer upload para S3: status ${s3UploadResponse.status}`);
        }

        // 4. Registrar upload no backend
        const formData = new FormData();
        formData.append('fileUrl', presignedResponse.data.fileUrl);
        formData.append('fileName', fileName);
        
        // Se for vídeo, adicionar parâmetros de corte
        if (fileType.startsWith('video/') && startTime !== undefined && duration !== undefined) {
          formData.append('startTime', startTime.toString());
          formData.append('duration', duration.toString());
        }

        // Usar a instância api para garantir que o interceptor adicione o token
        const response = await api.post('/api/stories/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        return response.data;
      } catch (axiosError: any) {
        // Tratamento específico para erros de rede
        if (axiosError.message === 'Network Error' || axiosError.code === 'ERR_NETWORK' || axiosError.code === 'ECONNABORTED') {
          console.error('[uploadStoryMedia] Erro de rede:', {
            url: fullUrl,
            baseURL: API_CONFIG.BASE_URL,
            hasToken: !!token,
            error: axiosError.message,
            code: axiosError.code,
            response: axiosError.response?.data,
          });
          throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
        }
        
        // Se for erro de resposta do servidor, extrair mensagem
        if (axiosError.response) {
          const errorMessage = axiosError.response.data?.message || axiosError.response.data?.error || 'Erro ao obter URL de upload';
          throw new Error(errorMessage);
        }
        
        // Re-lançar outros erros
        throw axiosError;
      }
    } catch (error: any) {
      console.error('[uploadStoryMedia] Erro:', error);
      // Se já for um Error com mensagem, re-lançar
      if (error instanceof Error) {
        throw error;
      }
      // Caso contrário, criar um novo Error
      throw new Error(error?.message || 'Erro desconhecido ao fazer upload');
    }
  },
  getPresignedStoryUploadUrl: async (fileName: string, fileType: string, fileSize: number) => {
    const response = await api.get<ApiResponse<{
      presignedUrl: string;
      fileKey: string;
      fileUrl: string;
      metadata: any;
    }>>('/api/stories/upload-presigned', {
      params: {
        fileName,
        fileType,
        fileSize,
      },
    });
    return response.data;
  },

  createStory: async (data: {
    content: {
      type: 'image' | 'video' | 'gif';
      mediaUrl: string;
      text?: string | null;
      elements?: Array<{
        type: 'text' | 'music';
        content: string;
        x: number;
        y: number;
        fontSize?: number;
        color?: string;
        backgroundColor?: string;
        strokeColor?: string;
        fontWeight?: 'normal' | 'bold';
      }> | null;
      zoom?: number;
      panX?: number;
      panY?: number;
    };
    visibility?: 'followers' | 'friends' | 'public';
    duration?: number;
  }) => {
    const response = await api.post<ApiResponse<any>>('/api/stories', data);
    return response.data;
  },

  deleteStory: async (storyId: string, options?: { adminSessionToken?: string | null }) => {
    const headers: Record<string, string> = {};
    if (options?.adminSessionToken) {
      headers['x-admin-session-token'] = options.adminSessionToken;
    }
    const response = await api.delete<ApiResponse<any>>(`/api/stories/${storyId}`, { headers });
    return response.data;
  },

  patchStoryVisibility: async (
    storyId: string,
    visibility: 'public' | 'followers' | 'friends',
    options?: { adminSessionToken?: string | null }
  ) => {
    const headers: Record<string, string> = {};
    if (options?.adminSessionToken) {
      headers['x-admin-session-token'] = options.adminSessionToken;
    }
    const response = await api.patch<ApiResponse<any>>(
      `/api/stories/${storyId}`,
      { visibility },
      { headers }
    );
    return response.data;
  },

  // Marcar story como visualizado
  viewStory: async (storyId: string) => {
    const response = await api.put<ApiResponse<any>>(`/api/stories/${storyId}`, {});
    return response.data;
  },

  // Denunciar story
  reportStory: async (storyId: string, data: { category?: string; description?: string }) => {
    const response = await api.post<ApiResponse<any>>(`/api/stories/${storyId}/report`, {
      reason: data.category || 'OTHER',
      description: data.description || 'Denúncia de story',
    });
    return response.data;
  },

  // Reagir ao story
  reactToStory: async (storyId: string, reactionType: string) => {
    const response = await api.post<ApiResponse<any>>(`/api/stories/${storyId}/reactions`, {
      type: reactionType,
    });
    return response.data;
  },

  // Buscar reações do story
  getStoryReactions: async (storyId: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/stories/${storyId}/reactions`);
    return response.data;
  },
};

// API de Pagamentos
