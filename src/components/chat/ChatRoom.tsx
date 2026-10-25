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
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircleDashed, WifiOff, Pin, X, Bell, ChevronLeft } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '../../contexts/AuthContext';
import { useCareSpace } from '../../contexts/CareSpaceContext';
import { useActivityLog } from '../../hooks/useActivityLog';
import { useWebPush } from '../../hooks/useWebPush';
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
import { ChatSettingsMenu } from './ChatSettingsMenu';
import { useChatNicknames } from '../../hooks/useChatNicknames';
import { chatName, withChatNames } from '../../lib/chatNicknames';
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
          sender: replyTo.sender,
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
  const { permission, needsInstall, isSubscribed, error: pushError, requestPermissionAndSubscribe, isLoading: isPushLoading } = useWebPush();

  const careSpaceId = careSpace?.id ?? null;
  const chatNames = useChatNicknames(careSpaceId, user?.id ?? null);
  const { nicknames } = chatNames;

  // ── Phase-1 data hook ────────────────────────────────────────────────────
  const { messages, setMessages, isLoading, isFetchingMore, error, hasMore, loadMore } =
    useChatMessages(careSpaceId);

  // ── Media upload ─────────────────────────────────────────────────────────
  const { upload, progress: uploadProgress, isUploading } = useMediaUpload();

  // ── Local sending state to prevent input lock bugs ────────────────────────
  const [isSending, setIsSending] = useState(false);

  // ── Dynamic Visual Viewport Height for Mobile Keyboard ───────────────────
  const [viewportHeight, setViewportHeight] = useState('100%');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      setViewportHeight('100%');
      setIsKeyboardOpen(false);
      return;
    }

    if (!window.visualViewport) {
      // dvh = dynamic viewport height, correctly sized on iOS even with address bar
      setViewportHeight('100dvh');
      return;
    }

    const handleResize = () => {
      if (!window.visualViewport) return;
      const vh = window.visualViewport.height;
      setViewportHeight(`${vh}px`);

      // Detect if virtual keyboard is active (viewport shrinks significantly)
      const keyboardActive = vh < window.innerHeight - 100;
      setIsKeyboardOpen(keyboardActive);

      // Prevent iOS Safari from scrolling window/document
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
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
    return [...pending, ...messages].map(message => withChatNames(message, profiles, nicknames));
  }, [messages, pendingMessages, profiles, nicknames]);

  // ── Pinned messages banner preview ────────────────────────────────────────
  const newestPinnedMessage = useMemo(() => {
    const pinned = messages.find((m) => m.is_pinned && !m.is_deleted);
    return pinned ? withChatNames(pinned, profiles, nicknames) : null;
  }, [messages, profiles, nicknames]);

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
      .map(uid => chatName(uid, profiles, nicknames, 'Người bạn'))
      .slice(0, 2);
  }, [typingUsers, profiles, nicknames]);

  const partnerProfile = useMemo(() => {
    return profiles.find((p) => p.user_id !== user?.id) || null;
  }, [profiles, user]);

  const isPartnerTyping = useMemo(() => {
    return typingNames.length > 0;
  }, [typingNames]);

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

      try {
        setIsSending(true);
        await sendMessage(careSpaceId, user.id, {
          content: text,
          type: 'TEXT',
          replyToId: currentReply?.id,
        });
        setReplyTo(previous => previous?.id === currentReply?.id ? null : previous);
        log('chat_message');
      } finally {
        removePending(tempId);
        setIsSending(false);
      }
    },
    [user, careSpaceId, replyTo, addOptimistic, removePending, log],
  );

  const handleSendEmoji = useCallback(
    async (emoji: string) => {
      if (!user || !careSpaceId) return;
      const tempId = addOptimistic(emoji, 'EMOJI');
      const currentReply = replyTo;

      try {
        setIsSending(true);
        await sendMessage(careSpaceId, user.id, {
          content: emoji,
          type: 'EMOJI',
          replyToId: currentReply?.id,
        });
        setReplyTo(previous => previous?.id === currentReply?.id ? null : previous);
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

        try {
          await sendMessage(careSpaceId, user.id, {
            content: publicUrl,
            type,
            replyToId: currentReply?.id,
          });
          setReplyTo(previous => previous?.id === currentReply?.id ? null : previous);
        } finally {
          removePending(tempId);
        }
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
      style={{
        height: viewportHeight,
      }}
      className="flex flex-col min-h-0 bg-canvas overflow-hidden w-full relative"
    >
      {/* ── Top Chat Header (Fixed & Safe-Area Aware) ── */}
      <header
        className="shrink-0 z-30 bg-white/85 backdrop-blur-xl border-b border-canvas-dark/70 shadow-xs select-none"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="flex items-center justify-between h-14 px-3 sm:px-4 gap-2">
          {/* Left: Back button + Partner Profile Info */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={handleBack}
              className="p-2 -ml-1 rounded-full text-text-main hover:bg-canvas-dark/50 active:scale-95 transition-all md:hidden"
              aria-label="Quay lại"
              title="Quay lại"
            >
              <ChevronLeft className="w-5 h-5 text-text-main" />
            </button>

            {/* Avatar & Online status indicator */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand/15 to-brand-accent/20 border border-brand/20 flex items-center justify-center text-lg shadow-xs">
                {partnerProfile?.avatar_emoji || '💚'}
              </div>
              {isPartnerOnline && (
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs"
                  title="Đang hoạt động"
                />
              )}
            </div>

            {/* Name + Subtitle (typing or online/offline status) */}
            <div className="flex flex-col min-w-0 leading-tight">
              <span title={partnerProfile?.display_name ? `Tên gốc: ${partnerProfile.display_name}` : undefined} className="font-bold text-[14px] text-text-main truncate">
                {partnerProfile ? chatName(partnerProfile.user_id, profiles, nicknames) : careSpace?.name || 'Trò chuyện'}
              </span>
              <span className="text-[11px] truncate flex items-center gap-1">
                {isPartnerTyping ? (
                  <span className="text-brand font-semibold animate-pulse">
                    đang soạn tin nhắn...
                  </span>
                ) : isPartnerOnline ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Đang hoạt động
                  </span>
                ) : (
                  <span className="text-text-soft">Ngoại tuyến</span>
                )}
              </span>
            </div>
          </div>

          {/* Right: Actions & Badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            <ChatSettingsMenu key={careSpaceId} profiles={profiles} currentUserId={user.id}
              nicknames={nicknames} loading={chatNames.loading} error={chatNames.error}
              onSave={chatNames.save} onRefresh={chatNames.refresh} />
            {/* Connection error */}
            {error && (
              <div className="flex items-center gap-1 text-[11px] bg-red-50 text-semantic-destructive font-semibold px-2.5 py-1 rounded-full border border-red-200 animate-pulse">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mất kết nối</span>
              </div>
            )}

            {/* Push Notification button */}
            {!isSubscribed && (needsInstall || permission === 'default' || permission === 'granted') && (
              <div>
                {needsInstall ? (
                  <Link
                    to="/settings#notifications"
                    className="flex items-center gap-1.5 rounded-full bg-brand/10 hover:bg-brand/20 text-brand px-2.5 py-1.5 text-[11px] font-bold transition-colors border border-brand/20"
                    title="Bật thông báo trên iPhone"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">Thông báo</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => void requestPermissionAndSubscribe()}
                    disabled={isPushLoading}
                    className="flex items-center gap-1.5 text-[11px] font-bold bg-brand text-white hover:bg-brand-accent px-2.5 py-1.5 rounded-full shadow-sm transition-all active:scale-95 border border-white/20 disabled:opacity-50 select-none"
                    title="Bật thông báo tin nhắn mới"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>{isPushLoading ? 'Đang bật...' : 'Bật thông báo'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Push notification error banner if any */}
      {pushError && (
        <div className="shrink-0 bg-red-50 border-b border-red-200 px-4 py-1.5 text-xs text-red-600 flex items-center justify-between">
          <span className="truncate">{pushError.message}</span>
          <Link to="/settings#notifications" className="font-semibold underline ml-2 shrink-0">
            Cài đặt →
          </Link>
        </div>
      )}

      {/* ── Pinned Message Banner ── */}
      <AnimatePresence>
        {newestPinnedMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 bg-brand-light/30 border-b border-brand-light/60 px-4 py-2.5 flex items-center gap-3 shadow-xs select-none cursor-pointer z-10"
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
            <div className="flex items-center gap-0.5 bg-white rounded-full px-2 py-1 shadow-xs border border-canvas-dark">
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

      {/* ── Input with Safe Area ── */}
      <div
        className="shrink-0 bg-white"
        style={{
          paddingBottom: isKeyboardOpen ? '0px' : 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <MessageInput
          onSendText={handleSendText}
          onSendMedia={handleSendMedia}
          onSendEmoji={handleSendEmoji}
          replyTo={replyTo ? withChatNames(replyTo, profiles, nicknames) : null}
          onCancelReply={() => setReplyTo(null)}
          uploadProgress={uploadProgress}
          isSending={activeSending}
          onTypingChange={setIsMyTyping}
        />
      </div>
    </div>
  );
};
