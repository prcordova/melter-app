export const SELLER_VERIFICATION_MAX_IMAGE_SIZE_MB = 30;

export const SELLER_VERIFICATION_MAX_IMAGE_SIZE_BYTES =
  SELLER_VERIFICATION_MAX_IMAGE_SIZE_MB * 1024 * 1024;

export const SELLER_VERIFICATION_MAX_IMAGE_SIZE_LABEL = `${SELLER_VERIFICATION_MAX_IMAGE_SIZE_MB}MB`;

export const SELLER_VERIFICATION_UPLOAD_HELPER_TEXT = `Máx. ${SELLER_VERIFICATION_MAX_IMAGE_SIZE_LABEL} por imagem`;

export const SELLER_VERIFICATION_MAX_VIDEO_SIZE_MB = 80;

export const SELLER_VERIFICATION_MAX_VIDEO_SIZE_BYTES =
  SELLER_VERIFICATION_MAX_VIDEO_SIZE_MB * 1024 * 1024;

export const SELLER_VERIFICATION_MAX_VIDEO_SIZE_LABEL = `${SELLER_VERIFICATION_MAX_VIDEO_SIZE_MB}MB`;

export const SELLER_VERIFICATION_MAX_VIDEO_DURATION_SEC = 45;

export const SELLER_VERIFICATION_VIDEO_UPLOAD_HELPER_TEXT = `Vídeo MP4/MOV/WebM — máx. ${SELLER_VERIFICATION_MAX_VIDEO_SIZE_LABEL}, até ${SELLER_VERIFICATION_MAX_VIDEO_DURATION_SEC}s`;

/** Imagem de referência (papel com data + @usuário) exibida no formulário de vídeo prova. */
export const SELLER_VERIFICATION_VIDEO_PROOF_EXAMPLE_IMAGE_URL =
  'https://melter-uploads.s3.us-east-2.amazonaws.com/platform-media/67ad71ca01e33bc01e4625c3/1778908088089-080f3685-3016-4ef4-8625-9ad7e15d573c.jpg';

export const SELLER_VERIFICATION_VIDEO_PROOF_EXAMPLE_IMAGE_TITLE = 'Exemplo de vídeo prova';

/** Altura do preview de vídeo (alinhado ao `SellerDocumentUploadField` variant video). */
export const SELLER_VERIFICATION_VIDEO_PROOF_PREVIEW_HEIGHT = 200;

/** Altura da área de upload de vídeo (= preview + padding). */
export const SELLER_VERIFICATION_VIDEO_PROOF_AREA_HEIGHT =
  SELLER_VERIFICATION_VIDEO_PROOF_PREVIEW_HEIGHT + 16;

/** Largura da miniatura de exemplo ao lado do upload (telas maiores). */
export const SELLER_VERIFICATION_VIDEO_PROOF_EXAMPLE_THUMB_WIDTH = 200;

/** Altura do preview no formulário (compacto para modal). */
export const SELLER_VERIFICATION_DOC_PREVIEW_HEIGHT = 72;
