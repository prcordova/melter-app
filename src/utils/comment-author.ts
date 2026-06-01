import type { Comment } from '../types/feed';

export type CommentAuthor = {
  username: string;
  avatar?: string;
};

export function getCommentAuthor(comment: Comment): CommentAuthor | null {
  const userId = comment.userId as unknown;
  if (!userId || typeof userId !== 'object') return null;
  const username =
    typeof (userId as { username?: string }).username === 'string'
      ? (userId as { username: string }).username.trim()
      : '';
  if (!username) return null;
  return {
    username,
    avatar: (userId as { avatar?: string }).avatar,
  };
}
