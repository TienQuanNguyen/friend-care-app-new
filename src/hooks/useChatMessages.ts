/**
 * useChatMessages.ts
 *
 * Core data hook for the Real-time Chat module.
 *
 * Responsibilities:
 *  1. Fetch an initial page of messages using cursor-based pagination
 *     (LIMIT = 20, ordered by created_at DESC).
 *  2. Expose a `loadMore` function for fetching older pages.
 *  3. Subscribe to Supabase Realtime `postgres_changes` on INSERT / UPDATE
 *     and merge those events into local React state.
 *  4. Clean up the Realtime channel on unmount.
 *
 * This hook is intentionally free of any UI concerns — it returns pure data
 * and control functions only.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  supabase,
  subscribeToChatMessages,
  unsubscribeFromChannel,
} from '../utils/supabase';
import type {
  ChatMessage,
  ChatMessageWithSender,
  ChatCursor,
  FetchMessagesResult,
  RealtimeMessagePayload,
  UseChatMessagesReturn,
} from '../types/chat';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of messages fetched per page. Kept small to respect egress limits. */
const LIMIT = 20;

// ---------------------------------------------------------------------------
// Supabase query builder
// ---------------------------------------------------------------------------

/**
 * The Supabase select string used for all message fetches.
 *
 * Joins:
 *  - `sender:profiles!fk_chat_messages_sender` — explicit FK constraint name.
 *    PostgREST resolves chat_messages.sender_id → profiles.user_id via this FK.
 *  - `reply_to:chat_messages!chat_messages_reply_to_id_fkey` — self-join using
 *    the Postgres auto-generated FK name for the reply_to_id column.
 *
 * Only the minimal columns needed for display are fetched to limit egress.
 */
const MESSAGE_SELECT = `
  id,
  care_space_id,
  sender_id,
  content,
  type,
  reply_to_id,
  is_deleted,
  created_at,
  sender:profiles!fk_chat_messages_sender (
    display_name,
    avatar_emoji
  ),
  reply_to:chat_messages!chat_messages_reply_to_id_fkey (
    id,
    content,
    type,
    sender_id,
    is_deleted
  )
`.trim();

// ---------------------------------------------------------------------------
// fetchMessages — pure async helper (not a hook)
// ---------------------------------------------------------------------------

/**
 * Fetches a page of `chat_messages` for the given `careSpaceId`.
 *
 * @param careSpaceId - The care space to load messages for.
 * @param cursor      - If provided, fetch messages older than this cursor point.
 *                      Pass `null` to load the most-recent page.
 * @returns           A `FetchMessagesResult` containing the page and next cursor.
 */
export async function fetchMessages(
  careSpaceId: string,
  cursor: ChatCursor | null,
): Promise<FetchMessagesResult> {
  let query = supabase
    .from('chat_messages')
    .select(MESSAGE_SELECT)
    .eq('care_space_id', careSpaceId)
    // Newest messages first so the UI can prepend older ones on load-more.
    .order('created_at', { ascending: false })
    .order('id', { ascending: false }) // tiebreaker for identical timestamps
    .limit(LIMIT);

  // Apply cursor for pagination.
  // We use (created_at, id) as a composite cursor to handle timestamp collisions.
  if (cursor !== null) {
    // Fetch messages strictly older than the cursor.
    // Using `lt` on created_at with an `id` tiebreaker avoids missing rows
    // at the boundary where two messages share the same timestamp.
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`[useChatMessages] fetchMessages failed: ${error.message}`);
  }

  const messages = (data ?? []) as unknown as ChatMessageWithSender[];

  // The next cursor is the oldest message in this page.
  const oldest = messages[messages.length - 1];
  const nextCursor: ChatCursor | null =
    messages.length === LIMIT && oldest
      ? { created_at: oldest.created_at, id: oldest.id }
      : null;

  return {
    messages,
    nextCursor,
    hasMore: messages.length === LIMIT,
  };
}

// ---------------------------------------------------------------------------
// sendMessage — convenience function consumed by the future UI layer
// ---------------------------------------------------------------------------

/**
 * Inserts a new message into `public.chat_messages`.
 *
 * The Realtime subscription in `useChatMessages` will pick up the INSERT
 * event and update the local state automatically — the caller does NOT
 * need to manually push the returned message into state.
 *
 * @returns The newly created `ChatMessage` row.
 */
export async function sendMessage(
  careSpaceId: string,
  senderId: string,
  payload: {
    content: string | null;
    type: ChatMessage['type'];
    replyToId?: string;
  },
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      care_space_id: careSpaceId,
      sender_id: senderId,
      content: payload.content,
      type: payload.type,
      reply_to_id: payload.replyToId ?? null,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`[useChatMessages] sendMessage failed: ${error.message}`);
  }

  return data as ChatMessage;
}

