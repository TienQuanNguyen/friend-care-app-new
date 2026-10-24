import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('src/lib/webPushClient.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { createPushController, pushEnvironment } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const key = Buffer.from([1, 2, 3]).toString('base64url');

function setup(permission = 'default') {
  const values = new Map();
  let current = null;
  const calls = { prompts: 0, saved: 0, subscribed: 0, removed: 0, unsubscribed: 0 };
  const notification = { permission, async requestPermission() { calls.prompts++; this.permission = 'granted'; return 'granted'; } };
  const registration = { pushManager: {
    async getSubscription() { return current; },
    async subscribe(options) {
      calls.subscribed++;
      current = { endpoint: `https://fcm.googleapis.com/${calls.subscribed}`, options,
        toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'key', auth: 'auth' } }; },
        async unsubscribe() { calls.unsubscribed++; current = null; return true; },
      };
      return current;
    },
  } };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    userAgent: 'Desktop', platform: 'Win32', maxTouchPoints: 0,
    serviceWorker: { async getRegistration() { return registration; } },
  } });
  globalThis.window = { isSecureContext: true, Notification: notification, PushManager: {}, matchMedia: () => ({ matches: false }) };
  globalThis.Notification = notification;
  globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
  const deps = { registration: async () => registration, publicKey: async () => key,
    save: async () => { calls.saved++; }, remove: async () => { calls.removed++; } };
  return { calls, deps, values, controller: createPushController(deps) };
}

test('asks only on click, restores without prompting across reloads', async () => {
  const { controller, calls, deps } = setup();
  await controller.sync('A');
  assert.equal(calls.prompts, 0);
  assert.equal(await controller.enable('A'), true);
  await controller.sync('A');
  const remount = createPushController(deps);
  await remount.sync('A');
  assert.equal(calls.prompts, 1);
  assert.equal(calls.subscribed, 1);
  assert.equal(remount.getSnapshot().isSubscribed, true);
});

test('explicit opt-out survives reload; enabling again never asks granted permission', async () => {
  const { controller, calls, deps } = setup('granted');
  await controller.sync('A');
  await controller.disable('A');
  const remount = createPushController(deps);
  await remount.sync('A');
  assert.equal(remount.getSnapshot().isSubscribed, false);
  assert.equal(calls.subscribed, 1);
  await remount.enable('A');
  assert.equal(calls.prompts, 0);
  assert.equal(calls.subscribed, 2);
});

test('account switch revokes old endpoint even when next account opted out', async () => {
  const { controller, values, calls } = setup('granted');
  await controller.sync('A');
  values.set('friend-care:push-disabled:B', 'true');
  await controller.sync('B');
  assert.equal(calls.unsubscribed, 1);
  assert.equal(controller.getEndpoint(), null);
  assert.equal(controller.getSnapshot().isSubscribed, false);
});

test('logout revokes subscription; rotation replaces key without permission prompt', async () => {
  const { controller, deps, calls } = setup('granted');
  await controller.sync('A');
  deps.publicKey = async () => Buffer.from([4, 5, 6]).toString('base64url');
  await controller.sync('A');
  assert.equal(calls.subscribed, 2);
  await controller.sync(null);
  assert.equal(calls.unsubscribed, 2);
  assert.equal(controller.getSnapshot().isSubscribed, false);
});

test('failed persistence does not report subscribed, retry recovers', async () => {
  const { controller, deps } = setup('granted');
  deps.save = async () => { throw Error('offline'); };
  assert.equal(await controller.sync('A'), false);
  assert.equal(controller.getSnapshot().isSubscribed, false);
  assert.equal(controller.getSnapshot().error.message, 'offline');
  deps.save = async () => {};
  assert.equal(await controller.sync('A'), true);
});

test('iPhone requires Home Screen; denied permission is never reprompted', async () => {
  const { controller, calls } = setup('denied');
  await controller.enable('A');
  assert.equal(calls.prompts, 0);
  navigator.userAgent = 'iPhone';
  assert.equal(pushEnvironment().needsInstall, true);
  Notification.permission = 'default';
  await controller.enable('A');
  assert.equal(calls.prompts, 0);
  window.matchMedia = () => ({ matches: true });
  assert.equal(pushEnvironment().needsInstall, false);
});

test('service worker displays push even with focused chat and opens only own chat URL', async () => {
  const handlers = {};
  const shown = [];
  let opened;
  const worker = { addEventListener: (name, fn) => { handlers[name] = fn; },
    location: { origin: 'https://friend-care-app-new.vercel.app' },
    registration: { showNotification: async (...args) => shown.push(args) },
    clients: { matchAll: async () => [], openWindow: async url => { opened = url; } },
  };
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), { self: worker, URL });
  let pending;
  handlers.push({ data: { json: () => ({ title: 'Chat', messageId: '123', url: 'https://evil.test' }) }, waitUntil: p => { pending = p; } });
  await pending;
  assert.equal(shown.length, 1);
  assert.equal(shown[0][1].tag, 'chat-123');
  handlers.notificationclick({ notification: { close() {}, data: { url: 'https://evil.test' } }, waitUntil: p => { pending = p; } });
  await pending;
  assert.equal(opened, 'https://friend-care-app-new.vercel.app/chat');
});
