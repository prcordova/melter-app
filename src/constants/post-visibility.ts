/** Visibilidade de posts — mesma ordem/ícones do web `VisibilityChipSelect`. */
export type PostVisibility = 'PUBLIC' | 'FRIENDS' | 'FOLLOWERS';

export const POST_VISIBILITY_OPTIONS: ReadonlyArray<{
  value: PostVisibility;
  label: string;
  icon: 'globe-outline' | 'people-outline' | 'eye-outline';
}> = [
  { value: 'PUBLIC', label: 'Público', icon: 'globe-outline' },
  { value: 'FRIENDS', label: 'Amigos', icon: 'people-outline' },
  { value: 'FOLLOWERS', label: 'Seguidores', icon: 'eye-outline' },
];

export function getPostVisibilityOption(value: string | null | undefined) {
  return (
    POST_VISIBILITY_OPTIONS.find((opt) => opt.value === String(value ?? '').toUpperCase()) ??
    POST_VISIBILITY_OPTIONS[0]!
  );
}
