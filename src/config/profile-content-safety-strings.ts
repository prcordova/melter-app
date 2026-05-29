import type { ProfileContentSafetyReason } from '../types/profile-content-safety';

/** Textos alinhados a `profileContentSafety.*` e `profile.restrictedEntryGate.*` do web (pt). */
export const PROFILE_CONTENT_SAFETY_STRINGS = {
  ai: {
    modalTitle: 'IA analisando imagens',
    modalBody: 'A IA está analisando suas imagens…',
  },
  hint: {
    summary:
      'Este perfil está em modo privado para visitantes por conteúdo +18 detectado.',
    infoAria: 'Saiba mais sobre o modo privado',
    detailGeneric:
      'Texto ou imagens sinalizados como explícitos ou +18 colocam seu perfil em modo privado para o público: o Google e quem não está logado não veem sua bio, avatar ou fundo reais. Você e usuários logados continuam usando a plataforma normalmente.',
    detailBio:
      'Palavras da bio foram sinalizadas como explícitas ou +18. Visitantes deslogados veem a bio censurada; o perfil não é indexado no Google. Logado, você vê tudo normalmente.',
    detailUsername:
      'Seu @ foi sinalizado como explícito ou +18. O perfil não aparece da mesma forma para visitantes deslogados e deixa de ser indexado.',
    detailImage:
      'Avatar ou fundo sinalizado pela moderação. Visitantes deslogados não veem essas imagens; o perfil não é indexado.',
    detailStatus:
      'A mensagem de status contém termos sinalizados como explícitos ou +18. Visitantes deslogados veem o texto censurado; o perfil não é indexado.',
  },
  restrictedEntryGate: {
    title: 'Conteúdo para adultos',
    description: 'Este perfil pode conter imagens ou informações +18. Deseja continuar?',
    helperText: 'Se preferir não ver este conteúdo, volte ao Explorer.',
    enter: 'Entrar no perfil',
    leave: 'Sair',
  },
} as const;

export function resolveProfileContentSafetyDetailKey(
  reasons?: ProfileContentSafetyReason[]
): keyof typeof PROFILE_CONTENT_SAFETY_STRINGS.hint {
  if (!reasons?.length) return 'detailGeneric';

  const hasBio = reasons.includes('bio');
  const hasUsername = reasons.includes('username');
  const hasStatus = reasons.includes('status');
  const hasImage = reasons.includes('avatar') || reasons.includes('background');

  if (hasStatus && !hasBio && !hasImage && !hasUsername) return 'detailStatus';
  if (hasBio && !hasImage && !hasUsername && !hasStatus) return 'detailBio';
  if (hasUsername && !hasBio && !hasImage && !hasStatus) return 'detailUsername';
  if (hasImage && !hasBio && !hasUsername && !hasStatus) return 'detailImage';

  return 'detailGeneric';
}
