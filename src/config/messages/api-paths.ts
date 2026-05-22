/**
 * Caminhos canônicos da API de mensagens (app).
 * Manter em sync com melter/src/config/messages/api-paths.ts.
 * Documentação: melter/src/config/messages/messages.md
 */
export const MESSAGES_API = {
  root: '/api/messages',
  markRead: '/api/messages/mark-read',
  unreadCount: '/api/messages/unread-count',
  unreadCountByPeer: (userId: string) =>
    `/api/messages/unread-count/${encodeURIComponent(userId)}`,
  conversations: '/api/messages/conversations',
  conversation: (conversationId: string) =>
    `/api/messages/conversations/${encodeURIComponent(conversationId)}`,
  archiveConversation: (conversationId: string) =>
    `/api/messages/conversations/${encodeURIComponent(conversationId)}/archive`,
  requestsInbox: '/api/messages/requests/inbox',
  thread: (userId: string, otherUserId: string) =>
    `/api/messages/${encodeURIComponent(userId)}/${encodeURIComponent(otherUserId)}`,
  threadWithDate: (userId: string, otherUserId: string, beforeDate: string) =>
    `${MESSAGES_API.thread(userId, otherUserId)}?beforeDate=${encodeURIComponent(beforeDate)}`,
  byId: (messageId: string) =>
    `/api/messages/by-id/${encodeURIComponent(messageId)}`,
  uploadImage: '/api/messages/upload-image',
  uploadDocument: '/api/messages/upload-document',
  conversationsRecent: '/api/conversations/recent',
  conversationDelete: (otherUserId: string) =>
    `/api/conversations/${encodeURIComponent(otherUserId)}`,
} as const
