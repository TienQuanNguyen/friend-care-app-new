// Pipe CLI API keys via stdin. Isolated test accounts only; never log credentials.
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
let raw = '';
for await (const chunk of process.stdin) raw += chunk;
const keys = JSON.parse(raw).keys;
const anon = keys.find(k => k.name === 'anon').api_key;
const service = keys.find(k => k.name === 'service_role').api_key;
const url = 'https://iovvklliosftzeyecpul.supabase.co';
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, service, options);
const users = [], clients = [], spaces = [], channels = [];
const ok = (result, label) => { if (result.error) throw Error(`${label}: ${result.error.code || result.error.status}`); return result.data; };
try {
  for (let i = 0; i < 3; i++) {
    const email = `nickname-smoke-${randomUUID()}@example.com`, password = `Fc!${randomUUID()}Aa1`;
    const user = ok(await admin.auth.admin.createUser({ email, password, email_confirm: true }), 'test user').user;
    users.push(user.id);
    const client = createClient(url, anon, options); clients.push(client);
    ok(await client.auth.signInWithPassword({ email, password }), 'test session');
    if (i !== 1) spaces.push(ok(await admin.from('care_spaces').insert({ name: 'Isolated nickname test', invite_code: randomUUID().slice(0, 8), created_by: user.id }).select('id').single(), 'test space').id);
    ok(await client.from('profiles').insert({ user_id: user.id, care_space_id: i === 2 ? spaces[1] : spaces[0], display_name: `Original ${i}`, avatar_emoji: '🧪', role: 'member' }), 'test profile');
  }
  let received;
  const event = new Promise(resolve => { received = resolve; });
  const channel = clients[1].channel(`nickname-test-${randomUUID()}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_nicknames', filter: `care_space_id=eq.${spaces[0]}` }, payload => received(payload.new));
  channels.push(channel);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Realtime subscribe timed out')), 15000);
    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); }
      if (status === 'CHANNEL_ERROR') { clearTimeout(timer); reject(Error('Realtime subscribe failed')); }
    });
  });
  const row = { care_space_id: spaces[0], target_user_id: users[1], nickname: 'Mây nhỏ 💙', updated_by: users[0] };
  ok(await clients[0].from('chat_nicknames').upsert(row), 'set shared nickname');
  const broadcast = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Realtime delivery timed out')), 15000);
    event.then(value => { clearTimeout(timer); resolve(value); });
  });
  assert.equal(broadcast.nickname, row.nickname);
  assert.equal(ok(await clients[1].from('chat_nicknames').select('nickname').eq('care_space_id', spaces[0]).single(), 'partner read').nickname, row.nickname);
  const outsider = ok(await clients[2].from('chat_nicknames').select('*').eq('care_space_id', spaces[0]), 'outsider read');
  assert.equal(outsider.length, 0);
  assert.ok((await clients[2].from('chat_nicknames').upsert({ ...row, updated_by: users[2] })).error, 'outsider cannot write');
  assert.ok((await clients[0].from('chat_nicknames').upsert({ ...row, target_user_id: users[2] })).error, 'cannot nickname outsider');
  assert.ok((await clients[0].from('chat_nicknames').upsert({ ...row, updated_by: users[1] })).error, 'cannot spoof editor');
  assert.ok((await clients[0].from('chat_nicknames').upsert({ ...row, nickname: 'x'.repeat(41) })).error, 'length enforced by DB');
  ok(await clients[1].from('chat_nicknames').upsert({ ...row, nickname: '', updated_by: users[1] }), 'partner reset');
  assert.equal(ok(await clients[0].from('chat_nicknames').select('nickname').eq('care_space_id', spaces[0]).single(), 'read reset').nickname, '');
  assert.equal(ok(await clients[1].from('profiles').select('display_name').eq('user_id', users[1]).single(), 'original profile').display_name, 'Original 1');
  const anonymous = createClient(url, anon, options);
  assert.ok((await anonymous.from('chat_nicknames').select('*')).error, 'anonymous cannot read');
  console.log('PASS: shared set/read/reset, actual Realtime to second account, original names preserved; outsiders, forged editor, invalid target/length and anonymous access rejected.');
} finally {
  for (let i = 0; i < clients.length; i++) { await clients[i].removeAllChannels(); await clients[i].auth.signOut(); }
  if (spaces.length) ok(await admin.from('care_spaces').delete().in('id', spaces), 'cleanup spaces and profiles/nicknames');
  for (const id of users) ok(await admin.auth.admin.deleteUser(id), 'cleanup users');
  console.log('Cleaned all isolated nickname test data/accounts.');
}
