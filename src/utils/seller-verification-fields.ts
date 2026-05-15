export const SELLER_VERIFICATION_REVIEW_FIELDS = [
  { key: 'documentFront', label: 'Documento (frente)' },
  { key: 'documentBack', label: 'Documento (verso)' },
  { key: 'selfieWithDocument', label: 'Selfie com documento' },
  { key: 'cpf', label: 'CPF' },
  { key: 'birthDate', label: 'Data de nascimento' },
  { key: 'contentType', label: 'Tipo de conteúdo' },
] as const;

const FIELD_LABEL_MAP = Object.fromEntries(
  SELLER_VERIFICATION_REVIEW_FIELDS.map((f) => [f.key, f.label])
) as Record<string, string>;

export function getSellerVerificationFieldLabel(fieldKey: string): string {
  return FIELD_LABEL_MAP[fieldKey] ?? fieldKey;
}

export function getSellerVerificationFieldLabels(fields: string[]): string[] {
  return fields.map(getSellerVerificationFieldLabel);
}
