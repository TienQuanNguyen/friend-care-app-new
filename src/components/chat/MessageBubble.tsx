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
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ChatMessageWithSender } from '../../types/chat';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MessageBubbleProps {
  message: ChatMessageWithSender;
  isOwn: boolean;
  isPending?: boolean;
  status?: 'sending' | 'sent' | 'received' | 'read';
  currentUserId: string;
  onReply?: (message: ChatMessageWithSender) => void;
  onPin?: (messageId: string, isPinned: boolean) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
}

const statusLabels = {
  sending: 'Đang gửi',
  sent: 'Đã gửi',
  received: 'Đã nhận',
  read: 'Đã xem',
};

const QUICK_REACTIONS = ['❤️', '😂', '👍'];

// ---------------------------------------------------------------------------
// Sub-component: Reply Preview
// ---------------------------------------------------------------------------

const ReplyPreview: React.FC<{
  reply: ChatMessageWithSender['reply_to'];
  isOwn: boolean;
}> = ({ reply, isOwn }) => {
  if (!reply) return null;

  const text = reply.is_deleted
    ? 'Tin nhắn đã thu hồi'
    : reply.content ?? '[Media]';

  return (
    <div
      className={cn(
        'flex items-start gap-1 px-2.5 py-1 rounded-xl mb-1 text-[11px] max-w-[90%] border-l-2 select-none',
        isOwn
          ? 'border-brand-light/70 bg-brand/10 text-brand self-end'
          : 'border-gold/60 bg-gold-lightest/60 text-text-soft self-start',
      )}
    >
      <CornerDownRight className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
      <span className={cn('truncate max-w-[150px]', reply.is_deleted && 'italic opacity-60')}>
        {text}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  isPending = false,
  status,
  currentUserId,
  onReply,
  onPin,
  onReact,
  onDelete,
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
        {message.reply_to && (
          <ReplyPreview reply={message.reply_to} isOwn={isOwn} />
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
