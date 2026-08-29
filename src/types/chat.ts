/**
 * chat.ts — Strict TypeScript interfaces for the Chat module.
 *
 * These types mirror the `public.chat_messages` Supabase table exactly.
 * No UI concerns belong here — data shape only.
 */

import type React from 'react';

// ---------------------------------------------------------------------------
// Enum
// ---------------------------------------------------------------------------

/** Maps directly to the Postgres `message_type` enum. */
export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'EMOJI';

// ---------------------------------------------------------------------------
// Core domain entity
// ---------------------------------------------------------------------------

/**
 * A single row from `public.chat_messages`.
 * All fields are required except those marked optional (nullable in DB).
 */
export interface ChatMessage {
  /** UUID PK — gen_random_uuid() */
  id: string;
  /** FK → public.care_spaces.id */
  care_space_id: string;
  /** FK → auth.users.id — the user who sent this message */
  sender_id: string;
  /**
   * Text content, a URL (for IMAGE/VIDEO), or an emoji codepoint string.
   * Nullable: a message may carry a media URL without accompanying text.
   */
  content: string | null;
  /** The type of payload this message carries. */
  type: MessageType;
  /**
   * Self-referencing FK — the message being replied to.
   * Null if this is a top-level message.
   */
  reply_to_id: string | null;
  /** Soft-delete flag. When true, the message body should be hidden in UI. */
  is_deleted: boolean;
  /** ISO-8601 UTC string from Postgres TIMESTAMPTZ. */
  created_at: string;
  /** JSONB mapped user reactions, e.g. { "user_id": "❤️" } */
  reactions?: Record<string, string>;
  /** Pinned message flag */
  is_pinned?: boolean;
}

// ---------------------------------------------------------------------------
// Joined / enriched view (for rendering)
// ---------------------------------------------------------------------------

/**
 * A lightweight snapshot of the sender's profile that is joined server-side
 * when fetching messages (via a Supabase `.select()` with foreign key join).
 */
export interface MessageSenderProfile {
  display_name: string;
  avatar_emoji: string;
}

/** `ChatMessage` augmented with the sender's profile for display purposes. */
export interface ChatMessageWithSender extends ChatMessage {
  /**
   * Joined from `public.profiles` via `sender_id`.
   * May be null if the profile no longer exists.
   */
  sender: MessageSenderProfile | null;
  /**
   * The parent message (one level deep) when this is a reply.
   * Populated by the fetch layer; null for top-level messages.
   */
  reply_to: Pick<ChatMessage, 'id' | 'content' | 'type' | 'sender_id' | 'is_deleted'> | null;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/**
 * Cursor-based pagination state.
 * The cursor is the `created_at` value of the oldest message currently loaded.
 */
export interface ChatCursor {
  /** ISO-8601 timestamp of the oldest message in the current page. */
  created_at: string;
  /** UUID of the oldest message — used as a tiebreaker if timestamps collide. */
  id: string;
}

/** Result envelope returned by `fetchMessages`. */
export interface FetchMessagesResult {
  /** Messages for this page, ordered by `created_at DESC`. */
  messages: ChatMessageWithSender[];
  /**
   * Cursor to pass to the next `fetchMessages` call.
   * Null when there are no more older messages to load.
   */
  nextCursor: ChatCursor | null;
  /** Whether there are more pages to fetch (false = reached the beginning). */
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Realtime payload shapes
// ---------------------------------------------------------------------------

/**
 * The raw payload emitted by Supabase Realtime `postgres_changes` for
 * INSERT and UPDATE events on `public.chat_messages`.
 *
 * We keep this typed separately from `ChatMessageWithSender` because
 * Realtime payloads do NOT include joined columns — they are flat DB rows.
 */
export interface RealtimeMessagePayload {
  /** The event type received from the Realtime channel. */
  eventType: 'INSERT' | 'UPDATE';
  /** The new row state (always present for INSERT and UPDATE). */
  new: ChatMessage;
  /**
   * The previous row state (present on UPDATE, empty object on INSERT).
   * Typed as Partial to avoid forcing callers to guard every field.
   */
  old: Partial<ChatMessage>;
}

// ---------------------------------------------------------------------------
// Hook public API shape
// ---------------------------------------------------------------------------

/** The object returned by `useChatMessages`. */
export interface UseChatMessagesReturn {
  /** Current list of messages, newest first. */
  messages: ChatMessageWithSender[];
  /** Setter for messages state — used for optimistic UI updates (reactions). */
  setMessages: React.Dispatch<React.SetStateAction<ChatMessageWithSender[]>>;
  /** True while the initial page is loading. */
  isLoading: boolean;
  /** True while an older page is being fetched (load-more). */
  isFetchingMore: boolean;
  /** Non-null when a fetch or subscription error occurred. */
  error: Error | null;
  /** Whether there are older messages that can be loaded. */
  hasMore: boolean;
  /** Call this to load the next batch of older messages. */
  loadMore: () => Promise<void>;
}
