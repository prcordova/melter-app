/** Campos que podem ser marcados para correção no cadastro de vendedor. */
export const SELLER_VERIFICATION_REVIEW_FIELDS = [
  { key: 'documentFront', label: 'Documento (frente)' },
  { key: 'documentBack', label: 'Documento (verso)' },
  { key: 'selfieWithDocument', label: 'Selfie com documento' },
  { key: 'videoProof', label: 'Vídeo prova' },
  { key: 'cpf', label: 'CPF' },
  { key: 'birthDate', label: 'Data de nascimento' },
  { key: 'contentType', label: 'Tipo de conteúdo' },
] as const;

export type SellerVerificationReviewFieldKey =
  (typeof SELLER_VERIFICATION_REVIEW_FIELDS)[number]['key'];

export const SELLER_VERIFICATION_DOCUMENT_FIELD_KEYS = [
  'documentFront',
  'documentBack',
  'selfieWithDocument',
  'videoProof',
] as const satisfies readonly SellerVerificationReviewFieldKey[];

export const SELLER_VERIFICATION_DATA_FIELD_KEYS = [
  'cpf',
  'birthDate',
  'contentType',
] as const satisfies readonly SellerVerificationReviewFieldKey[];

const REVIEW_FIELD_KEYS = new Set<string>(
  SELLER_VERIFICATION_REVIEW_FIELDS.map((f) => f.key)
);

const FIELD_LABEL_MAP = Object.fromEntries(
  SELLER_VERIFICATION_REVIEW_FIELDS.map((f) => [f.key, f.label])
) as Record<string, string>;

const FIELD_LABEL_TO_KEY = Object.fromEntries(
  SELLER_VERIFICATION_REVIEW_FIELDS.map((field) => [field.label, field.key])
) as Record<string, SellerVerificationReviewFieldKey>;

export function getSellerVerificationFieldLabel(fieldKey: string): string {
  return FIELD_LABEL_MAP[fieldKey] ?? fieldKey;
}

export function getSellerVerificationFieldLabels(fields: string[]): string[] {
  return fields.map(getSellerVerificationFieldLabel);
}

export function sanitizeFieldsToReview(fields: unknown): string[] {
  if (!Array.isArray(fields)) return [];
  return [...new Set(fields.filter((f) => typeof f === 'string' && REVIEW_FIELD_KEYS.has(f)))];
}

export function inferFieldsToReviewFromRejectionReason(
  rejectionReason: string | null | undefined
): string[] {
  if (!rejectionReason?.includes('Itens que você deve corrigir')) {
    return [];
  }

  const labels: string[] = [];
  for (const line of rejectionReason.split(/\r?\n/)) {
    const match = line.match(/^[•\-\*·]\s*(.+)$/);
    if (match?.[1]) {
      labels.push(match[1].trim());
    }
  }

  const keys = labels
    .map((label) => FIELD_LABEL_TO_KEY[label])
    .filter((key): key is SellerVerificationReviewFieldKey => Boolean(key));

  return sanitizeFieldsToReview(keys);
}

export function resolveFieldsToReviewForClient(params: {
  status?: string | null;
  fieldsToReview?: string[] | null;
  rejectionReason?: string | null;
}): string[] {
  const stored = sanitizeFieldsToReview(params.fieldsToReview ?? []);
  if (stored.length > 0) {
    return stored;
  }

  const status = params.status;
  if (status !== 'rejected' && status !== 'needs_review') {
    return [];
  }

  return inferFieldsToReviewFromRejectionReason(params.rejectionReason);
}

/** Indica cadastro real (não só pré-preenchimento de birthDate da conta). */
export function isSellerVerificationRecord(
  raw: Record<string, unknown> | null | undefined
): boolean {
  if (!raw) return false;
  return Boolean(
    raw.status ||
      raw.submittedAt ||
      (Array.isArray(raw.fieldsToReview) && raw.fieldsToReview.length > 0) ||
      raw.rejectionReason ||
      raw.needsReviewReason
  );
}

type VerificationFormSeed = {
  status?: string;
  fieldsToReview?: string[];
  rejectionReason?: string | null;
  rejectionReasonCodes?: string[];
  [key: string]: unknown;
};

function resolvedFormFields(data: VerificationFormSeed | undefined): string[] {
  if (!data) return [];
  return resolveFieldsToReviewForClient({
    status: data.status,
    fieldsToReview: data.fieldsToReview,
    rejectionReason: data.rejectionReason,
  });
}

/** Mantém seed de correção quando o GET devolve só pré-preenchimento ou payload incompleto. */
export function pickVerificationFormSeed<T extends VerificationFormSeed>(
  current: T | undefined,
  fresh: T | undefined
): T | undefined {
  if (!fresh) return current;
  if (!current) return fresh;

  const currentFields = resolvedFormFields(current);
  const freshFields = resolvedFormFields(fresh);
  const currentCorrection =
    (current.status === 'rejected' || current.status === 'needs_review') &&
    currentFields.length > 0;
  const freshCorrection =
    (fresh.status === 'rejected' || fresh.status === 'needs_review') &&
    freshFields.length > 0;

  if (currentCorrection && !freshCorrection) return current;
  if (freshCorrection) {
    return {
      ...current,
      ...fresh,
      status: fresh.status ?? current.status,
      rejectionReason: fresh.rejectionReason ?? current.rejectionReason,
      rejectionReasonCodes: fresh.rejectionReasonCodes ?? current.rejectionReasonCodes,
      fieldsToReview: freshFields,
    };
  }
  return current;
}
