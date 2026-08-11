/**
 * MessageInput.tsx
 *
 * Composer bar for the chat module.
 *
 * Features:
 *  - Auto-growing textarea (max 4 lines)
 *  - Emoji picker shortcut (6 common emojis)
 *  - Image / video file picker (hidden <input>)
 *  - Upload progress bar
 *  - Reply-to preview strip (dismissible)
 *  - Typing presence broadcast via Supabase Presence API
 *  - Sends on Enter (Shift+Enter = new line) or Send button tap
 *  - Touch-friendly hit targets (min-44px)
 */

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Send,
  Paperclip,
  Smile,
  X,
  CornerDownRight,
  Loader2,
} from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { cn } from '../../lib/utils';
import type { ChatMessageWithSender, MessageType } from '../../types/chat';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MessageInputProps {
  /** Called when the user submits a text message. */
  onSendText: (text: string) => Promise<void>;
  /** Called when the user picks a media file to upload + send. */
  onSendMedia: (file: File) => Promise<void>;
  /** Called when the user taps an emoji shortcut. */
  onSendEmoji: (emoji: string) => Promise<void>;
  /** The message currently being replied to; null = no active reply. */
  replyTo: ChatMessageWithSender | null;
  /** Clear the active reply. */
  onCancelReply: () => void;
  /** Upload progress (0-100). Null when idle. */
  uploadProgress: number | null;
  /** Whether a send/upload is in flight. */
  isSending: boolean;
  /** Supabase Realtime Presence channel for typing indicators. */
  presenceChannel: RealtimeChannel | null;
  /** The current user's ID — used as the Presence key. */
  currentUserId: string;
}

// ---------------------------------------------------------------------------
// Quick-emoji palette
// ---------------------------------------------------------------------------

const QUICK_EMOJIS = ['❤️', '😊', '😂', '🥰', '✨', '👍'];

// ---------------------------------------------------------------------------
// Typing-presence debounce (ms)
// ---------------------------------------------------------------------------

const TYPING_STOP_DELAY_MS = 2000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendText,
  onSendMedia,
  onSendEmoji,
  replyTo,
  onCancelReply,
  uploadProgress,
  isSending,
  presenceChannel,
  currentUserId,
}) => {
  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Auto-resize textarea
  // ---------------------------------------------------------------------------

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineH = parseInt(getComputedStyle(el).lineHeight || '20', 10);
    const maxH = lineH * 4 + 24; // 4 lines + padding
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [text, resizeTextarea]);

  // ---------------------------------------------------------------------------
  // Typing presence
  // ---------------------------------------------------------------------------

  const broadcastTypingStop = useCallback(() => {
    if (!presenceChannel || !isTypingRef.current) return;
    isTypingRef.current = false;
    void presenceChannel.track({ user_id: currentUserId, isTyping: false });
  }, [presenceChannel, currentUserId]);

  const broadcastTypingStart = useCallback(() => {
    if (!presenceChannel) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      void presenceChannel.track({ user_id: currentUserId, isTyping: true });
    }
    // Reset the stop-typing debounce
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(broadcastTypingStop, TYPING_STOP_DELAY_MS);
  }, [presenceChannel, currentUserId, broadcastTypingStop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      broadcastTypingStop();
    };
  }, [broadcastTypingStop]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleTextChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      broadcastTypingStart();
    },
    [broadcastTypingStart],
  );

  const handleSendText = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    broadcastTypingStop();
    setText('');
    // Reset height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await onSendText(trimmed);
  }, [text, isSending, broadcastTypingStop, onSendText]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Send on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSendText();
      }
    },
    [handleSendText],
  );

  const handleEmojiClick = useCallback(
    async (emoji: string) => {
      setShowEmojis(false);
      await onSendEmoji(emoji);
    },
    [onSendEmoji],
  );

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Reset so the same file can be picked again
      e.target.value = '';
      await onSendMedia(file);
    },
    [onSendMedia],
  );

  const canSend = text.trim().length > 0 && !isSending;

  return (
    <div className="border-t border-canvas-dark bg-white">
      {/* Upload progress bar */}
      <AnimatePresence>
        {uploadProgress !== null && (
          <motion.div
            key="progress-bar"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            style={{ transformOrigin: 'left' }}
            className="h-0.5 bg-canvas-dark"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-brand to-brand-accent rounded-full"
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply-to strip */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            key="reply-strip"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="flex items-center gap-2 px-3 pt-2 pb-0"
          >
            <CornerDownRight className="w-3.5 h-3.5 text-brand shrink-0" />
            <div className="flex-1 bg-brand-light/30 rounded-lg px-2.5 py-1.5 text-xs text-brand-accent border-l-2 border-brand">
              <span className="font-semibold">{replyTo.sender?.display_name ?? 'Người dùng'}: </span>
              <span className="opacity-80 truncate">
                {replyTo.is_deleted ? 'Tin nhắn đã thu hồi' : (replyTo.content ?? '[Media]')}
              </span>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 rounded-full hover:bg-canvas-cool text-text-soft hover:text-text-main transition-colors"
              aria-label="Hủy trả lời"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmojis && (
          <motion.div
            key="emoji-palette"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex items-center gap-1 px-3 pt-2"
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => void handleEmojiClick(emoji)}
                className="text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-xl hover:bg-canvas-cool active:scale-90 transition-all touch-manipulation"
                aria-label={`Gửi ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => setShowEmojis(false)}
              className="ml-auto p-1 text-text-soft hover:text-text-main"
              aria-label="Đóng emoji"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input row */}
      <div className="flex items-end gap-2 px-3 py-2.5">
        {/* Emoji button */}
        <button
          type="button"
          onClick={() => setShowEmojis((v) => !v)}
          className={cn(
            'shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-colors touch-manipulation',
            showEmojis
              ? 'bg-brand-light text-brand'
              : 'text-text-soft hover:text-brand hover:bg-brand-light/40',
          )}
          aria-label="Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Media button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-text-soft hover:text-brand hover:bg-brand-light/40 transition-colors disabled:opacity-40 touch-manipulation"
          aria-label="Đính kèm ảnh hoặc video"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Text area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Nhắn gì đó…"
          rows={1}
          className={cn(
            'flex-1 resize-none bg-canvas-cool rounded-2xl px-4 py-2.5',
            'text-[14px] text-text-main placeholder:text-text-soft',
            'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:bg-white',
            'transition-all duration-200 leading-snug',
            'max-h-28 overflow-y-auto scrollbar-thin',
          )}
          aria-label="Tin nhắn"
        />

        {/* Send button */}
        <motion.button
          type="button"
          onClick={() => void handleSendText()}
          disabled={!canSend}
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          className={cn(
            'shrink-0 w-10 h-10 flex items-center justify-center rounded-full',
            'transition-all duration-200 touch-manipulation',
            canSend
              ? 'bg-brand text-white shadow-frap-base'
              : 'bg-canvas-cool text-text-soft',
          )}
          aria-label="Gửi"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4 translate-x-px" />
          )}
        </motion.button>
      </div>
    </div>
  );
};
