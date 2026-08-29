/**
 * MessageList.tsx
 *
 * Scrollable list of chat messages.
 *
 * Features:
 *  - Auto-scroll to bottom on new messages.
 *  - "Load more" button at top for older pages (cursor-based).
 *  - Date separator dividers.
 *  - Skeleton loading state.
 *  - Dynamically calculates message delivery status for own messages.
 *  - Propagates reactions, pinning, replies, and deletes down to bubbles.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Loader2, MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MessageBubble } from './MessageBubble';
import type { ChatMessageWithSender } from '../../types/chat';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MessageListProps {
  messages: ChatMessageWithSender[];
  currentUserId: string;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  /** Set of optimistic message IDs that are pending server confirmation. */
  pendingIds?: Set<string>;
  /** Whether the partner is currently online in the chat room. */
  isPartnerOnline: boolean;
  /** The newest message ID read by the partner. */
  partnerLastReadMessageId: string | null;
  /** Action handlers passed from ChatRoom */
  onReply: (message: ChatMessageWithSender) => void;
  onPin: (messageId: string, isPinned: boolean) => void;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
}

// ---------------------------------------------------------------------------
// Date separator
// ---------------------------------------------------------------------------

const DateSeparator: React.FC<{ date: Date }> = ({ date }) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let label: string;
  if (isSameDay(date, today)) label = 'Hôm nay';
  else if (isSameDay(date, yesterday)) label = 'Hôm qua';
  else label = format(date, 'EEEE, dd/MM/yyyy', { locale: vi });

  return (
    <div className="flex items-center gap-3 my-4 px-2">
      <div className="flex-1 h-px bg-canvas-dark" />
      <span className="text-[11px] font-semibold text-text-soft uppercase tracking-wider shrink-0 select-none">
        {label}
      </span>
      <div className="flex-1 h-px bg-canvas-dark" />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Skeleton placeholder
// ---------------------------------------------------------------------------

const MessageSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3 p-4">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className={cn('flex items-end gap-2 animate-pulse', i % 2 === 0 ? 'flex-row' : 'flex-row-reverse')}
      >
        {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-canvas-dark shrink-0" />}
        <div
          className={cn(
            'h-10 rounded-2xl bg-canvas-dark',
            i % 2 === 0 ? 'w-40' : 'w-32 bg-brand-light/40',
          )}
        />
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isLoading,
  isFetchingMore,
  hasMore,
  onLoadMore,
  pendingIds,
  isPartnerOnline,
  partnerLastReadMessageId,
  onReply,
  onPin,
  onReact,
  onDelete,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const newestMsgId = messages[0]?.id;
  const prevNewestMsgIdRef = useRef<string | undefined>(newestMsgId);
  const userScrolledUpRef = useRef(false);

  // Scroll-to-bottom: fires when a genuinely new message arrives at position [0] (newest first)
  useEffect(() => {
    const prevId = prevNewestMsgIdRef.current;
    prevNewestMsgIdRef.current = newestMsgId;

    // Trigger scroll down only if a new message arrived at the top of array (newest position)
    const isNewMessageArrived = newestMsgId && newestMsgId !== prevId;
    if (isNewMessageArrived && !userScrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [newestMsgId]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distanceFromBottom > 80;
  }, []);

  const displayed = [...messages].reverse();

  // Build date-separator insertion map
  const withSeparators: Array<{ type: 'message'; msg: ChatMessageWithSender } | { type: 'separator'; date: Date }> = [];
  let lastDate: Date | null = null;
  for (const msg of displayed) {
    const msgDate = new Date(msg.created_at);
    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      withSeparators.push({ type: 'separator', date: msgDate });
      lastDate = msgDate;
    }
    withSeparators.push({ type: 'message', msg });
  }

  // Pre-resolve the partner's last read message timestamp for fast O(1) comparison in the loop
  const partnerLastReadTime = React.useMemo(() => {
    if (!partnerLastReadMessageId) return null;
    const match = messages.find((m) => m.id === partnerLastReadMessageId);
    return match ? new Date(match.created_at).getTime() : null;
  }, [messages, partnerLastReadMessageId]);

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 space-y-1 scroll-smooth"
      aria-label="Cuộc trò chuyện"
    >
      {/* Load-more trigger */}
      {hasMore && (
        <div className="flex justify-center py-2">
          <button
            onClick={onLoadMore}
            disabled={isFetchingMore}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-accent disabled:opacity-50 transition-colors py-1.5 px-3 rounded-pill border border-brand-light hover:bg-brand-light/30"
          >
            {isFetchingMore ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" /> Đang tải…
              </>
            ) : (
              'Tải tin nhắn cũ hơn'
            )}
          </button>
        </div>
      )}

      {/* Skeleton */}
      {isLoading && <MessageSkeleton />}

      {/* Empty state */}
      {!isLoading && displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
          <div className="w-14 h-14 rounded-full bg-brand-light/40 flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-brand-light" />
          </div>
          <p className="text-text-soft text-sm font-medium">Chưa có tin nhắn nào.</p>
          <p className="text-text-soft text-xs">Hãy gửi lời nhắn đầu tiên nhé 💚</p>
        </div>
      )}

      {/* Message list */}
      <AnimatePresence initial={false}>
        {withSeparators.map((item) => {
          if (item.type === 'separator') {
            return (
              <motion.div
                key={`sep-${item.date.toISOString()}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <DateSeparator date={item.date} />
              </motion.div>
            );
          }

          const { msg } = item;
          const isOwn = msg.sender_id === currentUserId;
          const isPending = pendingIds?.has(msg.id) ?? false;

          // Determine message status
          let status: 'sending' | 'sent' | 'received' | 'read' | undefined;
          if (isOwn) {
            if (isPending) {
              status = 'sending';
            } else {
              const isRead = partnerLastReadTime
                ? new Date(msg.created_at).getTime() <= partnerLastReadTime
                : false;

              if (isRead) {
                status = 'read';
              } else if (isPartnerOnline) {
                status = 'received';
              } else {
                status = 'sent';
              }
            }
          }

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={isOwn}
              isPending={isPending}
              status={status}
              currentUserId={currentUserId}
              onReply={onReply}
              onPin={onPin}
              onReact={onReact}
              onDelete={onDelete}
            />
          );
        })}
      </AnimatePresence>

      {/* Auto-scroll anchor */}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
};
