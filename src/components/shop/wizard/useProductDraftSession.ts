import { useCallback, useEffect, useRef, useState } from 'react';
import { productsApi } from '../../../services/products';
import type {
  ProductDraftFileItem,
  ProductDraftSummary,
  PublishProductDraftResponse,
} from '../../../services/products';
import {
  buildDraftPayloadFromWizard,
  countWizardLinks,
  getWizardPendingUploads,
  type WizardFileItem,
} from '../../../lib/products/product-wizard-form';
import {
  ProductUploadError,
  uploadProductFileDirect,
  type PickedProductFile,
} from '../../../utils/products/upload';

const PUBLISH_STEP = 2;

function toPickedFile(file: WizardFileItem): PickedProductFile {
  const durationMs = file.file?.duration;
  return {
    uri: file.uri || file.file?.uri || '',
    name: file.name || file.file?.fileName || 'arquivo',
    mimeType: file.type || file.file?.mimeType || null,
    size: file.size,
    durationSeconds: durationMs ? Math.round(durationMs / 1000) : null,
  };
}

function toHostedItem(file: WizardFileItem): ProductDraftFileItem {
  return {
    id: file.id,
    existing: true,
    url: file.url,
    name: file.name,
    size: file.size,
    fileType: file.fileType,
    thumbnail: file.thumbnail ?? null,
    customFileName: file.customFileName ?? null,
    description: file.description ?? null,
    serverIndex: file.serverIndex,
  };
}

/**
 * Sessão do wizard de criação (= `ProductFormDialog` web): lista rascunho com mídia,
 * retomar / descartar / novo, e publica via `PATCH drafts/[id]` → `POST …/publish`.
 */
