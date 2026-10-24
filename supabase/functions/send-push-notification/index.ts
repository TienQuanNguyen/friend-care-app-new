import { createClient } from 'npm:@supabase/supabase-js@2.106.2';
import { deliver, notificationBody, type Subscription } from './push.ts';

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: object, status = 200) => Response.json(body, { status, headers: cors });
const uuid = (value: unknown): value is string => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  // User-scoped operations keep the existing chat RLS active.
  const client = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await client.auth.getUser(authorization.slice(7));
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const vapid = {
    publicKey: Deno.env.get('VAPID_PUBLIC_KEY') || '',
    privateKey: Deno.env.get('VAPID_PRIVATE_KEY') || '',
    subject: Deno.env.get('VAPID_SUBJECT') || 'mailto:tienquan0807@gmail.com',
  };
  try {
    const raw = await req.text();
    if (raw.length > 40000) return json({ error: 'Payload too large' }, 413);
    const input = JSON.parse(raw);
    if (!input || typeof input !== 'object') return json({ error: 'Invalid payload' }, 400);
    if (input.action === 'config') {
      if (!vapid.publicKey || !vapid.privateKey) return json({ error: 'Push not configured' }, 503);
      return json({ publicKey: vapid.publicKey });
    }

    async function send(subscriptions: Subscription[], payload: object) {
      const results = await Promise.all(subscriptions.map(async subscription => {
        const result = await deliver(subscription, payload, vapid);
        if (result === 'stale') await admin.from('push_subscriptions').delete().eq('id', subscription.id);
        return result;
      }));
      return {
        sentCount: results.filter(r => r === 'sent').length,
        failedCount: results.filter(r => r === 'failed').length,
        staleCount: results.filter(r => r === 'stale').length,
      };
    }

    if (input.action === 'test') {
      if (typeof input.endpoint !== 'string') return json({ error: 'Invalid endpoint' }, 400);
      const { data, error } = await client.from('push_subscriptions').select('id,endpoint,p256dh,auth')
        .eq('user_id', user.id).eq('endpoint', input.endpoint).limit(1);
      if (error) return json({ error: 'Subscription unavailable' }, 500);
      if (!data?.length) return json({ error: 'Subscription not found' }, 404);
      return json(await send(data, { title: 'Friend Care', body: 'Thông báo đã sẵn sàng. Bạn sẽ nhận được tin nhắn mới ở đây.',
        url: '/chat', messageId: `test-${crypto.randomUUID()}` }));
    }

    if (input.action !== 'send-message') return json({ error: 'Unknown action' }, 400);
    if (!uuid(input.messageId) || !uuid(input.careSpaceId)
      || !['TEXT', 'IMAGE', 'VIDEO', 'EMOJI'].includes(input.type)
      || typeof input.content !== 'string' || !input.content.trim() || input.content.length > 10000
      || (input.replyToId != null && !uuid(input.replyToId))) return json({ error: 'Invalid message' }, 400);
    const { data: profile, error: profileError } = await client.from('profiles')
      .select('care_space_id,display_name').eq('user_id', user.id).single();
    if (profileError || profile?.care_space_id !== input.careSpaceId) return json({ error: 'Forbidden' }, 403);

    // A retry of the same request must not insert or notify twice.
    const { data: previous } = await client.from('chat_messages').select('*').eq('id', input.messageId).maybeSingle();
    if (previous) {
      if (previous.sender_id !== user.id || previous.care_space_id !== input.careSpaceId) return json({ error: 'ID conflict' }, 409);
      return json({ message: previous });
    }
    if (input.replyToId) {
      const { data: parent } = await client.from('chat_messages').select('id')
        .eq('id', input.replyToId).eq('care_space_id', input.careSpaceId).maybeSingle();
      if (!parent) return json({ error: 'Reply not found' }, 400);
    }
    const { data: message, error: insertError } = await client.from('chat_messages').insert({
      id: input.messageId, care_space_id: input.careSpaceId, sender_id: user.id,
      content: input.content, type: input.type, reply_to_id: input.replyToId ?? null,
    }).select('*').single();
    if (insertError) {
      if (insertError.code === '23505') {
        const { data: duplicate } = await client.from('chat_messages').select('*')
          .eq('id', input.messageId).eq('sender_id', user.id).eq('care_space_id', input.careSpaceId).maybeSingle();
        if (duplicate) return json({ message: duplicate });
      }
      return json({ error: 'Could not save message' }, 500);
    }

    const notify = async () => {
      const { data: members, error: membersError } = await client.from('profiles').select('user_id')
        .eq('care_space_id', input.careSpaceId).neq('user_id', user.id);
      if (membersError) throw membersError;
      if (!members?.length) return;
      const { data: subscriptions, error } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth')
        .in('user_id', members.map(member => member.user_id));
      if (error) throw error;
      const result = await send(subscriptions || [], {
        title: `${String(profile.display_name || 'Bạn đồng hành').slice(0, 60)} · Friend Care`,
        body: notificationBody(message.type, message.content), url: '/chat', messageId: message.id,
      });
      // Log counts only; never endpoints, keys or message contents.
      console.info('chat-push', result);
    };
    const task = notify().catch(() => { console.error('chat-push delivery failed'); });
    if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(task);
    else await task;
    return json({ message });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'Invalid JSON' }, 400);
    console.error('chat-push request failed');
    return json({ error: 'Request failed' }, 500);
  }
}

if (import.meta.main) Deno.serve(handler);
