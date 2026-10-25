import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

async function loadTs(path) {
  const code = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}
const { hydrateReplies, renderReplyContent } = await loadTs('src/lib/chatReplies.ts');
const { uploadChatMedia } = await loadTs('src/lib/chatMediaUpload.ts');
const parent = { id: 'parent', sender_id: 'sender', content: 'Nội dung được trả lời', type: 'TEXT', is_deleted: false, sender: { display_name: 'Bạn thân' } };

test('reply hydration fetches parents outside current page once, with deduplicated IDs', async () => {
  let calls = 0;
  const rows = [{ id: 'reply1', reply_to_id: 'parent' }, { id: 'reply2', reply_to_id: 'parent' }, { id: 'normal', reply_to_id: null }];
  const result = await hydrateReplies(rows, async ids => { calls++; assert.deepEqual(ids, ['parent']); return [parent]; });
  assert.equal(calls, 1);
  assert.equal(result[0].reply_to.content, parent.content);
  assert.equal(result[1].reply_to.id, 'parent');
  assert.equal(result[2].reply_to, null);
});
test('no replies means no extra query; inaccessible parents have an honest fallback', async () => {
  await hydrateReplies([{ reply_to_id: null }], () => { throw Error('must not query'); });
  const result = await hydrateReplies([{ reply_to_id: 'private' }], async () => []);
  assert.equal(renderReplyContent(result[0].reply_to).text, 'Không tải được tin nhắn gốc');
  assert.equal(renderReplyContent(result[0].reply_to).isDeleted, false);
});
test('legacy array payload never becomes blank or quotes an unrelated child', () => {
  assert.equal(renderReplyContent([], [], 'parent').text, 'Không tải được tin nhắn gốc');
  assert.equal(renderReplyContent([], [parent], 'parent').text, parent.content);
  assert.equal(renderReplyContent([{ ...parent, id: 'child' }], [parent], 'parent').text, parent.content);
});
test('text, media, emoji, deleted and empty reply previews all have visible text', () => {
  for (const type of ['TEXT', 'IMAGE', 'VIDEO', 'EMOJI']) assert.ok(renderReplyContent({ ...parent, type }).text);
  assert.equal(renderReplyContent({ ...parent, content: '' }).text, 'Tin nhắn không có nội dung');
  assert.equal(renderReplyContent(parent, [{ ...parent, is_deleted: true }], 'parent').text, 'Tin nhắn đã thu hồi');
});

const credentials = { url: 'https://test.supabase.co/', apiKey: 'public-key', token: 'user-token' };
function xhrFixture(mode = 'success', status = 200) {
  const headers = [];
  const xhr = { upload: {}, status, responseText: 'not json',
    open(method, url) { this.method = method; this.url = url; },
    setRequestHeader(name, value) { headers.push([name, value]); },
    send(body) { this.body = body; queueMicrotask(() => {
      if (mode === 'success') { this.upload.onprogress({ lengthComputable: true, loaded: 1, total: 2 }); this.onload(); }
      else this[mode]();
    }); },
  };
  return { xhr, headers };
}
test('upload uses exactly one user Authorization header, api key and folder-safe URL', async () => {
  const { xhr, headers } = xhrFixture();
  const progress = [];
  const file = new Blob(['image'], { type: 'image/png' });
  await uploadChatMedia(credentials, 'user/ảnh test.png', file, p => progress.push(p), () => xhr);
  assert.deepEqual(headers.filter(([key]) => key === 'Authorization'), [['Authorization', 'Bearer user-token']]);
  assert.ok(headers.some(([key, value]) => key === 'apikey' && value === 'public-key'));
  assert.equal(xhr.url, 'https://test.supabase.co/storage/v1/object/chat-media/user/%E1%BA%A3nh%20test.png');
  assert.deepEqual(progress, [50, 100]);
  assert.equal(xhr.timeout, 120000);
});
test('missing session rejects before network; auth, timeout, abort and network errors settle', async () => {
  await assert.rejects(uploadChatMedia({ ...credentials, token: '' }, 'a.png', new Blob(), () => {}, () => { throw Error('network should not run'); }), /đăng nhập/);
  for (const [mode, status, pattern] of [['success', 401, /xác thực/], ['success', 500, /HTTP 500/], ['ontimeout', 0, /quá lâu/], ['onerror', 0, /Mất kết nối/], ['onabort', 0, /hủy/]]) {
    const { xhr } = xhrFixture(mode, status);
    await assert.rejects(uploadChatMedia(credentials, 'a.png', new Blob(), () => {}, () => xhr), pattern);
  }
});
