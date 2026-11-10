import { api } from '../http-client';
import type { ApiResponse } from '../shared/types';
import { PRODUCT_DRAFTS_API, PRODUCT_MEDIA_API } from '../../config/shops/api-paths';
import type {
  ProductDraftSavePayload,
  ProductDraftSummary,
  ProductFilePresignedResponse,
  PublishProductDraftResponse,
  ProductFileProgress,
  ProductModule,
  RegisteredProductFile,
  SignedProductMedia,
} from './types';
import type { ShopProductsListMeta } from '../../constants/shop-products-list-meta';

export type ProductsListResponse = ApiResponse<any[]> & {
  meta?: Partial<ShopProductsListMeta>;
};

export const productsApi = {
  getProducts: async (params?: {
    username?: string;
    isActive?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.username) queryParams.append('username', params.username);
    if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
    
    const url = `/api/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get<ProductsListResponse>(url);
    return response.data;
  },
  getProduct: async (productId: string) => {
    const response = await api.get<ApiResponse<any>>(`/api/products/${productId}`);
    return response.data;
  },
  createProduct: async (data: any) => {
    const response = await api.post<ApiResponse<any>>('/api/products', data);
    return response.data;
  },
  updateProduct: async (productId: string, data: any) => {
    const response = await api.patch<ApiResponse<any>>(`/api/products/${productId}`, data);
    return response.data;
  },
  deleteProduct: async (productId: string) => {
    const response = await api.patch<ApiResponse<any>>(`/api/products/${productId}`, {
      status: 'REMOVED_BY_SELLER',
    });
    return response.data;
  },
  /** `forShop`: vitrine da loja — admin vê status real de compra (sem bypass). */
  getPurchaseStatus: async (productId: string, options?: { forShop?: boolean }) => {
    const response = await api.get<ApiResponse<{
      hasPurchased: boolean;
      canPurchase: boolean;
      isActive?: boolean;
      expiresAt?: string;
      orderId?: string;
      accessVia?: 'DIRECT_PURCHASE' | 'SUBSCRIPTION_PLAN';
      subscriptionPlanId?: string;
    }>>(`/api/products/${productId}/purchase-status${options?.forShop ? '?forShop=true' : ''}`);
    return response.data;
  },
  getPresignedUploadUrl: async (productId: string, fileName: string, fileType: string, fileSize: number, order: number = 0) => {
    const response = await api.get<ProductFilePresignedResponse>(PRODUCT_DRAFTS_API.uploadFiles, {
      params: {
        productId,
        fileName,
        fileType,
        fileSize,
        order,
      },
    });
    return response.data;
  },
  /** Registra arquivo após PUT no S3 — servidor valida posse da key, cota e MIME. */
  registerUploadedFile: async (payload: {
    productId: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    order: number;
    customFileName?: string | null;
    description?: string | null;
    duration?: number | null;
    /** Key/URL de JPEG de preview (vídeos). */
    thumbnailUrl?: string | null;
  }) => {
    const response = await api.post<ApiResponse<RegisteredProductFile> & { upgradeRequired?: boolean }>(
      PRODUCT_DRAFTS_API.uploadFiles,
      payload
    );
    return response.data;
  },
  /** Renova URLs assinadas (~15 min) de `digital.files`; sem `fileIndices` assina todos. */
  signMedia: async (productId: string, fileIndices?: number[]) => {
    const response = await api.post<ApiResponse<SignedProductMedia>>(
      PRODUCT_MEDIA_API.sign(productId),
      fileIndices ? { fileIndices } : {}
    );
    return response.data;
  },
  getProgress: async (productId: string) => {
    const response = await api.get<ApiResponse<{ progress: ProductFileProgress[] }>>(
      PRODUCT_MEDIA_API.progress(productId)
    );
    return response.data;
  },
  saveProgress: async (productId: string, progress: Omit<ProductFileProgress, 'lastWatched'>) => {
    const response = await api.post<ApiResponse<{ progress: ProductFileProgress }>>(
      PRODUCT_MEDIA_API.progress(productId),
      progress
    );
    return response.data;
  },
  getModules: async (productId: string) => {
    const response = await api.get<ApiResponse<{ modules: ProductModule[] }>>(
      PRODUCT_MEDIA_API.modules(productId)
    );
    return response.data;
  },
  trackFileView: async (productId: string, fileIndex: number) => {
    const response = await api.post<ApiResponse<{ viewsCount: number }>>(
      PRODUCT_MEDIA_API.fileViews(productId, String(fileIndex))
    );
    return response.data;
  },
  /** Rascunho: descarte soft; produto publicado: apaga do S3 e tira de `digital.files`. */
  deleteUploadedFile: async (productId: string, fileUrl: string) => {
    const response = await api.delete<ApiResponse<null>>(PRODUCT_DRAFTS_API.uploadFiles, {
      data: { productId, fileUrl },
    });
    return response.data;
  },
  listDrafts: async () => {
    const response = await api.get<ApiResponse<ProductDraftSummary[]>>(PRODUCT_DRAFTS_API.root);
    return response.data;
  },
  createDraft: async (forceNew = false) => {
    const response = await api.post<ApiResponse<any>>(PRODUCT_DRAFTS_API.root, { forceNew });
    return response.data;
  },
  getDraft: async (draftId: string) => {
    const response = await api.get<ApiResponse<any>>(PRODUCT_DRAFTS_API.item(draftId));
    return response.data;
  },
  saveDraft: async (draftId: string, payload: ProductDraftSavePayload) => {
    const response = await api.patch<ApiResponse<any>>(PRODUCT_DRAFTS_API.item(draftId), payload);
    return response.data;
  },
  publishDraft: async (draftId: string, payload: ProductDraftSavePayload) => {
    const response = await api.post<PublishProductDraftResponse>(
      PRODUCT_DRAFTS_API.publish(draftId),
      payload
    );
    return response.data;
  },
  discardDraft: async (draftId: string) => {
    const response = await api.post<ApiResponse<null>>(PRODUCT_DRAFTS_API.discard(draftId));
    return response.data;
  },
  cleanupEmptyDraft: async (draftId: string) => {
    const response = await api.post<ApiResponse<{ result: string }>>(
      PRODUCT_DRAFTS_API.cleanupEmpty(draftId)
    );
    return response.data;
  },
  deleteFile: async (productId: string, fileId: string) => {
    const response = await api.delete<ApiResponse<any>>(`/api/products/${productId}/files/${fileId}`);
    return response.data;
  },
};

// API de Categorias
