// CLI keys are piped via stdin and never logged. Creates and cleans an isolated user/space/file.
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
let raw = '';
for await (const chunk of process.stdin) raw += chunk;
const keys = JSON.parse(raw).keys;
const anon = keys.find(k => k.name === 'anon').api_key;
const service = keys.find(k => k.name === 'service_role').api_key;
const url = 'https://iovvklliosftzeyecpul.supabase.co';
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, service, options);
const client = createClient(url, anon, options);
const ok = (result, label) => { if (result.error) throw Error(`${label}: ${result.error.code || result.error.status}`); return result.data; };
const load = async path => import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText).toString('base64')}`);
const { hydrateReplies } = await load('src/lib/chatReplies.ts');
const { uploadChatMedia } = await load('src/lib/chatMediaUpload.ts');
let userId, spaceId, path;
try {
  const email = `chat-media-smoke-${randomUUID()}@example.com`, password = `Fc!${randomUUID()}Aa1`;
  userId = ok(await admin.auth.admin.createUser({ email, password, email_confirm: true }), 'test user').user.id;
  const session = ok(await client.auth.signInWithPassword({ email, password }), 'test sign-in').session;
  spaceId = ok(await admin.from('care_spaces').insert({ name: 'Isolated chat-media smoke test', invite_code: randomUUID().slice(0, 8), created_by: userId }).select('id').single(), 'test space').id;
  ok(await client.from('profiles').insert({ user_id: userId, care_space_id: spaceId, display_name: 'Chat media test', role: 'member', avatar_emoji: '🧪' }), 'test profile');
  path = `${userId}/${randomUUID()}.png`;
  const blob = new Blob([readFileSync('public/icons/icon-192.png')], { type: 'image/png' });
  // Exercise the production helper with a fetch-backed XHR transport; browser XHR is unit-tested separately.
  const xhr = { upload: {}, headers: new Headers(), open(method, target) { this.method = method; this.target = target; }, setRequestHeader(k, v) { this.headers.append(k, v); }, send(body) {
    fetch(this.target, { method: this.method, headers: this.headers, body }).then(async response => {
      this.status = response.status; this.responseText = await response.text(); this.onload();
    }).catch(() => this.onerror());
  } };
  await uploadChatMedia({ url, apiKey: anon, token: session.access_token }, path, blob, () => {}, () => xhr);
  const imageUrl = client.storage.from('chat-media').getPublicUrl(path).data.publicUrl;
  const image = await fetch(imageUrl);
  assert.equal(image.status, 200);
  assert.ok(image.headers.get('content-type').startsWith('image/png'));
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from(await blob.arrayBuffer()));
  async function send(content, type, replyToId) {
    const { data, error } = await client.functions.invoke('send-push-notification', { body: { action: 'send-message', messageId: randomUUID(), careSpaceId: spaceId, content, type, replyToId } });
    if (error) throw Error(`send ${type} failed`);
    return data.message;
  }
  const parent = await send(imageUrl, 'IMAGE');
  const reply = await send('Ảnh test nhận và trả lời được.', 'TEXT', parent.id);
  const select = readFileSync('src/hooks/useChatMessages.ts', 'utf8').match(/const MESSAGE_SELECT = `([\s\S]*?)`/)[1];
  const rows = ok(await client.from('chat_messages').select(select).eq('id', reply.id), 'reply page without parent');
  const hydrated = await hydrateReplies(rows, async ids => ok(await client.from('chat_messages').select('id,content,type,sender_id,is_deleted,sender:profiles!fk_chat_messages_sender(display_name,avatar_emoji)').in('id', ids), 'parent lookup'));
  assert.equal(hydrated[0].reply_to.id, parent.id);
  assert.equal(hydrated[0].reply_to.type, 'IMAGE');
  assert.equal(hydrated[0].reply_to.content, imageUrl);
  assert.equal(hydrated[0].reply_to.sender.display_name, 'Chat media test');
  console.log('PASS: real authenticated PNG upload, public bytes, IMAGE send, reply save, paginated parent hydration and sender name. No real-user messages sent.');
} finally {
  if (path) ok(await admin.storage.from('chat-media').remove([path]), 'remove test image');
  if (userId) ok(await admin.from('chat_messages').delete().eq('sender_id', userId), 'remove test messages');
  if (spaceId) ok(await admin.from('care_spaces').delete().eq('id', spaceId), 'remove test space/profile');
  await client.auth.signOut();
  if (userId) ok(await admin.auth.admin.deleteUser(userId), 'remove test user');
  console.log('Cleaned isolated test image, messages, profile, space and account.');
}