export function useProductDraftSession({
  active,
  onAbort,
}: {
  /** Wizard aberto para **novo** pacote (não edição). */
  active: boolean;
  onAbort: () => void;
}) {
  const [drafts, setDrafts] = useState<ProductDraftSummary[]>([]);
  const [resumeVisible, setResumeVisible] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Rascunho retomado — vira `product` do wizard. */
  const [resumedDraft, setResumedDraft] = useState<any | null>(null);
  const sessionDraftRef = useRef<{ _id: string; status: string } | null>(null);
  /** Id do rascunho da sessão (vídeo de apresentação / remoção de arquivo hospedado). */
  const [sessionDraftId, setSessionDraftId] = useState<string | null>(null);
  const forceNewRef = useRef(false);
  /** Uploads já registrados nesta sessão (evita reenviar ao tentar publicar de novo). */
  const uploadedRef = useRef(new Map<string, ProductDraftFileItem>());

  useEffect(() => {
    if (!active) {
      const leftover = sessionDraftRef.current;
      if (leftover?.status === 'DRAFT') {
        void productsApi.cleanupEmptyDraft(leftover._id).catch(() => undefined);
      }
      sessionDraftRef.current = null;
      setSessionDraftId(null);
      uploadedRef.current.clear();
      forceNewRef.current = false;
      setResumedDraft(null);
      setDrafts([]);
      setResumeVisible(false);
      setResolved(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const res = await productsApi.listDrafts();
        if (cancelled) return;
        const list = res.success ? (res.data ?? []).filter((d) => d.filesCount > 0) : [];
        if (list.length > 0) {
          setDrafts(list);
          setResumeVisible(true);
        }
      } catch (error) {
        console.error('[useProductDraftSession] Erro ao listar rascunhos:', error);
      } finally {
        if (!cancelled) {
          setBusy(false);
          setResolved(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  const continueDraft = useCallback(async (draftId: string) => {
    setBusy(true);
    try {
      const res = await productsApi.getDraft(draftId);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Não foi possível carregar o rascunho');
      }
      sessionDraftRef.current = { _id: String(res.data._id), status: 'DRAFT' };
      setSessionDraftId(sessionDraftRef.current._id);
      setResumedDraft(res.data);
      setResumeVisible(false);
    } finally {
      setBusy(false);
    }
  }, []);

  const discardDraft = useCallback(async (draftId: string) => {
    setBusy(true);
    try {
      const res = await productsApi.discardDraft(draftId);
      if (!res.success) throw new Error(res.message || 'Não foi possível descartar o rascunho');
      setDrafts((prev) => {
        const remaining = prev.filter((d) => d._id !== draftId);
        if (remaining.length === 0) setResumeVisible(false);
        return remaining;
      });
    } finally {
      setBusy(false);
    }
  }, []);

  const createNew = useCallback(() => {
    setResumeVisible(false);
    setResumedDraft(null);
    sessionDraftRef.current = null;
    setSessionDraftId(null);
    forceNewRef.current = true;
  }, []);

  const closeResume = useCallback(() => {
    setResumeVisible(false);
    onAbort();
  }, [onAbort]);

  const ensureDraftId = useCallback(async (): Promise<string> => {
    if (sessionDraftRef.current?.status === 'DRAFT') return sessionDraftRef.current._id;
    const res = await productsApi.createDraft(forceNewRef.current);
    if (!res.success || !res.data?._id) {
      throw new Error(res.message || 'Não foi possível iniciar o rascunho do pacote');
    }
    forceNewRef.current = false;
    sessionDraftRef.current = { _id: String(res.data._id), status: 'DRAFT' };
    setSessionDraftId(sessionDraftRef.current._id);
    return sessionDraftRef.current._id;
  }, []);

  /** Upload dos arquivos pendentes → salva rascunho → envia para análise. */
  const publish = async (
    wizardData: any,
    onProgress: (percent: number) => void
  ): Promise<PublishProductDraftResponse> => {
    const draftId = await ensureDraftId();
    onProgress(10);

    const files: WizardFileItem[] = wizardData.files || [];
    const existing = files.filter((f) => f.existing && f.url).map(toHostedItem);
    const pending = getWizardPendingUploads(files);
    const baseOrder = countWizardLinks(wizardData) + existing.length;

    for (let i = 0; i < pending.length; i++) {
      const file = pending[i];
      if (uploadedRef.current.has(file.id)) continue;
      const registered = await uploadProductFileDirect({
        productId: draftId,
        file: toPickedFile(file),
        order: baseOrder + i,
        customFileName: file.customFileName,
        description: file.description,
        onProgress: (p) => onProgress(10 + Math.round((70 * (i + p / 100)) / pending.length)),
      });
      uploadedRef.current.set(file.id, {
        id: file.id,
        existing: true,
        url: registered.url,
        name: registered.fileName,
        size: registered.fileSize,
        fileType: registered.fileType,
        thumbnail: registered.thumbnail,
        customFileName: registered.customFileName,
        description: registered.description,
        serverIndex: registered.order,
      });
    }

    const uploaded = pending
      .map((f) => uploadedRef.current.get(f.id))
      .filter((f): f is ProductDraftFileItem => Boolean(f));
    const payload = buildDraftPayloadFromWizard(wizardData, [...existing, ...uploaded], PUBLISH_STEP);

    onProgress(85);
    const saved = await productsApi.saveDraft(draftId, payload);
    if (!saved.success) throw new Error(saved.message || 'Erro ao salvar rascunho');

    const published = await productsApi.publishDraft(draftId, payload);
    if (!published.success) {
      throw new ProductUploadError(
        published.message || 'Erro ao enviar pacote',
        Boolean(published.upgradeRequired)
      );
    }
    sessionDraftRef.current = { _id: draftId, status: 'PENDING' };
    uploadedRef.current.clear();
    onProgress(100);
    return published;
  };

  return {
    drafts,
    resumeVisible,
    resolved,
    busy,
    resumedDraft,
    sessionDraftId,
    ensureDraft: ensureDraftId,
    continueDraft,
    discardDraft,
    createNew,
    closeResume,
    publish,
  };
}

/**
 * Edição de pacote existente (= ramo `product && status !== 'DRAFT'` do web).
 * `sentToReview`: pacote aprovado alterado saiu da loja até nova análise.
 */
export async function saveProductEdit(
  product: any,
  wizardData: any,
  onProgress: (percent: number) => void
): Promise<{ sentToReview: boolean }> {
  const paymentMode = product.paymentMode || 'UNICO';
  const patch = {
    title: wizardData.title,
    description: wizardData.description,
    tags: wizardData.tags,
    categoryId: wizardData.categoryId,
    coverImage: wizardData.coverImage || null,
    paymentMode,
    subscriptionPlanId: paymentMode === 'ASSINATURA' ? wizardData.subscriptionPlanId : undefined,
    subscriptionScope:
      paymentMode === 'ASSINATURA' ? product.subscriptionScope || 'LOJA' : undefined,
    price: paymentMode === 'ASSINATURA' ? 0 : wizardData.price,
    allowComments: wizardData.allowComments,
    showViews: wizardData.showViews,
    showLikes: wizardData.showLikes,
    allowCertificate: wizardData.allowCertificate,
    isAdultContent: wizardData.isAdultContent,
    isAiContent: wizardData.isAiContent,
    contentValidations: wizardData.contentValidations,
    digital: wizardData.digital,
  };

  onProgress(40);
  const res = await productsApi.updateProduct(String(product._id), patch);
  if (!res.success) throw new Error(res.message || 'Erro ao salvar produto');
  let sentToReview = Boolean((res as { sentToReview?: boolean }).sentToReview);

  const pending = getWizardPendingUploads(wizardData.files);
  const existingCount = wizardData.digital?.files?.length ?? 0;
  for (let i = 0; i < pending.length; i++) {
    const file = pending[i];
    await uploadProductFileDirect({
      productId: String(product._id),
      file: toPickedFile(file),
      order: existingCount + i,
      customFileName: file.customFileName,
      description: file.description,
      onProgress: (p) => onProgress(50 + Math.round((45 * (i + p / 100)) / pending.length)),
    });
  }
  if (pending.length > 0 && product.status === 'APPROVED') sentToReview = true;
  onProgress(100);
  return { sentToReview };
}
