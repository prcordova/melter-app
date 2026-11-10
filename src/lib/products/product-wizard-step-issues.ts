export type WizardIssueField =
  | 'delivery'
  | 'files'
  | 'title'
  | 'category'
  | 'description'
  | 'price'
  | 'plan'
  | 'terms';

export type WizardStepIssue = {
  field: WizardIssueField;
  message: string;
};

const PLACEHOLDER_TITLE = 'Rascunho sem título';
const TITLE_MIN = 2;
const DESCRIPTION_MIN = 10;
const PRICE_MIN = 10;

const TERM_FIELDS = [
  'readTerms',
  'noViolence',
  'noThirdParty',
  'ownContent',
  'noHateSpeech',
  'noSpam',
] as const;

function hasHostedMedia(files?: Array<{ uri?: string; url?: string; existing?: boolean }>): boolean {
  return Boolean(files?.some((file) => Boolean(file.uri || file.url) || Boolean(file.existing)));
}

export function collectWizardStepIssues(
  step: number,
  formData: {
    contentDeliveryMode?: string | null;
    files?: Array<{ uri?: string; url?: string; existing?: boolean }>;
    title?: string | null;
    description?: string | null;
    categoryId?: string | null;
    price?: number | null;
    paymentMode?: string | null;
    subscriptionPlanId?: string | null;
    contentValidations?: Record<string, boolean> | null;
  },
  options?: { isEditing?: boolean }
): WizardStepIssue[] {
  if (step === 0) {
    const issues: WizardStepIssue[] = [];
    if (!options?.isEditing && !formData.contentDeliveryMode) {
      issues.push({
        field: 'delivery',
        message: 'Escolha se o pacote terá só arquivos ou arquivos e links.',
      });
    }
    if (!hasHostedMedia(formData.files)) {
      issues.push({
        field: 'files',
        message: 'Envie pelo menos um arquivo de mídia. Links sozinhos não bastam.',
      });
    }
    return issues;
  }

  if (step === 1) {
    const issues: WizardStepIssue[] = [];
    const title = (formData.title ?? '').trim();
    if (!title || title === PLACEHOLDER_TITLE || title.length < TITLE_MIN) {
      issues.push({
        field: 'title',
        message: `O título precisa ter pelo menos ${TITLE_MIN} caracteres.`,
      });
    }
    if (!(formData.categoryId ?? '').trim()) {
      issues.push({ field: 'category', message: 'Selecione uma categoria.' });
    }
    if ((formData.description ?? '').trim().length < DESCRIPTION_MIN) {
      issues.push({
        field: 'description',
        message: `A descrição precisa ter pelo menos ${DESCRIPTION_MIN} caracteres.`,
      });
    }
    if (formData.paymentMode === 'ASSINATURA') {
      if (!formData.subscriptionPlanId) {
        issues.push({ field: 'plan', message: 'Selecione um plano de assinatura.' });
      }
    } else {
      const price = Number(formData.price);
      if (!Number.isFinite(price) || price < PRICE_MIN) {
        issues.push({
          field: 'price',
          message: `Informe um preço de pelo menos R$ ${PRICE_MIN}.`,
        });
      }
    }
    return issues;
  }

  if (step === 2) {
    const validations = formData.contentValidations ?? {};
    if (TERM_FIELDS.every((field) => validations[field])) return [];
    return [
      {
        field: 'terms',
        message: 'Marque todas as declarações de conteúdo para enviar à análise.',
      },
    ];
  }

  return [];
}
