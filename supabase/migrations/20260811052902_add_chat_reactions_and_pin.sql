-- Migration: Add reactions and is_pinned columns to chat_messages
-- ============================================================

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

-- Create index on is_pinned for fast pinned message retrievals
CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned
  ON public.chat_messages (care_space_id)
  WHERE is_pinned = true;
