import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('actual reply component renders a readable, bounded quote for both directions', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { ReplyPreview } = await server.ssrLoadModule('/src/components/chat/MessageBubble.tsx');
    const parent = { id: 'p', sender_id: 'friend', content: 'Hẹn nhau lúc 5 giờ nhé.', type: 'TEXT', is_deleted: false, sender: { display_name: 'Bạn thân' } };
    for (const isOwn of [true, false]) {
      const html = renderToStaticMarkup(React.createElement(ReplyPreview, { reply: parent, replyToId: 'p', isOwn }));
      assert.ok(html.includes('Hẹn nhau lúc 5 giờ nhé.'));
      assert.ok(html.includes('Bạn thân'));
      assert.ok(html.includes('<button'));
      assert.ok(html.includes('min-h-14') && html.includes('max-w-full') && html.includes('line-clamp-2'));
      assert.ok(html.includes('text-slate-600'));
      assert.ok(!html.includes('text-white'));
    }
    const unavailable = renderToStaticMarkup(React.createElement(ReplyPreview, { reply: [], replyToId: 'p', isOwn: true }));
    assert.ok(unavailable.includes('Không tải được tin nhắn gốc'));
  } finally { await server.close(); }
});