// ---------------------------------------------------------------------------
// softDeleteMessage — sets is_deleted = true (no hard deletes)
// ---------------------------------------------------------------------------

/**
 * Soft-deletes a message by setting `is_deleted = true`.
 *
 * The UPDATE event from Realtime will propagate the change to all connected
 * clients automatically.
 */
export async function softDeleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .update({ is_deleted: true })
    .eq('id', messageId);

  if (error) {
    throw new Error(`[useChatMessages] softDeleteMessage failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// useChatMessages hook
// ---------------------------------------------------------------------------

/**
 * React hook that provides the full chat data layer for a given care space.
 *
 * Features:
 *  - Initial load of the 20 most-recent messages.
 *  - Cursor-based `loadMore()` for older messages.
 *  - Real-time INSERT/UPDATE subscription that merges live events into state.
 *  - Automatic subscription cleanup on unmount.
 *
 * @param careSpaceId - The care space to chat in. Hook resets if this changes.
 */
export function useChatMessages(careSpaceId: string | null): UseChatMessagesReturn {
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Cursor is stored in a ref so loadMore can read the latest value without
  // causing the effect to re-run.
  const cursorRef = useRef<ChatCursor | null>(null);

  // Channel ref for cleanup.
  const channelRef = useRef<RealtimeChannel | null>(null);

  // -------------------------------------------------------------------------
  // Realtime handler
  // -------------------------------------------------------------------------

  /**
   * Processes a Realtime event from the `chat_messages` publication.
   *
   * INSERT  → prepend to state (newest first).
   * UPDATE  → replace the matching message in-place (handles soft deletes).
   */
  const handleRealtimeEvent = useCallback((payload: RealtimeMessagePayload) => {
    if (payload.eventType === 'INSERT') {
      // The Realtime payload contains a flat DB row — it has no joined columns.
      // We synthesise a minimal `ChatMessageWithSender` so it can live in state
      // alongside fully-joined messages. The UI layer must handle `sender = null`.
      const incoming: ChatMessageWithSender = {
        ...(payload.new as ChatMessage),
        sender: null,
        reply_to: null,
      };

      setMessages((prev) => {
        // Guard against duplicate events (Supabase may re-deliver on reconnect).
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [incoming, ...prev];
      });
    }

    if (payload.eventType === 'UPDATE') {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.new.id
            ? // Merge updated fields; preserve joined data already present.
              { ...m, ...payload.new }
            : m,
        ),
      );
    }
  }, []);

  // -------------------------------------------------------------------------
  // Effect: Initial load + Realtime subscription
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!careSpaceId) return;

    let cancelled = false;

    // Reset state when the care space changes.
    setMessages([]);
    setError(null);
    setHasMore(false);
    cursorRef.current = null;
    setIsLoading(true);

    // 1. Fetch initial page.
    fetchMessages(careSpaceId, null)
      .then((result) => {
        if (cancelled) return;
        setMessages(result.messages);
        cursorRef.current = result.nextCursor;
        setHasMore(result.hasMore);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // 2. Subscribe to Realtime changes.
    channelRef.current = subscribeToChatMessages({
      careSpaceId,
      onMessage: handleRealtimeEvent,
      onError: (err) => {
        if (!cancelled) setError(err);
      },
    });

    // 3. Cleanup on unmount or careSpaceId change.
    return () => {
      cancelled = true;
      if (channelRef.current) {
        void unsubscribeFromChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [careSpaceId, handleRealtimeEvent]);

  // -------------------------------------------------------------------------
  // loadMore — fetches older messages
  // -------------------------------------------------------------------------

  const loadMore = useCallback(async () => {
    if (!careSpaceId || isFetchingMore || !hasMore) return;

    const currentCursor = cursorRef.current;
    if (!currentCursor) return; // Nothing to paginate from.

    setIsFetchingMore(true);
    setError(null);

    try {
      const result = await fetchMessages(careSpaceId, currentCursor);
      setMessages((prev) => {
        // De-duplicate: guard against the unlikely edge case where a Realtime
        // INSERT lands between the paginated fetches.
        const existingIds = new Set(prev.map((m) => m.id));
        const newMessages = result.messages.filter((m) => !existingIds.has(m.id));
        return [...prev, ...newMessages];
      });
      cursorRef.current = result.nextCursor;
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsFetchingMore(false);
    }
  }, [careSpaceId, hasMore, isFetchingMore]);

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    messages,
    isLoading,
    isFetchingMore,
    error,
    hasMore,
    loadMore,
  };
}
