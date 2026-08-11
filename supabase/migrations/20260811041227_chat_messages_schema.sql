-- Migration: chat_messages_schema
-- Phase 1: Real-time Chat — Database Schema
-- ============================================================
-- Creates the message_type enum, chat_messages table, indexes,
-- RLS policies, and Realtime publication entry.
-- ============================================================

-- 1. Message type enum
--    Matches the MessageType union in src/types/chat.ts
CREATE TYPE public.message_type AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'EMOJI');

-- 2. chat_messages table
CREATE TABLE public.chat_messages (
  -- UUID PK using pgcrypto (available in all Supabase projects)
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scoping FK: every message belongs to exactly one care space
  care_space_id UUID        NOT NULL
                            REFERENCES public.care_spaces(id)
                            ON DELETE CASCADE,

  -- The authenticated user who sent this message.
  -- References auth.users for referential integrity (cascade on auth delete).
  -- A second FK to profiles.user_id is added below for PostgREST join support.
  sender_id     UUID        NOT NULL
                            REFERENCES auth.users(id)
                            ON DELETE CASCADE,

  -- Nullable: text content, media URL, or emoji codepoint string
  content       TEXT,

  -- Type of payload; defaults to TEXT to avoid NULL on simple messages
  type          public.message_type NOT NULL DEFAULT 'TEXT',

  -- Self-referencing FK for the reply-to feature (one level)
  -- NULL = top-level message; SET NULL on parent delete preserves the reply stub
  reply_to_id   UUID
                REFERENCES public.chat_messages(id)
                ON DELETE SET NULL,

  -- Soft-delete flag; UI hides content when true, row is never hard-deleted
  is_deleted    BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Immutable creation timestamp used as the pagination cursor
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
--    a) Primary access pattern: paginated message list for a care space
CREATE INDEX idx_chat_messages_space_created
  ON public.chat_messages (care_space_id, created_at DESC);

--    b) Reply lookups (JOIN on reply_to_id is a hot path)
CREATE INDEX idx_chat_messages_reply_to
  ON public.chat_messages (reply_to_id)
  WHERE reply_to_id IS NOT NULL;

-- 4. Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: any member of the same care space can read messages
CREATE POLICY "Members can view chat messages in their space"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (care_space_id = get_user_care_space_id(auth.uid()));

-- INSERT: authenticated member sending to their own space only
CREATE POLICY "Members can send messages in their space"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    care_space_id = get_user_care_space_id(auth.uid())
    AND sender_id = auth.uid()
  );

-- UPDATE: senders can only modify their own messages
--   Used exclusively for soft-deletes (is_deleted = true).
--   WITH CHECK ensures sender_id cannot be reassigned (BOLA prevention).
CREATE POLICY "Senders can soft-delete their own messages"
  ON public.chat_messages
  FOR UPDATE
  TO authenticated
  USING  (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- 5. Realtime publication
--    Enables postgres_changes events for INSERT and UPDATE on this table.
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- 6. PostgREST join FK: sender_id → profiles.user_id
--    PostgREST cannot traverse auth.users (it lives outside the public schema).
--    Adding an explicit named FK to profiles.user_id (which has a UNIQUE
--    constraint) lets us write:
--      .select('sender:profiles!fk_chat_messages_sender(display_name,avatar_emoji)')
--    without any ambiguity in the schema cache.
ALTER TABLE public.chat_messages
  ADD CONSTRAINT fk_chat_messages_sender
  FOREIGN KEY (sender_id)
  REFERENCES public.profiles(user_id)
  ON DELETE CASCADE;
