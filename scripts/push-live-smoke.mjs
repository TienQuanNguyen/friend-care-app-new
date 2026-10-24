// Pipe `supabase projects api-keys --project-ref ... --output-format json` to stdin.
// Secrets stay in memory. Test users/spaces are isolated and removed in finally.
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const keys = JSON.parse(input).keys;
const anon = keys.find(key => key.name === 'anon')?.api_key;
const service = keys.find(key => key.name === 'service_role')?.api_key;
if (!anon || !service) throw Error('Required CLI keys missing (values not logged).');
const url = 'https://iovvklliosftzeyecpul.supabase.co';
const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const users = [];
const spaces = [];
const clients = [];
const ok = (result, label) => { if (result.error) throw Error(`${label}: ${result.error.code || result.error.status || 'failed'}`); return result.data; };
let checks = 0;
async function invoke(token, body, expected) {
  const response = await fetch(`${url}/functions/v1/send-push-notification`, {
    method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json();
  assert.equal(response.status, expected, `Action ${body.action}: ${data.error || data.message || response.status}`);
  checks++;
  return data;
}

try {
  await invoke(anon, { action: 'config' }, 401);
  await invoke('invalid', { action: 'config' }, 401);
  for (let i = 0; i < 2; i++) {
    const nonce = randomUUID();
    const email = `push-smoke-${nonce}@example.com`;
    const password = `Fc!${randomUUID()}aA1`;
    const created = ok(await admin.auth.admin.createUser({ email, password, email_confirm: true }), 'create test user');
    users.push(created.user.id);
    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const signed = ok(await client.auth.signInWithPassword({ email, password }), 'test login');
    clients.push({ client, token: signed.session.access_token });
    const space = ok(await admin.from('care_spaces').insert({ name: 'Isolated push smoke test', invite_code: nonce.slice(0, 8), created_by: created.user.id }).select('id').single(), 'create test space');
    spaces.push(space.id);
    ok(await client.from('profiles').upsert({ user_id: created.user.id, care_space_id: space.id, display_name: 'Push smoke test', role: 'member', avatar_emoji: '🧪' }, { onConflict: 'user_id' }), 'test profile');
  }
  const config = await invoke(clients[0].token, { action: 'config' }, 200);
  assert.equal(typeof config.publicKey, 'string');
  assert.equal('privateKey' in config, false);
  const message = { action: 'send-message', messageId: randomUUID(), careSpaceId: spaces[0], type: 'TEXT', content: 'Isolated push smoke test', senderId: users[1] };
  await invoke(clients[1].token, message, 403);
  const saved = await invoke(clients[0].token, message, 200);
  assert.equal(saved.message.sender_id, users[0], 'Server must ignore spoofed sender');
  const retry = await invoke(clients[0].token, message, 200);
  assert.equal(retry.message.id, saved.message.id);
  const { count, error } = await admin.from('chat_messages').select('id', { count: 'exact', head: true }).eq('id', message.messageId);
  assert.equal(error, null);
  assert.equal(count, 1, 'Retry must not duplicate message');
  await invoke(clients[0].token, { ...message, messageId: randomUUID(), replyToId: randomUUID() }, 400);
  await invoke(clients[0].token, { ...message, messageId: randomUUID(), type: 'INVALID' }, 400);
  await invoke(clients[0].token, { ...message, messageId: randomUUID(), type: 'EMOJI', content: '💙', replyToId: saved.message.id }, 200);
  // Dummy endpoint must never be fetched, and tests must never notify real users.
  const endpoint = `https://invalid.example/push-test-${randomUUID()}`;
  ok(await clients[1].client.from('push_subscriptions').upsert({ user_id: users[1], endpoint, p256dh: 'test', auth: 'test' }, { onConflict: 'user_id,endpoint' }), 'test subscription');
  const hidden = ok(await clients[0].client.from('push_subscriptions').select('id').eq('endpoint', endpoint), 'subscription RLS');
  assert.equal(hidden.length, 0);
  await invoke(clients[0].token, { action: 'test', endpoint }, 404);
  const rejected = await invoke(clients[1].token, { action: 'test', endpoint }, 200);
  assert.equal(rejected.sentCount, 0);
  assert.equal(rejected.failedCount, 1);
  ok(await clients[1].client.from('profiles').update({ care_space_id: spaces[0] }).eq('user_id', users[1]), 'join test space');
  for (const type of ['IMAGE', 'VIDEO']) await invoke(clients[0].token, { ...message, messageId: randomUUID(), type, content: 'https://example.com/test-media' }, 200);
  console.log(`PASS: ${checks} live API checks; auth, sender identity, membership, replies, idempotency, RLS, all chat types. No real-device notification sent.`);
} finally {
  for (const { client } of clients) await client.auth.signOut();
  if (users.length) {
    ok(await admin.from('chat_messages').delete().in('sender_id', users), 'cleanup test messages');
    ok(await admin.from('push_subscriptions').delete().in('user_id', users), 'cleanup test subscriptions');
  }
  if (spaces.length) ok(await admin.from('care_spaces').delete().in('id', spaces), 'cleanup test spaces');
  for (const id of users) ok(await admin.auth.admin.deleteUser(id), 'cleanup test users');
  console.log('Removed isolated smoke-test data and test accounts.');
}
