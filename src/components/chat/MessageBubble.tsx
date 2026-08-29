/**
 * MessageBubble.tsx
 *
 * Renders a single chat message bubble with:
 *  - Chronological flex alignments.
 *  - Floating reactions pill on bubble corner (like iMessage/Messenger).
 *  - Parent reply previews above the main text.
 *  - Pinned message indicator icon (📌).
 *  - Hover toolbar (desktop/hover) & action handlers for Reactions, Reply, Pin, and Recall.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  CornerDownRight,
  CornerUpLeft,
  Pin,
  Trash2,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ChatMessageWithSender } from '../../types/chat';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MessageBubbleProps {
  message: ChatMessageWithSender;
  allMessages?: ChatMessageWithSender[];
  isOwn: boolean;
  isPending?: boolean;
  status?: 'sending' | 'sent' | 'received' | 'read';
  currentUserId: string;
  onReply?: (message: ChatMessageWithSender) => void;
  onPin?: (messageId: string, isPinned: boolean) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
  onScrollToMessage?: (messageId: string) => void;
}

const statusLabels = {
  sending: 'Đang gửi',
  sent: 'Đã gửi',
  received: 'Đã nhận',
  read: 'Đã xem',
};

const QUICK_REACTIONS = ['❤️', '😂', '🥺', '🥰', '😘', '😢', '😡'];

// ---------------------------------------------------------------------------
// Helper: Helper for formatting reply content
// ---------------------------------------------------------------------------

export function renderReplyContent(
  replyMsg: ChatMessageWithSender['reply_to'] | null,
  allMessages?: ChatMessageWithSender[],
  replyToId?: string | null
) {
  let target = replyMsg;
  if (!target && replyToId && allMessages) {
    const found = allMessages.find((m) => m.id === replyToId);
    if (found) {
      target = {
        id: found.id,
        content: found.content,
        type: found.type,
        sender_id: found.sender_id,
        is_deleted: found.is_deleted,
        sender: found.sender,
      };
    }
  }

  if (!target || target.is_deleted) {
    return {
      senderName: target?.sender?.display_name ?? null,
      text: 'Tin nhắn đã bị xóa',
      isDeleted: true,
      mediaType: null,
      mediaUrl: null,
    };
  }

  const senderName = target.sender?.display_name ?? null;

  if (target.type === 'IMAGE') {
    return {
      senderName,
      text: 'Hình ảnh',
      isDeleted: false,
      mediaType: 'IMAGE' as const,
      mediaUrl: target.content,
    };
  }

  if (target.type === 'VIDEO') {
    return {
      senderName,
      text: 'Video',
      isDeleted: false,
      mediaType: 'VIDEO' as const,
      mediaUrl: target.content,
    };
  }

  if (target.type === 'EMOJI') {
    return {
      senderName,
      text: target.content ?? 'Biểu cảm',
      isDeleted: false,
      mediaType: 'EMOJI' as const,
      mediaUrl: null,
    };
  }

  return {
    senderName,
    text: target.content || '',
    isDeleted: false,
    mediaType: 'TEXT' as const,
    mediaUrl: null,
  };
}

// ---------------------------------------------------------------------------
// Sub-component: Reply Preview (Instagram Style)
// ---------------------------------------------------------------------------

const ReplyPreview: React.FC<{
  reply: ChatMessageWithSender['reply_to'];
  replyToId?: string | null;
  allMessages?: ChatMessageWithSender[];
  isOwn: boolean;
  senderName: string;
  onScrollToMessage?: (messageId: string) => void;
}> = ({ reply, replyToId, allMessages, isOwn, senderName, onScrollToMessage }) => {
  const replyInfo = React.useMemo(() => {
    if (!reply && !replyToId) return null;
    return renderReplyContent(reply, allMessages, replyToId);
  }, [reply, replyToId, allMessages]);

  if (!replyInfo) return null;

  const headerLabel = isOwn
    ? `Bạn đã trả lời ${replyInfo.senderName ?? 'tin nhắn'}`
    : `${senderName} đã trả lời ${replyInfo.senderName ?? 'tin nhắn'}`;

  return (
    <div className={cn('flex flex-col mb-1 max-w-full', isOwn ? 'items-end' : 'items-start')}>
      {/* ── Muted floating header line (Instagram Style) ── */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          const targetId = reply?.id || replyToId;
          if (targetId) onScrollToMessage?.(targetId);
        }}
        className={cn(
          'text-[11px] text-text-soft/80 font-normal flex items-center gap-1 mb-0.5 select-none cursor-pointer hover:underline hover:text-brand transition-colors',
          isOwn ? 'pr-0.5' : 'pl-0.5'
        )}
        title="Nhấn để xem tin nhắn gốc"
      >
        <CornerDownRight className="w-3 h-3 text-text-soft/70 shrink-0" />
        <span className="truncate max-w-[240px] sm:max-w-[320px]">
          {headerLabel}
        </span>
      </div>

      {/* ── Quoted message preview box ── */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          const targetId = reply?.id || replyToId;
          if (targetId) onScrollToMessage?.(targetId);
        }}
        className={cn(
          'flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs select-none cursor-pointer transition-all hover:opacity-95 max-w-full',
          isOwn
            ? 'bg-black/15 text-white/90 border-l-2 border-white/80'
            : 'bg-canvas-cool/90 text-text-soft border-l-2 border-brand/70 shadow-2xs'
        )}
        title="Nhấn để xem tin nhắn gốc"
      >
        {/* Thumbnail if Image */}
        {replyInfo.mediaUrl && replyInfo.mediaType === 'IMAGE' && !replyInfo.isDeleted && (
          <img
            src={replyInfo.mediaUrl}
            alt="thumbnail"
            className="w-7 h-7 rounded object-cover shrink-0 border border-black/10"
          />
        )}
        {/* Video icon if Video */}
        {replyInfo.mediaType === 'VIDEO' && !replyInfo.isDeleted && (
          <div className="w-7 h-7 rounded bg-black/20 flex items-center justify-center shrink-0">
            <Film className="w-3.5 h-3.5 text-white" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className={cn('text-[11.5px] truncate leading-tight', replyInfo.isDeleted && 'italic opacity-75')}>
            {replyInfo.text}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  allMessages,
  isOwn,
  isPending = false,
  status,
  currentUserId,
  onReply,
  onPin,
  onReact,
  onDelete,
  onScrollToMessage,
}) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const timeLabel = format(new Date(message.created_at), 'HH:mm', { locale: vi });
  const avatarEmoji = message.sender?.avatar_emoji ?? '👤';
  const senderName = message.sender?.display_name ?? 'Người dùng';

  // Format reactions list
  const reactionsList = Object.entries(message.reactions || {}).map(([userId, emoji]) => ({
    userId,
    emoji,
  }));

  // Handle double-tap or long-press on mobile to trigger action menu
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = () => {
    if (message.is_deleted) return;
    longPressTimer.current = setTimeout(() => {
      setShowMobileMenu(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isPending ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      id={`msg-${message.id}`}
      className={cn(
        'flex items-start gap-2.5 w-full my-3 group relative',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Avatar (Receiver side only) */}
      {!isOwn && (
        <div
          className="w-8 h-8 rounded-full bg-canvas-cool flex items-center justify-center text-lg shrink-0 shadow-sm border border-white select-none"
          aria-label={senderName}
        >
          {avatarEmoji}
        </div>
      )}

      {/* Bubble + Metadata Column */}
      <div
        className={cn(
          'flex flex-col relative max-w-[75%] sm:max-w-[65%]',
          isOwn ? 'items-end' : 'items-start'
        )}
      >
        {/* Pinned label indicator above name */}
        {message.is_pinned && (
          <span className="text-[10px] text-brand-accent font-semibold flex items-center gap-0.5 mb-0.5 select-none">
            <Pin className="w-2.5 h-2.5 rotate-45 fill-brand-accent/30" /> Ghim phòng chat
          </span>
        )}

        {/* Sender Display Name (Receiver only) */}
        {!isOwn && (
          <span className="text-[11px] font-semibold text-text-soft mb-1 pl-1 select-none">
            {senderName}
          </span>
        )}

        {/* Reply Preview Above Main Message */}
        {(message.reply_to || message.reply_to_id) && (
          <ReplyPreview
            reply={message.reply_to}
            replyToId={message.reply_to_id}
            allMessages={allMessages}
            isOwn={isOwn}
            senderName={senderName}
            onScrollToMessage={onScrollToMessage}
          />
        )}

        {/* Message Bubble Container */}
        <div
          className={cn(
            'break-words whitespace-pre-wrap text-[14.5px] leading-snug relative',
            isOwn
              ? 'px-4 py-2 rounded-2xl rounded-tr-sm bg-teal-700 text-white'
              : 'px-4 py-2 rounded-2xl rounded-tl-sm bg-white text-gray-800 shadow-sm border border-canvas-dark/40',
            message.type === 'EMOJI' && !message.is_deleted && 'bg-transparent border-0 shadow-none p-1 text-4xl',
            message.type === 'IMAGE' && !message.is_deleted && 'bg-transparent border-0 shadow-none p-0',
            message.type === 'VIDEO' && !message.is_deleted && 'bg-transparent border-0 shadow-none p-0',
            message.is_pinned && 'border border-brand-light/60 bg-gradient-to-br from-white to-brand-light/10 text-gray-900 shadow-glow'
          )}
        >
          {message.is_deleted ? (
            <p className="italic text-[13px] opacity-65 select-none">Tin nhắn đã thu hồi</p>
          ) : message.type === 'EMOJI' ? (
            <span role="img" aria-label="emoji" className="select-text">
              {message.content}
            </span>
          ) : message.type === 'IMAGE' && message.content ? (
            <a href={message.content} target="_blank" rel="noopener noreferrer">
              <img
                src={message.content}
                alt="Ảnh"
                loading="lazy"
                className="rounded-xl max-w-[240px] max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              />
            </a>
          ) : message.type === 'VIDEO' && message.content ? (
            <video
              src={message.content}
              controls
              playsInline
              className="rounded-xl max-w-[260px] max-h-60 bg-black"
            />
          ) : (
            <p className="select-text">{message.content}</p>
          )}

          {/* Floating Reactions Pill on bubble corner (Facebook Messenger style) */}
          {reactionsList.length > 0 && !message.is_deleted && (
            <div
              className={cn(
                'absolute -bottom-2.5 bg-white border border-canvas-dark rounded-full px-1.5 py-0.5 shadow-sm flex items-center gap-0.5 z-10 select-none scale-90',
                isOwn ? 'left-2.5' : 'right-2.5'
              )}
            >
              {reactionsList.map(({ userId, emoji }) => (
                <span
                  key={userId}
                  className="text-[12px] leading-none hover:scale-115 transition-transform cursor-help"
                  title={userId === currentUserId ? 'Bạn' : 'Người ấy'}
                >
                  {emoji}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp & Status */}
        <span className="text-[11px] text-gray-400 mt-1 px-1 select-none">
          {timeLabel}
          {isOwn && status && ` • ${statusLabels[status]}`}
        </span>
      </div>

      {/* Action Toolbar - Desktop Hover Toolbar & Mobile Long-press Overlay */}
      {!message.is_deleted && !isPending && (
        <div
          className={cn(
            'absolute -top-9 z-30 bg-white border border-canvas-dark rounded-full shadow-md px-2.5 py-1 items-center gap-2',
            // Desktop: display on group hover. Mobile: display on long press state.
            showMobileMenu ? 'flex' : 'hidden md:group-hover:flex',
            isOwn ? 'right-4' : 'left-4'
          )}
          onMouseLeave={() => setShowMobileMenu(false)}
        >
          {/* Reaction Quick Emojis */}
          <div className="flex items-center gap-1.5 border-r border-canvas-dark pr-2 mr-1">
            {QUICK_REACTIONS.map((emoji) => {
              const hasReacted = message.reactions?.[currentUserId] === emoji;
              return (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact?.(message.id, emoji);
                    setShowMobileMenu(false);
                  }}
                  className={cn(
                    'text-base active:scale-90 transition-all block py-0.5 px-1 rounded hover:bg-canvas-cool',
                    hasReacted && 'bg-brand-light/40 border border-brand-light scale-110'
                  )}
                >
                  {emoji}
                </button>
              );
            })}
          </div>

          {/* Reply Button */}
          {onReply && (
            <button
              onClick={() => {
                onReply(message);
                setShowMobileMenu(false);
              }}
              className="p-1 rounded-full text-text-soft hover:text-brand hover:bg-canvas-cool transition-colors"
              title="Trả lời"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Pin Button */}
          {onPin && (
            <button
              onClick={() => {
                onPin(message.id, !message.is_pinned);
                setShowMobileMenu(false);
              }}
              className={cn(
                'p-1 rounded-full text-text-soft hover:text-brand hover:bg-canvas-cool transition-colors',
                message.is_pinned && 'text-brand-accent fill-brand-light'
              )}
              title={message.is_pinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}
            >
              <Pin className="w-3.5 h-3.5 rotate-45" />
            </button>
          )}

          {/* Recall / Delete Button (Own only) */}
          {isOwn && onDelete && (
            <button
              onClick={() => {
                onDelete(message.id);
                setShowMobileMenu(false);
              }}
              className="p-1 rounded-full text-text-soft hover:text-semantic-destructive hover:bg-red-50 transition-colors"
              title="Thu hồi"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close Menu Trigger (Mobile only) */}
          {showMobileMenu && (
            <button
              onClick={() => setShowMobileMenu(false)}
              className="text-[10px] text-text-soft font-bold border-l border-canvas-dark pl-2 hover:text-text-main"
            >
              Đóng
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};
