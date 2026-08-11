/**
 * MessageBubble.tsx
 *
 * Renders a single chat message bubble.
 *
 * Features:
 *  - Own-message / partner-message alignment
 *  - Avatar + sender name (partner side only)
 *  - Timestamp
 *  - Text, Image, Video, Emoji content types
 *  - Soft-deleted state: shows "Tin nhắn đã thu hồi" in italic
 *  - Reply preview block above the bubble
 *  - Optimistic "Đang gửi…" dimming state
 *  - Long-press on mobile to reveal the reply action
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CornerUpLeft, CornerDownRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ChatMessageWithSender } from '../../types/chat';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MessageBubbleProps {
  message: ChatMessageWithSender;
  isOwn: boolean;
  /** If true the message is pending server confirmation (optimistic UI). */
  isPending?: boolean;
  /** Called when the user taps the reply button. */
  onReply?: (message: ChatMessageWithSender) => void;
}

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
        'flex items-start gap-1.5 px-3 py-1.5 rounded-xl mb-1 text-xs max-w-[90%]',
        'border-l-2',
        isOwn
          ? 'border-brand-light/80 bg-brand/10 text-brand self-end'
          : 'border-gold/60 bg-gold-lightest/60 text-text-soft self-start',
      )}
    >
      <CornerDownRight className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
      <span className={cn('truncate max-w-[200px]', reply.is_deleted && 'italic opacity-60')}>
        {text}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-component: Message Content
// ---------------------------------------------------------------------------

const MessageContent: React.FC<{
  message: ChatMessageWithSender;
  isOwn: boolean;
}> = ({ message, isOwn }) => {
  if (message.is_deleted) {
    return (
      <p className="italic text-[13px] opacity-50 select-none">Tin nhắn đã thu hồi</p>
    );
  }

  if (message.type === 'EMOJI') {
    return (
      <span
        className="text-4xl leading-none block select-text"
        role="img"
        aria-label="emoji"
      >
        {message.content}
      </span>
    );
  }

  if (message.type === 'IMAGE' && message.content) {
    return (
      <a href={message.content} target="_blank" rel="noopener noreferrer">
        <img
          src={message.content}
          alt="Ảnh"
          loading="lazy"
          className="rounded-xl max-w-[240px] max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }

  if (message.type === 'VIDEO' && message.content) {
    return (
      <video
        src={message.content}
        controls
        playsInline
        className="rounded-xl max-w-[260px] max-h-60 bg-black"
        aria-label="Video"
      />
    );
  }

  // Default: TEXT
  return (
    <p
      className={cn(
        'text-[14px] leading-snug whitespace-pre-wrap break-words select-text',
        isOwn ? 'text-white' : 'text-text-main',
      )}
    >
      {message.content}
    </p>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  isPending = false,
  onReply,
}) => {
  const [showActions, setShowActions] = useState(false);

  // Long-press support for mobile reply
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const timeLabel = format(new Date(message.created_at), 'HH:mm', { locale: vi });
  const avatarEmoji = message.sender?.avatar_emoji ?? '👤';
  const senderName = message.sender?.display_name ?? 'Người dùng';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isPending ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'flex items-end gap-2 group',
        isOwn ? 'flex-row-reverse' : 'flex-row',
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Avatar — only shown for partner */}
      {!isOwn && (
        <div
          className="w-8 h-8 rounded-full bg-canvas-cool flex items-center justify-center text-lg shrink-0 mb-1 shadow-sm border border-white"
          aria-label={senderName}
        >
          {avatarEmoji}
        </div>
      )}

      {/* Bubble + meta column */}
      <div className={cn('flex flex-col max-w-[75%] sm:max-w-[65%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender name — only partner */}
        {!isOwn && (
          <span className="text-[11px] font-semibold text-text-soft mb-0.5 pl-1">
            {senderName}
          </span>
        )}

        {/* Reply preview */}
        {message.reply_to && (
          <ReplyPreview reply={message.reply_to} isOwn={isOwn} />
        )}

        {/* Bubble */}
        <div
          className={cn(
            'relative px-3 py-2.5 rounded-2xl shadow-sm',
            // Own message: brand green; partner: white
            isOwn
              ? 'bg-brand text-white rounded-br-sm'
              : 'bg-white border border-canvas-dark text-text-main rounded-bl-sm',
            // Emoji / media messages: transparent background
            message.type === 'EMOJI' && !message.is_deleted && 'bg-transparent border-0 shadow-none p-1',
            message.type === 'IMAGE' && !message.is_deleted && 'bg-transparent border-0 shadow-none p-0',
            message.type === 'VIDEO' && !message.is_deleted && 'bg-transparent border-0 shadow-none p-0',
          )}
        >
          <MessageContent message={message} isOwn={isOwn} />

          {/* Pending indicator */}
          {isPending && (
            <span className="absolute -bottom-4 right-0 text-[10px] text-text-soft animate-pulse">
              Đang gửi…
            </span>
          )}
        </div>

        {/* Timestamp row */}
        <div className={cn('flex items-center gap-1.5 mt-1 px-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] text-text-soft">{timeLabel}</span>

          {/* Reply button — visible on hover (desktop) or long-press (mobile) */}
          <AnimatePresence>
            {!message.is_deleted && onReply && (
              <motion.button
                key="reply-btn"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: showActions ? 1 : 0,
                  scale: showActions ? 1 : 0.8,
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
                onClick={() => {
                  onReply(message);
                  setShowActions(false);
                }}
                className={cn(
                  'opacity-0 group-hover:opacity-100 p-1 rounded-full text-text-soft hover:text-brand hover:bg-brand-light/40 transition-all',
                  'touch-manipulation',
                )}
                aria-label="Trả lời"
              >
                <CornerUpLeft className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
