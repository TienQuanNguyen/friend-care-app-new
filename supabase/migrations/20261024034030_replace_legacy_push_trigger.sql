-- Chat insertion and push now share the authenticated Edge Function path.
-- The legacy trigger targeted an undeployed function with hard-coded credentials.
-- Keep its function definition for rollback, but stop duplicate outbound requests.
DROP TRIGGER IF EXISTS trg_chat_messages_push ON public.chat_messages;
