export type InboxRequestItem = {
  friendshipId: string;
  requesterId: string;
  requesterUsername: string;
  requesterAvatar?: string;
  createdAt: string;
  hasMessageRequest: boolean;
  messagePreview?: string;
  messageRequestId?: string;
};
