/**
 * utils/supabase.ts
 *
 * Robust Supabase client utilities for the chat module.
 *
 * Design decisions:
 * - A dedicated *realtime client* is exported alongside the standard client.
 *   Both share the same credentials but the realtime client is configured
 *   with explicit Realtime options (heartbeat, reconnect, logger) to give us
 *   fine-grained control over WebSocket behaviour without touching the
 *   existing `src/lib/supabase.ts` singleton used by the rest of the app.
 * - We do NOT create a new `SupabaseClient` instance per hook render — both
 *   clients are module-level singletons.
 * - Channel management helpers are provided so the hook layer doesn't need to
 *   know about channel lifecycle details.
 */

import {
  createClient,
  type SupabaseClient,
  type RealtimeChannel,
  type RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import type { ChatMessage, RealtimeMessagePayload } from '../types/chat';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[supabase/chat] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Check your .env.local file.',
  );
}

// ---------------------------------------------------------------------------
// Standard client (data fetching / REST / Auth)
// ---------------------------------------------------------------------------

/**
 * The primary Supabase client for data operations.
 * Mirrors `src/lib/supabase.ts` but kept separate here so the chat module
 * can be developed and imported independently.
 *
 * Re-uses the publishable anon key — never expose the service_role key here.
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Persist session in localStorage so the Realtime auth token is always
    // up to date without requiring an explicit re-login.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// ---------------------------------------------------------------------------
// Realtime client
// ---------------------------------------------------------------------------

/**
 * A dedicated Supabase client configured for Realtime subscriptions.
 *
 * Separate from the standard client so we can tune WebSocket-specific options
 * (heartbeat interval, reconnect policy, log level) without affecting REST calls.
 */
export const supabaseRealtime: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    /**
     * How often (ms) the client sends a heartbeat ping to keep the WebSocket
     * connection alive through proxies / load balancers.
     * Supabase default is 30 000 ms; 25 000 ms gives a safety margin.
     */
    heartbeatIntervalMs: 25_000,
    /**
     * Number of reconnect attempts before the client gives up.
     * Set to Infinity so the hook can handle the error and let React
     * re-mount the subscription cleanly.
     */
    reconnectAfterMs: (tries: number) => Math.min(500 * tries, 10_000),
    params: {
      // Include the log_level param for easier debugging in development.
      log_level: import.meta.env.DEV ? 'info' : 'error',
    },
  },
});

// ---------------------------------------------------------------------------
// Channel factory
// ---------------------------------------------------------------------------

/**
 * Options for creating a chat Realtime channel.
 */
export interface ChatChannelOptions {
  /** The care space whose messages we want to listen to. */
  careSpaceId: string;
  /**
   * Called when an INSERT or UPDATE arrives on `public.chat_messages`
   * filtered to `careSpaceId`.
   */
  onMessage: (payload: RealtimeMessagePayload) => void;
  /** Optional error callback — called when the subscription enters error state. */
  onError?: (error: Error) => void;
}

/**
 * Creates and subscribes to a Realtime channel that listens to INSERT and
 * UPDATE events on `public.chat_messages` for a specific `care_space_id`.
 *
 * Returns the `RealtimeChannel` so the caller can unsubscribe on cleanup.
 *
 * Usage:
 * ```ts
 * const channel = subscribeToChatMessages({
 *   careSpaceId,
 *   onMessage: (payload) => { ... },
 * });
 * // On cleanup:
 * channel.unsubscribe();
 * ```
 */
export function subscribeToChatMessages({
  careSpaceId,
  onMessage,
  onError,
}: ChatChannelOptions): RealtimeChannel {
  // Channel name must be unique per subscription scope.
  const channelName = `chat-messages:${careSpaceId}`;

  const channel = supabaseRealtime
    .channel(channelName)
    // Listen to INSERTs in the target care space.
    .on<ChatMessage>(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        // Server-side filter: only events for this care space are delivered,
        // reducing client-side processing and bandwidth.
        filter: `care_space_id=eq.${careSpaceId}`,
      },
      (payload: RealtimePostgresChangesPayload<ChatMessage>) => {
        onMessage({
          eventType: 'INSERT',
          new: payload.new as ChatMessage,
          old: payload.old as Partial<ChatMessage>,
        });
      },
    )
    // Listen to UPDATEs (soft deletes, edits) in the same space.
    .on<ChatMessage>(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `care_space_id=eq.${careSpaceId}`,
      },
      (payload: RealtimePostgresChangesPayload<ChatMessage>) => {
        onMessage({
          eventType: 'UPDATE',
          new: payload.new as ChatMessage,
          old: payload.old as Partial<ChatMessage>,
        });
      },
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        if (import.meta.env.DEV) {
          console.debug(`[chat/realtime] Subscribed to channel "${channelName}"`);
        }
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        const error = err
          ? new Error(String(err))
          : new Error(`[chat/realtime] Channel "${channelName}" entered status: ${status}`);

        console.error(error.message);
        onError?.(error);
      }

      if (status === 'CLOSED') {
        if (import.meta.env.DEV) {
          console.debug(`[chat/realtime] Channel "${channelName}" closed.`);
        }
      }
    });

  return channel;
}

/**
 * Safely removes a Realtime channel from the client.
 * Idempotent — safe to call multiple times.
 */
export async function unsubscribeFromChannel(channel: RealtimeChannel): Promise<void> {
  try {
    await supabaseRealtime.removeChannel(channel);
  } catch (err) {
    console.warn('[chat/realtime] Failed to remove channel:', err);
  }
}
