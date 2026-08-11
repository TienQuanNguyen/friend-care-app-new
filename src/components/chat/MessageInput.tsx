/**
 * MessageInput.tsx
 *
 * Composer bar for the chat module.
 *
 * Features:
 *  - Auto-growing textarea (max 4 lines).
 *  - Emoji picker shortcut (6 common emojis).
 *  - Image / video file picker (hidden <input>).
 *  - Upload progress bar.
 *  - Reply preview bar strip.
 *  - Typing events propagated to parent via onTypingChange.
 *  - Sends on Enter (Shift+Enter = new line) or Send button tap.
 *  - Touch-friendly hit targets (min-44px).
 *  - Fixes infinite loading: strict try...catch...finally blocks to unlock input.
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
  X,
  Loader2,
  CornerDownRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ChatMessageWithSender } from '../../types/chat';

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
  /** Callback triggered when user starts or stops typing. */
  onTypingChange?: (isTyping: boolean) => void;
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
  replyTo,
  onCancelReply,
  uploadProgress,
  isSending,
  onTypingChange,
}) => {
  const [text, setText] = useState('');
  const [isLocalSending, setIsLocalSending] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const activeSending = isSending || isLocalSending;

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
    if (!isTypingRef.current) return;
    isTypingRef.current = false;
    onTypingChange?.(false);
  }, [onTypingChange]);

  const broadcastTypingStart = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingChange?.(true);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(broadcastTypingStop, TYPING_STOP_DELAY_MS);
  }, [onTypingChange, broadcastTypingStop]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      broadcastTypingStop();
    };
  }, [broadcastTypingStop]);

  // ---------------------------------------------------------------------------
  // Handlers wrapped in strict try...catch...finally to reset sending state
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
    if (!trimmed || activeSending) return;
    broadcastTypingStop();
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      setIsLocalSending(true);
      await onSendText(trimmed);
    } catch (err) {
      console.error('[MessageInput] onSendText error:', err);
    } finally {
      setIsLocalSending(false);
    }
  }, [text, activeSending, broadcastTypingStop, onSendText]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSendText();
      }
    },
    [handleSendText],
  );



  const canSend = text.trim().length > 0 && !activeSending;

  return (
    <div
      className="border-t border-canvas-dark bg-white shrink-0 flex flex-col"
    >
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

      {/* Reply Preview Bar */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            key="reply-bar"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-4 pt-2.5 pb-0.5 bg-canvas-cool/40 border-b border-canvas-dark"
          >
            <CornerDownRight className="w-3.5 h-3.5 text-brand shrink-0" />
            <div className="flex-1 bg-brand-light/35 rounded-lg px-2.5 py-1 text-xs text-brand-accent border-l-2 border-brand truncate">
              <span className="font-semibold">{replyTo.sender?.display_name ?? 'Người dùng'}: </span>
              <span className="opacity-80">
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

      {/* Input row */}
      <div className="flex items-end gap-2 px-3 py-2">
        {/* Text area */}
        <textarea
          ref={textareaRef}
          value={text}
          disabled={activeSending}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Nhắn gì đó…"
          rows={1}
          className={cn(
            'flex-1 resize-none bg-canvas-cool rounded-2xl px-4 py-2.5',
            'text-[16px] md:text-[14px] text-text-main placeholder:text-text-soft',
            'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:bg-white',
            'transition-all duration-200 leading-snug',
            'max-h-28 overflow-y-auto scrollbar-thin disabled:opacity-75',
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
          {activeSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4 translate-x-px" />
          )}
        </motion.button>
      </div>
    </div>
  );
};
