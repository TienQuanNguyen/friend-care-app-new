import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const code = ts.transpileModule(readFileSync('src/lib/chatNicknames.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { normalizeNickname, chatName, withChatNames } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const profiles = [{ user_id: 'a', display_name: 'Tên gốc A', avatar_emoji: '🌵' }, { user_id: 'b', display_name: 'Tên gốc B', avatar_emoji: '🎧' }];

test('nickname validation handles Vietnamese, emoji, whitespace and limits', () => {
  assert.equal(normalizeNickname('  Em   thân yêu 💙  '), 'Em thân yêu 💙');
  assert.equal(normalizeNickname('  '), '');
  assert.equal(normalizeNickname('💙'.repeat(40)), '💙'.repeat(40));
  assert.throws(() => normalizeNickname('a'.repeat(41)), /40/);
  assert.throws(() => normalizeNickname('a\u0000b'), /không hợp lệ/);
});
test('shared nickname overrides in chat only; empty reset restores the original', () => {
  const original = JSON.stringify(profiles);
  assert.equal(chatName('a', profiles, { a: 'Cây nhỏ' }), 'Cây nhỏ');
  assert.equal(chatName('a', profiles, { a: '' }), 'Tên gốc A');
  assert.equal(chatName('missing', profiles, {}, 'Bạn đồng hành'), 'Bạn đồng hành');
  assert.equal(JSON.stringify(profiles), original);
});
test('message and quoted sender labels update without mutating stored message', () => {
  const message = { id: 'm', sender_id: 'a', sender: { display_name: 'Tên cũ' }, reply_to: { id: 'p', sender_id: 'b', sender: { display_name: 'Tên cũ B' } } };
  const named = withChatNames(message, profiles, { a: 'Cây nhỏ', b: 'Mây' });
  assert.equal(named.sender.display_name, 'Cây nhỏ');
  assert.equal(named.reply_to.sender.display_name, 'Mây');
  assert.equal(message.sender.display_name, 'Tên cũ');
  const reset = withChatNames(named, profiles, { a: '', b: '' });
  assert.equal(reset.sender.display_name, 'Tên gốc A');
  assert.equal(reset.reply_to.sender.display_name, 'Tên gốc B');
});
test('header control and settings markup expose names, shared scope and accessible dialog', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { ChatSettingsMenu, NicknameDialog } = await server.ssrLoadModule('/src/components/chat/ChatSettingsMenu.tsx');
    const props = { profiles, currentUserId: 'a', nicknames: { a: 'Cây nhỏ' }, loading: false, error: '', onSave: async () => {}, onRefresh: async () => {}, onClose() {} };
    const menu = renderToStaticMarkup(React.createElement(ChatSettingsMenu, props));
    assert.ok(menu.includes('aria-haspopup="dialog"'));
    assert.ok(menu.includes('Tùy chỉnh cuộc trò chuyện'));
    const html = renderToStaticMarkup(React.createElement(NicknameDialog, props));
    for (const text of ['<dialog', 'Tên gốc: Tên gốc A', 'Cây nhỏ', '(Bạn)', 'cả hai', 'Tên tài khoản gốc không thay đổi']) assert.ok(html.includes(text), text);
    assert.ok(html.includes('max-w-md') && html.includes('max-h-[85dvh]'));
  } finally { await server.close(); }
});
