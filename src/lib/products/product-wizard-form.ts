/**
 * Espelho (subset) de `melter/src/lib/product-wizard-form.ts` — mesma montagem de
 * `digital.files` / payload de rascunho para web e app chamarem as mesmas rotas.
 */
import { DEFAULT_PACK_CATEGORY_ID } from '../../constants/categories';
import { isExternalProductLinkFile } from '../product-external-links';
import type { ProductDraftFileItem, ProductDraftSavePayload } from '../../services/products';

export type PackContentDeliveryMode = 'FILES_ONLY' | 'FILES_AND_LINKS';

export type WizardLinkItem = {
  id: string;
  url: string;
  title: string;
  description: string;
};

export type WizardFileItem = ProductDraftFileItem & {
  /** MIME (preview / upload). */
  type?: string;
  uri?: string;
  /** Asset do `expo-image-picker` ainda não enviado. */
  file?: { uri: string; mimeType?: string | null; fileName?: string | null; duration?: number | null };
};

const PLACEHOLDER_DRAFT_TITLE = 'Rascunho sem título';

function mimeFromFileType(fileType: string): string {
  if (fileType === 'image') return 'image/jpeg';
  if (fileType === 'video') return 'video/mp4';
  return 'application/octet-stream';
}

export function normalizeHttpUrlOrNull(raw: string): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return /^https?:\/\/[^\s/?#]+\.[^\s/?#]+/i.test(withScheme) ? withScheme : null;
}

/** Produto do servidor → arquivos/links do wizard (links externos saem de `digital.files`). */
export function mapProductDigitalToWizard(product: any): {
  files: WizardFileItem[];
  links: WizardLinkItem[];
  contentDeliveryMode: PackContentDeliveryMode;
} {
  const digital = product?.digital || {};
  const digitalFiles: any[] = Array.isArray(digital.files) ? digital.files : [];
  const files: WizardFileItem[] = [];
  const links: WizardLinkItem[] = [];

  digitalFiles.forEach((f, index) => {
    const url = String(f.url || '');
    if (isExternalProductLinkFile({ url, fileType: String(f.fileType || '') })) {
      links.push({
        id: f._id ? String(f._id) : `link-${index}`,
        url,
        title: String(f.customFileName || f.fileName || ''),
        description: String(f.description || ''),
      });
      return;
    }
    if (f.sellerDiscardedAt) return;

    const fileType = String(f.fileType || 'document');
    files.push({
      id: f._id ? String(f._id) : `file-${index}`,
      existing: true,
      serverIndex: index,
      url,
      uri: url,
      type: mimeFromFileType(fileType),
      name: String(f.customFileName || f.fileName || 'Arquivo'),
      size: Number(f.fileSize) || 0,
      fileType,
      thumbnail: f.thumbnail ?? null,
      customFileName: f.customFileName ?? null,
      description: f.description ?? null,
    });
  });

  const legacyUrl = typeof digital.downloadUrl === 'string' ? digital.downloadUrl.trim() : '';
  if (legacyUrl && !links.some((l) => l.url === legacyUrl)) {
    links.push({
      id: 'legacy-download',
      url: legacyUrl,
      title: String(digital.fileName || ''),
      description: '',
    });
  }

  return {
    files,
    links,
    contentDeliveryMode: links.length > 0 ? 'FILES_AND_LINKS' : 'FILES_ONLY',
  };
}

export function normalizeDraftTitleForWizard(title: string | null | undefined): string {
  const normalized = (title ?? '').trim();
  return normalized === PLACEHOLDER_DRAFT_TITLE ? '' : normalized;
}

export function resolveWizardCategoryId(product: any): string {
  const raw = product?.categoryId;
  const categoryId =
    raw && typeof raw === 'object' && raw._id ? String(raw._id) : raw ? String(raw) : '';
  const title = normalizeDraftTitleForWizard(product?.title);
  if (!title && categoryId === DEFAULT_PACK_CATEGORY_ID) return '';
  return categoryId;
}

