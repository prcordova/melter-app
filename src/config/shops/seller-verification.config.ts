export const SELLER_VERIFICATION_MAX_IMAGE_SIZE_MB = 50;

export const SELLER_VERIFICATION_MAX_IMAGE_SIZE_BYTES =
  SELLER_VERIFICATION_MAX_IMAGE_SIZE_MB * 1024 * 1024;

export const SELLER_VERIFICATION_MAX_IMAGE_SIZE_LABEL = `${SELLER_VERIFICATION_MAX_IMAGE_SIZE_MB}MB`;

export const SELLER_VERIFICATION_UPLOAD_HELPER_TEXT = `Máx. ${SELLER_VERIFICATION_MAX_IMAGE_SIZE_LABEL} por imagem`;

export const SELLER_VERIFICATION_MAX_VIDEO_SIZE_MB = 100;

export const SELLER_VERIFICATION_MAX_VIDEO_SIZE_BYTES =
  SELLER_VERIFICATION_MAX_VIDEO_SIZE_MB * 1024 * 1024;

export const SELLER_VERIFICATION_MAX_VIDEO_SIZE_LABEL = `${SELLER_VERIFICATION_MAX_VIDEO_SIZE_MB}MB`;

export const SELLER_VERIFICATION_MAX_VIDEO_DURATION_SEC = 45;

export const SELLER_VERIFICATION_VIDEO_UPLOAD_HELPER_TEXT = `Vídeo MP4/MOV/WebM — máx. ${SELLER_VERIFICATION_MAX_VIDEO_SIZE_LABEL}, até ${SELLER_VERIFICATION_MAX_VIDEO_DURATION_SEC}s`;

export const SELLER_VERIFICATION_UPLOAD_PREVIEW_HEIGHT = 200;

export const SELLER_VERIFICATION_UPLOAD_AREA_HEIGHT =
  SELLER_VERIFICATION_UPLOAD_PREVIEW_HEIGHT + 16;

export const SELLER_VERIFICATION_EXAMPLE_THUMB_WIDTH = 200;

/** Layout responsivo para o app (upload + exemplo sempre na mesma linha). */
export function getSellerVerificationResponsiveLayout(screenWidth: number) {
  const previewHeight = Math.round(Math.min(200, Math.max(88, screenWidth * 0.28)));
  const areaHeight = previewHeight + 16;
  const thumbWidth = Math.round(Math.min(200, Math.max(72, screenWidth * 0.24)));
  return { previewHeight, areaHeight, thumbWidth };
}

export const SELLER_VERIFICATION_VIDEO_PROOF_PREVIEW_HEIGHT =
  SELLER_VERIFICATION_UPLOAD_PREVIEW_HEIGHT;

export const SELLER_VERIFICATION_VIDEO_PROOF_AREA_HEIGHT =
  SELLER_VERIFICATION_UPLOAD_AREA_HEIGHT;

export const SELLER_VERIFICATION_VIDEO_PROOF_EXAMPLE_THUMB_WIDTH =
  SELLER_VERIFICATION_EXAMPLE_THUMB_WIDTH;

export const SELLER_VERIFICATION_DOC_PREVIEW_HEIGHT = SELLER_VERIFICATION_UPLOAD_PREVIEW_HEIGHT;

export type SellerVerificationExampleMedia = {
  url: string;
  title: string;
  mediaKind: 'image' | 'video';
};

/** Imagens de exemplo em `platform-media` no S3 (mesma origem do vídeo prova). */
export const SELLER_VERIFICATION_DOCUMENTO_FRENTE_EXEMPLO_URL =
  'https://melter-uploads.s3.us-east-2.amazonaws.com/platform-media/67ad71ca01e33bc01e4625c3/1781694187541-540d28ef-848a-43d5-9926-08f5004b69bc.png';

export const SELLER_VERIFICATION_DOCUMENTO_VERSO_EXEMPLO_URL =
  'https://melter-uploads.s3.us-east-2.amazonaws.com/platform-media/67ad71ca01e33bc01e4625c3/1781694210869-573edcd1-3c34-46df-82c1-7fd17eec0345.png';

export const SELLER_VERIFICATION_SELFIE_COM_DOCUMENTO_EXEMPLO_URL =
  'https://melter-uploads.s3.us-east-2.amazonaws.com/platform-media/67ad71ca01e33bc01e4625c3/1781694236619-6096a2de-16df-4b21-8333-e4abd8bd8c18.png';

export const SELLER_VERIFICATION_DOCUMENT_FRONT_EXAMPLE: SellerVerificationExampleMedia = {
  url: SELLER_VERIFICATION_DOCUMENTO_FRENTE_EXEMPLO_URL,
  title: 'Exemplo — documento (frente)',
  mediaKind: 'image',
};

export const SELLER_VERIFICATION_DOCUMENT_BACK_EXAMPLE: SellerVerificationExampleMedia = {
  url: SELLER_VERIFICATION_DOCUMENTO_VERSO_EXEMPLO_URL,
  title: 'Exemplo — documento (verso)',
  mediaKind: 'image',
};

export const SELLER_VERIFICATION_SELFIE_WITH_DOCUMENT_EXAMPLE: SellerVerificationExampleMedia = {
  url: SELLER_VERIFICATION_SELFIE_COM_DOCUMENTO_EXEMPLO_URL,
  title: 'Exemplo — selfie com documento',
  mediaKind: 'image',
};

export const SELLER_VERIFICATION_VIDEO_PROOF_EXAMPLE_VIDEO_URL =
  'https://melter-uploads.s3.us-east-2.amazonaws.com/platform-media/67ad71ca01e33bc01e4625c3/1778909253160-786b4911-9bee-422f-b346-2b638c121ccc.mp4';

export const SELLER_VERIFICATION_VIDEO_PROOF_EXAMPLE: SellerVerificationExampleMedia = {
  url: SELLER_VERIFICATION_VIDEO_PROOF_EXAMPLE_VIDEO_URL,
  title: 'Exemplo de vídeo prova',
  mediaKind: 'video',
};

export const SELLER_VERIFICATION_VIDEO_PROOF_EXAMPLE_TITLE =
  SELLER_VERIFICATION_VIDEO_PROOF_EXAMPLE.title;

export const SELLER_VERIFICATION_DOCUMENT_FRONT_TIP =
  'Fotografe a frente do documento com boa iluminação. Evite reflexos, sombras e cortes — nome, foto e números precisam estar nítidos e legíveis.';

export const SELLER_VERIFICATION_DOCUMENT_BACK_TIP =
  'Fotografe o verso com o documento plano e centralizado. Cuidado com reflexos no plástico ou laminação; não corte bordas nem códigos.';

export const SELLER_VERIFICATION_SELFIE_WITH_DOCUMENT_TIP =
  'Segure o documento ao lado do rosto, sem cobrir o rosto nem os dados do documento. Use ambiente claro, evite flash direto e mantenha rosto e documento nítidos.';

export const SELLER_VERIFICATION_VIDEO_PROOF_TIP =
  'Grave em ambiente iluminado, com rosto e papel (data de hoje + @usuário) bem visíveis. Mantenha a câmera estável; não é necessário falar nome ou CPF.';
