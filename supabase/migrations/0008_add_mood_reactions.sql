-- Migration: Add reactions to mood_entries
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
