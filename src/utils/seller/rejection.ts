import { getSellerVerificationFieldLabels, resolveFieldsToReviewForClient } from './verification-fields';

const REJECTION_SUMMARIES: Record<string, string> = {
  documents_illegible: 'Documentos ilegíveis',
  documents_invalid: 'Documentos inválidos',
  review_data: 'Revisar dados cadastrais',
  other: '',
};

const LEGACY_SUMMARIES: Record<string, string> = {
  blurry_image: 'Problema na qualidade das imagens',
  illegible_document: 'Documentos ilegíveis',
  selfie_mismatch: 'Selfie não corresponde ao documento',
  selfie_blurry: 'Selfie com documento desfocada',
  invalid_cpf: 'Dados cadastrais inconsistentes',
  incomplete_submission: 'Envio incompleto',
  expired_document: 'Documentos inválidos ou vencidos',
};

export type SellerRejectionNotice = {
  summary: string;
  items: string[];
};

export function getSellerRejectionNotice(params: {
  rejectionReasonCodes?: string[];
  rejectionReason?: string | null;
  fieldsToReview?: string[];
  status?: string | null;
}): SellerRejectionNotice {
  const fields = resolveFieldsToReviewForClient({
    status: params.status,
    fieldsToReview: params.fieldsToReview,
    rejectionReason: params.rejectionReason,
  });
  const items = getSellerVerificationFieldLabels(fields);
  const code = params.rejectionReasonCodes?.[0];

  if (code && (REJECTION_SUMMARIES[code] || LEGACY_SUMMARIES[code])) {
    const summary =
      REJECTION_SUMMARIES[code] ||
      LEGACY_SUMMARIES[code] ||
      params.rejectionReason?.split('\n\n')[0]?.trim() ||
      'Cadastro não aprovado.';
    return { summary, items };
  }

  if (params.rejectionReason?.includes('Itens que você deve corrigir')) {
    const [summary] = params.rejectionReason.split('\n\n');
    return { summary: summary.trim(), items };
  }

  return {
    summary: params.rejectionReason?.trim() || 'Cadastro não aprovado.',
    items,
  };
}
