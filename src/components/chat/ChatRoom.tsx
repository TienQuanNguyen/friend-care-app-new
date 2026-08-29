/**
 * ChatRoom.tsx
 *
 * Top-level chat page component. Wires together:
 *  - useChatMessages (Phase 1 hook) for data + Realtime messages
 *  - useMediaUpload for file uploads
 *  - Supabase Presence for typing indicators & message read/received delivery status
 *  - MessageList + MessageInput UI components
 *  - Optimistic UI (pending message state) with safe immediate cleanup to prevent duplicates
 *  - Message Pinning Banner with scroll-to-message click behaviors.
 *  - Emojis reaction toggling persisted to the database.
 *  - Message reply thread context propagation.
 *  - Soft-deletes (Recall) via softDeleteMessage.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleDashed, WifiOff, Pin, X } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '../../contexts/AuthContext';
import { useCareSpace } from '../../contexts/CareSpaceContext';
import { useActivityLog } from '../../hooks/useActivityLog';
import {
  useChatMessages,
  sendMessage,
  softDeleteMessage,
  updateMessageReactions,
  togglePinMessage,
} from '../../hooks/useChatMessages';
import { useMediaUpload } from '../../hooks/useMediaUpload';
import { supabaseRealtime } from '../../utils/supabase';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { ChatMessageWithSender, MessageType } from '../../types/chat';

// ---------------------------------------------------------------------------
// Presence shape
// ---------------------------------------------------------------------------

interface PresenceState {
  user_id: string;
  isTyping: boolean;
  lastReadMessageId: string | null;
}

// ---------------------------------------------------------------------------
// Optimistic message helper
// ---------------------------------------------------------------------------

function makePendingMessage(
  id: string,
  senderId: string,
  careSpaceId: string,
  content: string | null,
  type: MessageType,
  senderProfile: { display_name: string; avatar_emoji: string } | null,
  replyTo: ChatMessageWithSender | null,
): ChatMessageWithSender {
  return {
    id,
    care_space_id: careSpaceId,
    sender_id: senderId,
    content,
    type,
    reply_to_id: replyTo?.id ?? null,
    is_deleted: false,
    created_at: new Date().toISOString(),
    sender: senderProfile,
    reply_to: replyTo
      ? {
          id: replyTo.id,
          content: replyTo.content,
          type: replyTo.type,
          sender_id: replyTo.sender_id,
          is_deleted: replyTo.is_deleted,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ChatRoom: React.FC = () => {
  const { user } = useAuth();
  const { careSpace, profiles } = useCareSpace();
  const { log } = useActivityLog();

  const careSpaceId = careSpace?.id ?? null;

  // ── Phase-1 data hook ────────────────────────────────────────────────────
  const { messages, setMessages, isLoading, isFetchingMore, error, hasMore, loadMore } =
    useChatMessages(careSpaceId);

  // ── Media upload ─────────────────────────────────────────────────────────
  const { upload, progress: uploadProgress, isUploading } = useMediaUpload();

  // ── Local sending state to prevent input lock bugs ────────────────────────
  const [isSending, setIsSending] = useState(false);

  // ── Dynamic Visual Viewport Height for Mobile Keyboard ───────────────────
  const [viewportHeight, setViewportHeight] = useState('100%');

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      setViewportHeight('100%');
      return;
    }

    if (!window.visualViewport) {
      setViewportHeight('100dvh');
      return;
    }

    const handleResize = () => {
      if (!window.visualViewport) return;
      const headerOffset = 0; // No header on chat page
      setViewportHeight(`${window.visualViewport.height - headerOffset}px`);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  // ── Reply state ───────────────────────────────────────────────────────────
  const [replyTo, setReplyTo] = useState<ChatMessageWithSender | null>(null);

  // ── Optimistic UI ─────────────────────────────────────────────────────────
  const [pendingMessages, setPendingMessages] = useState<
    Map<string, ChatMessageWithSender>
  >(new Map());

  const pendingIds = useMemo(() => new Set(pendingMessages.keys()), [pendingMessages]);

  // Combined list: real messages + pending ones prepended
  const allMessages = useMemo(() => {
    const pending = [...pendingMessages.values()];
    return [...pending, ...messages];
  }, [messages, pendingMessages]);

  // ── Pinned messages banner preview ────────────────────────────────────────
  const newestPinnedMessage = useMemo(() => {
    return messages.find((m) => m.is_pinned && !m.is_deleted) || null;
  }, [messages]);

  // Scroll to message utility
  const handleScrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Temporary highlight animation
      el.classList.add('bg-brand-light/35');
      setTimeout(() => {
        el.classList.remove('bg-brand-light/35');
      }, 1500);
    }
  }, []);

  // ── Typing presence & Read status state ────────────────────────────────────
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isMyTyping, setIsMyTyping] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [partnerLastReadMessageId, setPartnerLastReadMessageId] = useState<string | null>(null);

  // Listen to Presence channel updates
  useEffect(() => {
    if (!careSpaceId || !user) return;

    const channelName = `presence:chat:${careSpaceId}`;
    const channel = supabaseRealtime.channel(channelName, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        
        // 1. Determine if partner is online
        const onlinePartner = Object.keys(state).find((id) => id !== user.id);
        setIsPartnerOnline(!!onlinePartner);

        // 2. Determine typing users
        const typing = Object.entries(state)
          .flatMap(([, presences]) => presences)
          .filter((p) => p.isTyping && p.user_id !== user.id)
          .map((p) => p.user_id);
        setTypingUsers(typing);

        // 3. Track partner's last read message ID
        const partnerPresence = Object.entries(state)
          .flatMap(([, presences]) => presences)
          .find((p) => p.user_id !== user.id);
        
        if (partnerPresence?.lastReadMessageId) {
          setPartnerLastReadMessageId(partnerPresence.lastReadMessageId);
        } else {
          setPartnerLastReadMessageId(null);
        }
      })
      .subscribe();

    presenceChannelRef.current = channel;

    return () => {
      void supabaseRealtime.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [careSpaceId, user]);

  // Broadcast our own presence details (typing and last read message ID)
  const newestMessageId = messages[0]?.id || null;

  useEffect(() => {
    if (!presenceChannelRef.current || !user) return;
    void presenceChannelRef.current.track({
      user_id: user.id,
      isTyping: isMyTyping,
      lastReadMessageId: newestMessageId,
    });
  }, [isMyTyping, newestMessageId, user]);

  const typingNames = useMemo(() => {
    return typingUsers
      .map((uid) => profiles.find((p) => p.user_id === uid)?.display_name ?? 'Người bạn')
      .slice(0, 2);
  }, [typingUsers, profiles]);

  const myProfile = useMemo(
    () => (user ? profiles.find((p) => p.user_id === user.id) : null),
    [profiles, user],
  );

  // ── Send handlers ─────────────────────────────────────────────────────────

  const addOptimistic = useCallback(
    (content: string | null, type: MessageType): string => {
      if (!user || !careSpaceId) return '';
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const pending = makePendingMessage(
        tempId,
        user.id,
        careSpaceId,
        content,
        type,
        myProfile ? { display_name: myProfile.display_name, avatar_emoji: myProfile.avatar_emoji } : null,
        replyTo,
      );
      setPendingMessages((prev) => new Map(prev).set(tempId, pending));
      return tempId;
    },
    [user, careSpaceId, myProfile, replyTo],
  );

  const removePending = useCallback((tempId: string) => {
    setPendingMessages((prev) => {
      const next = new Map(prev);
      next.delete(tempId);
      return next;
    });
  }, []);

  const handleSendText = useCallback(
    async (text: string) => {
      if (!user || !careSpaceId) return;
      const tempId = addOptimistic(text, 'TEXT');
      const currentReply = replyTo;
      setReplyTo(null);

      try {
        setIsSending(true);
        await sendMessage(careSpaceId, user.id, {
          content: text,
          type: 'TEXT',
          replyToId: currentReply?.id,
        });
        log('chat_message');
      } catch (err) {
        console.error('[ChatRoom] sendMessage failed:', err);
      } finally {
        removePending(tempId);
        setIsSending(false);
      }
    },
    [user, careSpaceId, replyTo, addOptimistic, removePending],
  );

  const handleSendEmoji = useCallback(
    async (emoji: string) => {
      if (!user || !careSpaceId) return;
      const tempId = addOptimistic(emoji, 'EMOJI');
      const currentReply = replyTo;
      setReplyTo(null);

      try {
        setIsSending(true);
        await sendMessage(careSpaceId, user.id, {
          content: emoji,
          type: 'EMOJI',
          replyToId: currentReply?.id,
        });
      } catch (err) {
        console.error('[ChatRoom] sendMessage failed:', err);
      } finally {
        removePending(tempId);
        setIsSending(false);
      }
    },
    [user, careSpaceId, replyTo, addOptimistic, removePending],
  );

  const handleSendMedia = useCallback(
    async (file: File) => {
      if (!user || !careSpaceId) return;

      try {
        setIsSending(true);
        const { publicUrl, type } = await upload(file, user.id);
        const tempId = addOptimistic(publicUrl, type);
        const currentReply = replyTo;
        setReplyTo(null);

        try {
          await sendMessage(careSpaceId, user.id, {
            content: publicUrl,
            type,
            replyToId: currentReply?.id,
          });
        } catch {
          // ignore
        } finally {
          removePending(tempId);
        }
      } catch (err) {
        alert((err as Error).message);
      } finally {
        setIsSending(false);
      }
    },
    [user, careSpaceId, upload, replyTo, addOptimistic, removePending],
  );

  // ── Reaction, Pin, and Recall handlers ────────────────────────────────────

  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return;
      const match = messages.find((m) => m.id === messageId);
      if (!match) return;

      const currentReactions = match.reactions || {};
      const newReactions = { ...currentReactions };

      if (newReactions[user.id] === emoji) {
        delete newReactions[user.id];
      } else {
        newReactions[user.id] = emoji;
      }

      // Optimistic local update
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: newReactions } : m))
      );

      try {
        await updateMessageReactions(messageId, newReactions);
      } catch (err) {
        console.error('[ChatRoom] handleReact failed:', err);
        // Rollback on failure
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: currentReactions } : m))
        );
      }
    },
    [user, messages, setMessages],
  );

  const handlePin = useCallback(async (messageId: string, isPinned: boolean) => {
    try {
      await togglePinMessage(messageId, isPinned);
    } catch (err) {
      console.error('[ChatRoom] handlePin failed:', err);
    }
  }, []);

  const handleRecall = useCallback(async (messageId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn thu hồi tin nhắn này?')) return;
    try {
      await softDeleteMessage(messageId);
    } catch (err) {
      console.error('[ChatRoom] handleRecall failed:', err);
    }
  }, []);

  const activeSending = isSending || isUploading;

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (!user || !careSpaceId) {
    return (
      <div className="flex items-center justify-center h-full text-text-soft text-sm select-none">
        Đang kết nối…
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{ height: viewportHeight }}
      className="flex flex-col min-h-0 bg-canvas overflow-hidden w-full relative"
    >
      {/* Floating Back Button for Mobile (Since header is hidden) */}
      <div className="absolute top-2 left-2 z-50 md:hidden">
        <button
          onClick={() => window.history.back()}
          className="p-2 bg-white/70 backdrop-blur-md rounded-full shadow-sm text-text-main hover:bg-white/90 border border-black/5"
          aria-label="Quay lại"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
        </button>
      </div>

      {/* Floating Connection Status Badge */}
      {error && (
        <div className="absolute top-4 right-14 z-50 flex items-center gap-1.5 text-[11px] bg-red-50 text-semantic-destructive font-semibold px-3 py-1.5 rounded-full shadow border border-red-200 animate-pulse select-none">
          <WifiOff className="w-3.5 h-3.5" /> Mất kết nối
        </div>
      )}

      {/* ── Pinned Message Banner ── */}
      <AnimatePresence>
        {newestPinnedMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 bg-brand-light/30 border-b border-brand-light/60 px-4 py-2.5 flex items-center gap-3 shadow-sm select-none cursor-pointer z-10"
            onClick={() => handleScrollToMessage(newestPinnedMessage.id)}
          >
            <Pin className="w-4 h-4 text-brand-accent rotate-45 shrink-0" />
            <div className="flex-1 text-xs text-brand-accent truncate">
              <span className="font-bold">Ghim: </span>
              <span className="opacity-90">
                {newestPinnedMessage.sender?.display_name ?? 'Người dùng'}:{' '}
                {newestPinnedMessage.is_deleted
                  ? 'Tin nhắn đã thu hồi'
                  : newestPinnedMessage.type === 'IMAGE'
                  ? '📷 Hình ảnh'
                  : newestPinnedMessage.type === 'VIDEO'
                  ? '🎥 Video'
                  : (newestPinnedMessage.content || '')}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation(); // prevent triggering scroll-to click
                void handlePin(newestPinnedMessage.id, false);
              }}
              className="p-1 rounded-full hover:bg-brand-light/60 text-brand-accent transition-colors"
              title="Bỏ ghim"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Message list ── */}
      <MessageList
        messages={allMessages}
        currentUserId={user.id}
        isLoading={isLoading}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        pendingIds={pendingIds}
        isPartnerOnline={isPartnerOnline}
        partnerLastReadMessageId={partnerLastReadMessageId}
        onReply={setReplyTo}
        onPin={handlePin}
        onReact={handleReact}
        onDelete={handleRecall}
        onScrollToMessage={handleScrollToMessage}
      />

      {/* ── Typing indicator ── */}
      <AnimatePresence>
        {typingNames.length > 0 && (
          <motion.div
            key="typing-indicator"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="shrink-0 px-4 pb-1.5 flex items-center gap-1.5 select-none"
          >
            <div className="flex items-center gap-0.5 bg-white rounded-full px-2 py-1 shadow-sm border border-canvas-dark">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-brand-light"
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] text-text-soft italic">
              {typingNames.join(', ')} đang nhập…
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input ── */}
      <MessageInput
        onSendText={handleSendText}
        onSendMedia={handleSendMedia}
        onSendEmoji={handleSendEmoji}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        uploadProgress={uploadProgress}
        isSending={activeSending}
        onTypingChange={setIsMyTyping}
      />
    </div>
  );
};