export function wizardPriceFromProduct(product: any): number | null {
  const value = Number(product?.price);
  if (!Number.isFinite(value) || value < 10) return null;
  const title = normalizeDraftTitleForWizard(product?.title);
  if (!title && value === 10) return null;
  return value;
}

function validWizardLinks(formData: {
  links?: WizardLinkItem[];
  contentDeliveryMode?: PackContentDeliveryMode | null;
}): WizardLinkItem[] {
  if (formData.contentDeliveryMode !== 'FILES_AND_LINKS') return [];
  return (formData.links || []).filter((link) => {
    const raw = link.url?.trim() || '';
    return raw.length >= 4 && normalizeHttpUrlOrNull(raw) !== null;
  });
}

export function countWizardLinks(formData: {
  links?: WizardLinkItem[];
  contentDeliveryMode?: PackContentDeliveryMode | null;
}): number {
  return validWizardLinks(formData).length;
}

/** `digital` do PATCH `/api/products/[id]` — links + arquivos já hospedados. */
export function buildWizardDigitalPayload(formData: {
  files?: WizardFileItem[];
  links?: WizardLinkItem[];
  allowDownload?: boolean;
  contentDeliveryMode?: PackContentDeliveryMode | null;
}) {
  const linkFiles = validWizardLinks(formData).map((link, index) => {
    const raw = link.url.trim();
    const url = normalizeHttpUrlOrNull(raw) || raw;
    return {
      url,
      fileName: link.title?.trim() || url,
      customFileName: link.title?.trim() || null,
      description: link.description?.trim() || null,
      fileSize: 0,
      fileType: 'document' as const,
      order: index,
      thumbnail: null,
    };
  });

  const hostedFiles = (formData.files || [])
    .filter((f) => f.existing && f.url)
    .map((f, index) => ({
      url: f.url!,
      fileName: f.name || f.customFileName || 'Arquivo',
      customFileName: f.customFileName ?? null,
      description: f.description ?? null,
      fileSize: f.size || 0,
      fileType: f.fileType || 'document',
      thumbnail: f.thumbnail ?? null,
      order: f.serverIndex ?? linkFiles.length + index,
    }));

  return {
    downloadUrl: '',
    fileName: '',
    allowDownload: Boolean(formData.allowDownload),
    fileSize: 0,
    files: [...linkFiles, ...hostedFiles],
  };
}

/** Arquivos escolhidos no aparelho e ainda não enviados ao S3. */
export function getWizardPendingUploads(files: WizardFileItem[] | undefined): WizardFileItem[] {
  return (files || []).filter((f) => !f.existing && Boolean(f.uri || f.file?.uri));
}

/** Body de `PATCH /api/products/drafts/[id]` e `POST …/publish` (= `buildDraftPayloadFromWizard` web). */
export function buildDraftPayloadFromWizard(
  formData: any,
  hostedFiles: ProductDraftFileItem[],
  step: number
): ProductDraftSavePayload {
  return {
    title: formData.title,
    description: formData.description,
    tags: formData.tags,
    price: formData.price,
    categoryId: formData.categoryId,
    coverImage: formData.coverImage,
    paymentMode: formData.paymentMode,
    subscriptionPlanId: formData.subscriptionPlanId,
    allowComments: formData.allowComments,
    showViews: formData.showViews,
    showLikes: formData.showLikes,
    allowCertificate: formData.allowCertificate,
    isAdultContent: formData.isAdultContent,
    isAiContent: formData.isAiContent,
    layout: formData.layout,
    contentValidations: formData.contentValidations,
    files: hostedFiles,
    links: validWizardLinks(formData).map((link) => ({
      url: link.url.trim(),
      title: link.title,
      description: link.description,
    })),
    contentDeliveryMode: formData.contentDeliveryMode ?? 'FILES_ONLY',
    allowDownload: formData.allowDownload,
    draftWizardStep: step,
  };
}
