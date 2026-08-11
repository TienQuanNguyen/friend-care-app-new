/**
 * MessageBubble.tsx
 *
 * Renders a single chat message bubble.
 *
 * Features:
 *  - Mobile-first, strict flexbox properties.
 *  - Text wraps properly without overflowing via break-words and whitespace-pre-wrap.
 *  - Sender (Right): wrapper uses flex flex-col items-end, bubble is bg-teal-700 text-white.
 *  - Receiver (Left): wrapper uses flex flex-col items-start, bubble is bg-white text-gray-800 shadow-sm.
 *  - Timestamp: placed outside and below the bubble with mt-1 text-xs text-gray-400.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import type { ChatMessageWithSender } from '../../types/chat';

export interface MessageBubbleProps {
  message: ChatMessageWithSender;
  isOwn: boolean;
  isPending?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  isPending = false,
}) => {
  const timeLabel = format(new Date(message.created_at), 'HH:mm', { locale: vi });
  const avatarEmoji = message.sender?.avatar_emoji ?? '👤';
  const senderName = message.sender?.display_name ?? 'Người dùng';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isPending ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'flex items-start gap-2.5 w-full my-2',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar (Left side only for receiver) */}
      {!isOwn && (
        <div
          className="w-8 h-8 rounded-full bg-canvas-cool flex items-center justify-center text-lg shrink-0 shadow-sm border border-white"
          aria-label={senderName}
        >
          {avatarEmoji}
        </div>
      )}

      {/* Bubble + Timestamp Wrapper */}
      <div
        className={cn(
          'flex flex-col max-w-[75%] sm:max-w-[65%]',
          isOwn ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender display name (Receiver only) */}
        {!isOwn && (
          <span className="text-[11px] font-semibold text-text-soft mb-1 pl-1">
            {senderName}
          </span>
        )}

        {/* Message Bubble Container */}
        <div
          className={cn(
            'break-words whitespace-pre-wrap text-[14.5px] leading-snug',
            isOwn
              ? 'px-4 py-2 rounded-2xl rounded-tr-sm bg-teal-700 text-white'
              : 'px-4 py-2 rounded-2xl rounded-tl-sm bg-white text-gray-800 shadow-sm',
            // Special styling for non-deleted media or emojis to prevent nesting inside solid colors
            message.type === 'EMOJI' && !message.is_deleted && 'bg-transparent border-0 shadow-none p-1 text-4xl',
            message.type === 'IMAGE' && !message.is_deleted && 'bg-transparent border-0 shadow-none p-0',
            message.type === 'VIDEO' && !message.is_deleted && 'bg-transparent border-0 shadow-none p-0'
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
        </div>

        {/* Timestamp - Positioned outside and below the message bubble container */}
        <span className="text-[11px] text-gray-400 mt-1 px-1 select-none">
          {timeLabel}
        </span>
      </div>
    </motion.div>
  );
};
