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
  Paperclip,
  Smile,
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
  onSendMedia,
  onSendEmoji,
  replyTo,
  onCancelReply,
  uploadProgress,
  isSending,
  onTypingChange,
}) => {
  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [isLocalSending, setIsLocalSending] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleEmojiClick = useCallback(
    async (emoji: string) => {
      if (activeSending) return;
      setShowEmojis(false);

      try {
        setIsLocalSending(true);
        await onSendEmoji(emoji);
      } catch (err) {
        console.error('[MessageInput] onSendEmoji error:', err);
      } finally {
        setIsLocalSending(false);
      }
    },
    [onSendEmoji, activeSending],
  );

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || activeSending) return;
      e.target.value = '';

      try {
        setIsLocalSending(true);
        await onSendMedia(file);
      } catch (err) {
        console.error('[MessageInput] onSendMedia error:', err);
      } finally {
        setIsLocalSending(false);
      }
    },
    [onSendMedia, activeSending],
  );

  const canSend = text.trim().length > 0 && !activeSending;

  return (
    <div
      className="border-t border-canvas-dark bg-white shrink-0"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
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
                disabled={activeSending}
                onClick={() => void handleEmojiClick(emoji)}
                className="text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-xl hover:bg-canvas-cool active:scale-90 transition-all touch-manipulation disabled:opacity-50"
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
          disabled={activeSending}
          onClick={() => setShowEmojis((v) => !v)}
          className={cn(
            'shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-colors touch-manipulation disabled:opacity-50',
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
          disabled={activeSending}
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
