/**
 * Categorias fixas da plataforma.
 * `icon` = nome Ionicons (app). No web os ícones MUI vivem em melter/src/constants/categories.ts.
 */
export interface FixedCategory {
  _id: string;
  /** Nome PT de fallback. */
  name: string;
  /** Chave i18n alinhada ao web: post.category.{_id} */
  nameKey: string;
  /** Nome do ícone Ionicons. */
  icon: string;
}

export const FIXED_CATEGORIES: FixedCategory[] = [
  { _id: 'educacao', name: 'Educação', nameKey: 'post.category.educacao', icon: 'school-outline' },
  { _id: 'tecnologia', name: 'Tecnologia', nameKey: 'post.category.tecnologia', icon: 'hardware-chip-outline' },
  { _id: 'negocios', name: 'Negócios', nameKey: 'post.category.negocios', icon: 'briefcase-outline' },
  { _id: 'criatividade', name: 'Criatividade', nameKey: 'post.category.criatividade', icon: 'color-palette-outline' },
  { _id: 'jogos', name: 'Jogos', nameKey: 'post.category.jogos', icon: 'game-controller-outline' },
  { _id: 'humor', name: 'Humor', nameKey: 'post.category.humor', icon: 'happy-outline' },
  { _id: 'entretenimento', name: 'Entretenimento', nameKey: 'post.category.entretenimento', icon: 'film-outline' },
  { _id: 'seguranca', name: 'Segurança', nameKey: 'post.category.seguranca', icon: 'shield-checkmark-outline' },
  { _id: 'informacao', name: 'Informação', nameKey: 'post.category.informacao', icon: 'information-circle-outline' },
  { _id: 'conteudo-18', name: 'Conteúdo +18', nameKey: 'post.category.conteudo-18', icon: 'flame' },
  { _id: 'outros', name: 'Outros', nameKey: 'post.category.outros', icon: 'apps-outline' },
];

export const DEFAULT_PACK_CATEGORY_ID = 'conteudo-18';

export function getFixedCategory(categoryId: string): FixedCategory | undefined {
  return FIXED_CATEGORIES.find((cat) => cat._id === categoryId);
}

export function getFixedCategoryNameKey(categoryId: string): string {
  return getFixedCategory(categoryId)?.nameKey ?? `post.category.${categoryId}`;
}

export function getFixedCategoryName(categoryId: string): string {
  return getFixedCategory(categoryId)?.name ?? categoryId;
}

export function getFixedCategoryIcon(categoryId: string): string {
  return getFixedCategory(categoryId)?.icon ?? 'apps-outline';
}
