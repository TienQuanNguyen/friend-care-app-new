/**
 * ChatRoom.tsx
 *
 * Top-level chat page component. Wires together:
 *  - useChatMessages (Phase 1 hook) for data + Realtime messages
 *  - useMediaUpload for file uploads
 *  - Supabase Presence for typing indicators
 *  - MessageList + MessageInput UI components
 *  - Optimistic UI (pending message state)
 *
 * The chat is scoped to the current user's care space.
 * The layout is full-height inside AppLayout's <main> scroll container,
 * but the chat list itself has its own internal scroll so the input stays pinned.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleDashed, WifiOff } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '../../contexts/AuthContext';
import { useCareSpace } from '../../contexts/CareSpaceContext';
import { useChatMessages, sendMessage } from '../../hooks/useChatMessages';
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
): ChatMessageWithSender {
  return {
    id,
    care_space_id: careSpaceId,
    sender_id: senderId,
    content,
    type,
    reply_to_id: null,
    is_deleted: false,
    created_at: new Date().toISOString(),
    sender: senderProfile,
    reply_to: null,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ChatRoom: React.FC = () => {
  const { user } = useAuth();
  const { careSpace, profiles } = useCareSpace();

  const careSpaceId = careSpace?.id ?? null;

  // ── Phase-1 data hook ────────────────────────────────────────────────────
  const { messages, isLoading, isFetchingMore, error, hasMore, loadMore } =
    useChatMessages(careSpaceId);

  // ── Media upload ─────────────────────────────────────────────────────────
  const { upload, progress: uploadProgress, isUploading } = useMediaUpload();

  // ── Local sending state to prevent input lock bugs ────────────────────────
  const [isSending, setIsSending] = useState(false);

  // ── Optimistic UI ─────────────────────────────────────────────────────────
  const [pendingMessages, setPendingMessages] = useState<
    Map<string, ChatMessageWithSender>
  >(new Map());

  const pendingIds = useMemo(() => new Set(pendingMessages.keys()), [pendingMessages]);

  // Remove from pending when we see the real INSERT arrive via Realtime.
  useEffect(() => {
    if (pendingMessages.size === 0) return;
    const confirmedIds = new Set(messages.map((m) => m.id));
    const newPending = new Map(pendingMessages);
    let changed = false;
    for (const [id] of newPending) {
      if (confirmedIds.has(id)) {
        newPending.delete(id);
        changed = true;
      }
    }
    if (changed) setPendingMessages(newPending);
  }, [messages, pendingMessages]);

  // Combined list: real messages + pending ones prepended
  const allMessages = useMemo(() => {
    const pending = [...pendingMessages.values()];
    return [...pending, ...messages];
  }, [messages, pendingMessages]);

  // ── Typing presence ───────────────────────────────────────────────────────
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!careSpaceId || !user) return;

    const channelName = `presence:chat:${careSpaceId}`;
    const channel = supabaseRealtime.channel(channelName, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const typing = Object.entries(state)
          .flatMap(([, presences]) => presences)
          .filter((p) => p.isTyping && p.user_id !== user.id)
          .map((p) => p.user_id);
        setTypingUsers(typing);
      })
      .subscribe();

    presenceChannelRef.current = channel;

    return () => {
      void supabaseRealtime.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [careSpaceId, user]);

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
      );
      setPendingMessages((prev) => new Map(prev).set(tempId, pending));
      return tempId;
    },
    [user, careSpaceId, myProfile],
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

      try {
        setIsSending(true);
        await sendMessage(careSpaceId, user.id, {
          content: text,
          type: 'TEXT',
        });
      } catch (err) {
        console.error('[ChatRoom] sendMessage failed:', err);
        removePending(tempId);
      } finally {
        setIsSending(false);
      }
    },
    [user, careSpaceId, addOptimistic, removePending],
  );

  const handleSendEmoji = useCallback(
    async (emoji: string) => {
      if (!user || !careSpaceId) return;
      const tempId = addOptimistic(emoji, 'EMOJI');

      try {
        setIsSending(true);
        await sendMessage(careSpaceId, user.id, {
          content: emoji,
          type: 'EMOJI',
        });
      } catch (err) {
        console.error('[ChatRoom] sendMessage failed:', err);
        removePending(tempId);
      } finally {
        setIsSending(false);
      }
    },
    [user, careSpaceId, addOptimistic, removePending],
  );

  const handleSendMedia = useCallback(
    async (file: File) => {
      if (!user || !careSpaceId) return;

      try {
        setIsSending(true);
        const { publicUrl, type } = await upload(file, user.id);
        const tempId = addOptimistic(publicUrl, type);

        try {
          await sendMessage(careSpaceId, user.id, {
            content: publicUrl,
            type,
          });
        } catch {
          removePending(tempId);
        }
      } catch (err) {
        alert((err as Error).message);
      } finally {
        setIsSending(false);
      }
    },
    [user, careSpaceId, upload, addOptimistic, removePending],
  );

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
    <div className="flex flex-col h-[calc(100dvh-4rem)] md:h-[calc(100dvh-0px)] bg-canvas">
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-canvas-dark shadow-nav z-10 select-none">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-brand-accent flex items-center justify-center shadow-frap-base">
          <MessageCircleDashed className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-[15px] font-bold text-text-main tracking-tight leading-tight">
            Chat phòng
          </h1>
          <p className="text-[11px] text-text-soft">
            {careSpace?.name ?? '…'}
          </p>
        </div>
        {error && (
          <div className="ml-auto flex items-center gap-1 text-[11px] text-semantic-destructive font-medium">
            <WifiOff className="w-3.5 h-3.5" /> Mất kết nối
          </div>
        )}
      </div>

      {/* ── Message list ── */}
      <MessageList
        messages={allMessages}
        currentUserId={user.id}
        isLoading={isLoading}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        pendingIds={pendingIds}
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
        uploadProgress={uploadProgress}
        isSending={activeSending}
        presenceChannel={presenceChannelRef.current}
        currentUserId={user.id}
      />
    </div>
  );
};
