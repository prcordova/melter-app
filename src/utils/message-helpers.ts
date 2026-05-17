/** Cor dos checks de “lido” no estilo WhatsApp */
export const MESSAGE_READ_CHECK_COLOR = '#53BDEB';

export type ChatMessage = {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: string;
  read?: boolean;
  type?: 'text' | 'image' | 'document';
  imageUrl?: string;
  documentUrl?: string;
  documentName?: string;
  storyReply?: {
    storyId: string;
    mediaUrl: string;
    mediaType: 'image' | 'video' | 'gif';
  } | null;
};

export function normalizeChatMessage(raw: Record<string, unknown>): ChatMessage {
  return {
    _id: String(raw._id ?? ''),
    senderId: String(raw.senderId ?? ''),
    recipientId: String(raw.recipientId ?? ''),
    content: String(raw.content ?? ''),
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
    read: raw.read === true,
    type: (raw.type as ChatMessage['type']) || 'text',
    imageUrl: raw.imageUrl as string | undefined,
    documentUrl: raw.documentUrl as string | undefined,
    documentName: raw.documentName as string | undefined,
    storyReply: (raw.storyReply as ChatMessage['storyReply']) ?? null,
  };
}

export function isMessageReadByRecipient(message: Pick<ChatMessage, 'read'>): boolean {
  return message.read === true;
}
