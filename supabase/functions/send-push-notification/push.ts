// Use the maintained RFC 8291 implementation; never hand-roll Web Push encryption.
import webpush from 'npm:web-push@3.6.7';

export interface Subscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}
export interface Vapid { subject: string; publicKey: string; privateKey: string }

export function allowedEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    return url.hostname === 'fcm.googleapis.com'
      || url.hostname === 'updates.push.services.mozilla.com'
      || url.hostname.endsWith('.push.services.mozilla.com')
      || url.hostname.endsWith('.push.apple.com')
      || url.hostname.endsWith('.notify.windows.com');
  } catch { return false; }
}

export async function deliver(
  subscription: Subscription, payload: object, vapid: Vapid,
  transport: typeof fetch = fetch,
): Promise<'sent' | 'stale' | 'failed'> {
  if (!allowedEndpoint(subscription.endpoint)) return 'failed';
  try {
    const request = webpush.generateRequestDetails({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    }, JSON.stringify(payload), { TTL: 3600, urgency: 'high', vapidDetails: vapid });
    const response = await transport(request.endpoint, {
      method: 'POST', headers: request.headers, body: new Uint8Array(request.body),
      signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    await response.body?.cancel();
    if (response.ok) return 'sent';
    return response.status === 404 || response.status === 410 ? 'stale' : 'failed';
  } catch { return 'failed'; }
}

export function notificationBody(type: string, content: string | null): string {
  if (type === 'IMAGE') return 'Đã gửi một hình ảnh';
  if (type === 'VIDEO') return 'Đã gửi một video';
  return (content || 'Bạn có tin nhắn mới').slice(0, 180);
}
