export interface SupportTicketReply {
  authorType: 'admin' | 'user';
  authorUsername: string;
  message: string;
  createdAt?: string;
}

export interface SupportTicket {
  _id: string;
  title: string;
  description: string;
  page: string;
  pageOther?: string | null;
  imageUrl?: string | null;
  status: 'em_analise' | 'resolvido';
  priority?: string;
  createdAt: string;
  createdBy?: { userId?: string; username: string };
  replies?: SupportTicketReply[];
  userUnreadAdminUpdate?: boolean;
}
