import type { ChatMessageWithSender } from '../types/chat';

export type ReplyMessage = NonNullable<ChatMessageWithSender['reply_to']>;
export type MessageRow = Omit<ChatMessageWithSender, 'reply_to'>;

// Resolve parents explicitly: PostgREST's self-join can return child arrays.
// Fetch once per page, including parents outside the pagination window, under RLS.
export async function hydrateReplies(
  rows: MessageRow[],
  fetchParents: (ids: string[]) => Promise<ReplyMessage[]>,
): Promise<ChatMessageWithSender[]> {
  const ids = [...new Set(rows.flatMap(row => row.reply_to_id ? [row.reply_to_id] : []))];
  const parents = ids.length ? await fetchParents(ids) : [];
  const byId = new Map(parents.map(parent => [parent.id, parent]));
  return rows.map(row => ({ ...row, reply_to: row.reply_to_id ? byId.get(row.reply_to_id) ?? null : null }));
}

export function renderReplyContent(
  reply: ChatMessageWithSender['reply_to'], allMessages: ChatMessageWithSender[] = [], replyToId?: string | null,
) {
  // Prefer fresh realtime rows so recalling a parent also updates its quotes.
  const local = allMessages.find(message => message.id === (replyToId || reply?.id));
  const target = local || (reply && !Array.isArray(reply) && (!replyToId || reply.id === replyToId) ? reply : null);
  const senderName = target?.sender?.display_name ?? null;
  if (!target) return { senderName, text: 'Không tải được tin nhắn gốc', isDeleted: false, mediaType: null, mediaUrl: null };
  if (target.is_deleted) return { senderName, text: 'Tin nhắn đã thu hồi', isDeleted: true, mediaType: null, mediaUrl: null };
  const media = target.type === 'IMAGE' || target.type === 'VIDEO';
  return {
    senderName,
    text: target.type === 'IMAGE' ? 'Hình ảnh' : target.type === 'VIDEO' ? 'Video'
      : target.content?.trim() || (target.type === 'EMOJI' ? 'Biểu cảm' : 'Tin nhắn không có nội dung'),
    isDeleted: false, mediaType: target.type, mediaUrl: media ? target.content : null,
  };
}
