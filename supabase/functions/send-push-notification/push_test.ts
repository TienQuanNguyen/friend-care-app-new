import { strict as assert } from 'node:assert';
import { Buffer } from 'node:buffer';
import { createECDH, randomBytes } from 'node:crypto';
import webpush from 'npm:web-push@3.6.7';
import ece from 'npm:http_ece@1.2.0';
import { allowedEndpoint, deliver, notificationBody } from './push.ts';

Deno.test('push endpoint allowlist rejects redirects, credentials and lookalike hosts', () => {
  for (const url of ['http://fcm.googleapis.com/a', 'https://evil.test/a', 'https://fcm.googleapis.com.evil.test/a',
    'https://user@fcm.googleapis.com/a', 'https://fcm.googleapis.com:8443/a', 'http://127.0.0.1']) assert.equal(allowedEndpoint(url), false);
  for (const url of ['https://fcm.googleapis.com/a', 'https://web.push.apple.com/a', 'https://updates.push.services.mozilla.com/a']) assert.equal(allowedEndpoint(url), true);
});

Deno.test('Web Push payload decrypts with browser key; counts only successful delivery', async () => {
  const recipient = createECDH('prime256v1');
  recipient.generateKeys();
  const auth = randomBytes(16);
  const keys = webpush.generateVAPIDKeys();
  const vapid = { ...keys, subject: 'mailto:admin@example.com' };
  const subscription = { id: 'test', endpoint: 'https://web.push.apple.com/test',
    p256dh: recipient.getPublicKey().toString('base64url'), auth: auth.toString('base64url') };
  const payload = { title: 'Friend Care', body: 'Tin nhắn tiếng Việt 💙' };
  const transport: typeof fetch = async (_url, init) => {
    const decrypted = ece.decrypt(Buffer.from(init!.body as Uint8Array), {
      version: 'aes128gcm', privateKey: recipient, authSecret: auth,
    });
    assert.deepEqual(JSON.parse(decrypted.toString()), payload);
    assert.equal(init?.redirect, 'error');
    return new Response(null, { status: 201 });
  };
  assert.equal(await deliver(subscription, payload, vapid, transport), 'sent');
  for (const status of [404, 410]) assert.equal(await deliver(subscription, payload, vapid,
    async () => new Response(null, { status })), 'stale');
  for (const status of [401, 403, 429, 500]) assert.equal(await deliver(subscription, payload, vapid,
    async () => new Response(null, { status })), 'failed');
});

Deno.test('notification previews cap text and never expose media URLs', () => {
  assert.equal(notificationBody('TEXT', 'x'.repeat(500)).length, 180);
  assert.equal(notificationBody('IMAGE', 'https://private.test/image'), 'Đã gửi một hình ảnh');
  assert.equal(notificationBody('VIDEO', 'https://private.test/video'), 'Đã gửi một video');
});
