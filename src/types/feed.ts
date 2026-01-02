// Tipos para o Feed

export type ReactionType = 'LIKE' | 'LOVE' | 'HAPPY' | 'FIRE' | 'STRONG' | 'SAD' | 'ANGRY';

export interface PostUser {
  _id: string;
  username: string;
  avatar?: string;
  plan?: {
    type: string;
  };
  verifiedBadge?: {
    isVerified: boolean;
  };
}

export interface PostLink {
  _id: string;
  title: string;
  url: string;
  imageUrl?: string;
  description?: string;
}

export interface Comment {
  _id: string;
  content: string;
  userId: PostUser;
  postId: string;
  parentId?: string | null;
  replies?: Comment[];
  reactionsCount?: {
    LIKE: number;
    total: number;
  };
  userReaction?: string | null;
  createdAt: string;
}

export interface Post {
  _id: string;
  userId: PostUser;
  content: string;
  category?: string;
  linkId?: PostLink | null;
  imageUrl?: string | null;
  visibility: string;
  userReaction: ReactionType | null;
  reactionsCount: {
    LIKE: number;
    LOVE: number;
    HAPPY: number;
    FIRE: number;
    STRONG: number;
    SAD: number;
    ANGRY: number;
    total: number;
  };
  commentsCount: number;
  viewsCount?: number;
  sharesCount?: number;
  originalPostId?: Post | null; // Objeto Post completo quando populado
  shareComment?: string | null;
  createdAt: string | Date;
}

export interface Story {
  _id: string;
  userId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  content: {
    type: 'image' | 'video' | 'gif';
    mediaUrl: string;
    text?: string;
    elements?: Array<{
      type: 'text' | 'music';
      content: string;
      x: number;
      y: number;
      fontSize?: number;
      color?: string;
      backgroundColor?: string;
      strokeColor?: string;
      fontWeight?: 'normal' | 'bold';
    }> | null;
  };
  duration: number;
  views: Array<{
    userId: {
      _id: string;
      username: string;
      avatar?: string;
    };
    viewedAt: string;
  }>;
  reactions?: Array<{
    userId: {
      _id: string;
      username: string;
      avatar?: string;
    };
    type: ReactionType;
    createdAt: string;
  }>;
  createdAt: string;
}

export interface StoriesGroup {
  user: {
    _id: string;
    username: string;
    avatar?: string;
  };
  stories: Story[];
}

export type AdType = 'image' | 'video';

export interface Ad {
  _id: string;
  title?: string;
  description?: string;
  type: AdType;
  mediaUrl: string;
  link?: string;
  skipable?: boolean;
}

export const REACTIONS: Record<ReactionType, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  HAPPY: '😊',
  FIRE: '🔥',
  STRONG: '💪',
  SAD: '😢',
  ANGRY: '😠',
};

