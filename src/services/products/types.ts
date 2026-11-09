/** Resumo de `GET /api/products/drafts` (máx. 1 rascunho com mídia). */
export interface ProductDraftSummary {
  _id: string;
  title: string;
  coverImage?: string | null;
  filesCount: number;
  draftWizardStep?: number;
  draftLastSavedAt?: string | null;
}

/** Body de `PATCH /api/products/drafts/[id]` e `POST …/publish` (`WizardDraftSaveInput` no web). */
export interface ProductDraftSavePayload {
  title?: string;
  description?: string;
  tags?: string;
  price?: number;
  categoryId?: string;
  coverImage?: string | null;
  paymentMode?: 'UNICO' | 'ASSINATURA';
  subscriptionPlanId?: string;
  allowComments?: 'ALL' | 'MODERATED' | 'NONE';
  showViews?: boolean;
  showLikes?: boolean;
  allowCertificate?: boolean;
  isAdultContent?: boolean;
  isAiContent?: boolean;
  layout?: 'GRID' | 'COURSE';
  contentValidations?: Record<string, boolean>;
  files?: ProductDraftFileItem[];
  links?: Array<{ url: string; title?: string; description?: string }>;
  contentDeliveryMode?: 'FILES_ONLY' | 'FILES_AND_LINKS' | null;
  allowDownload?: boolean;
  draftWizardStep?: number;
}

/** Arquivo já hospedado (registrado no produto) — `existing` + `url` = storage ref. */
export interface ProductDraftFileItem {
  id: string;
  name: string;
  size: number;
  fileType?: string;
  url?: string;
  thumbnail?: string | null;
  customFileName?: string | null;
  description?: string | null;
  existing?: boolean;
  serverIndex?: number;
}

export interface PublishProductDraftResponse {
  success: boolean;
  message?: string;
  pendingPlanActivation?: boolean;
  isExtendedTrial?: boolean;
  upgradeRequired?: boolean;
  data?: any;
}

/** `GET /api/products/upload/files` — campos na raiz, não em `data`. */
export interface ProductFilePresignedResponse {
  success: boolean;
  message?: string;
  upgradeRequired?: boolean;
  presignedUrl?: string;
  fileKey?: string;
  storageRef?: string;
  metadata?: { fileName?: string; fileType?: string; fileSize?: number; order?: number };
}

/** `data` de `POST /api/products/upload/files`. */
export interface RegisteredProductFile {
  url: string;
  fileName: string;
  customFileName: string | null;
  description: string | null;
  fileSize: number;
  fileType: 'image' | 'video' | 'document';
  thumbnail: string | null;
  duration: number | null;
  order: number;
}

/** `fileId` = índice em `digital.files` (string). */
export interface ProductFileProgress {
  fileId: string;
  currentTime: number;
  duration: number;
  isCompleted: boolean;
  lastWatched?: string;
}

export interface ProductModule {
  _id: string;
  title: string;
  description?: string | null;
  order: number;
  /** Índices em `digital.files` (string). */
  files: string[];
}

/** `data` de `POST /api/products/[id]/media/sign` — `index` = posição em `digital.files`. */
export interface SignedProductMedia {
  files: Array<{ index: number; url: string | null; thumbnail: string | null }>;
  expiresInSeconds: number;
}
