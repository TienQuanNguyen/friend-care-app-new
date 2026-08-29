import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Web Push encryption helper using Deno Web Crypto
async function buildWebPushPayload(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payloadText: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
) {
  // Simple VAPID JWT header builder for standard Web Push Service (FCM/Mozilla/APNs)
  const endpointUrl = new URL(subscription.endpoint);
  const audience = `${endpointUrl.protocol}//${endpointUrl.hostname}`;

  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };

  const encodeBase64Url = (buf: ArrayBuffer | Uint8Array) => {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let str = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  };

  const strToBase64Url = (str: string) => {
    return encodeBase64Url(new TextEncoder().encode(str));
  };

  const unsignedToken = `${strToBase64Url(JSON.stringify(header))}.${strToBase64Url(
    JSON.stringify(jwtPayload)
  )}`;

  // Convert VAPID Private key (raw base64url PKCS#8 or JWK)
  const privateKeyBytes = base64UrlToBytes(vapidPrivateKey);
  const publicKeyBytes = base64UrlToBytes(vapidPublicKey);

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: encodeBase64Url(publicKeyBytes.subarray(1, 33)),
    y: encodeBase64Url(publicKeyBytes.subarray(33, 65)),
    d: encodeBase64Url(privateKeyBytes),
    ext: true,
  };

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const vapidJwt = `${unsignedToken}.${encodeBase64Url(signature)}`;
  const vapidHeader = `vapid t=${vapidJwt}, k=${vapidPublicKey}`;

  // Encrypt payload (aes128gcm)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const userPublicKey = await crypto.subtle.importKey(
    'raw',
    base64UrlToBytes(subscription.p256dh),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userPublicKey },
    localKeyPair.privateKey,
    256
  );

  const userAuthBytes = base64UrlToBytes(subscription.auth);
  const localPublicKeyBuffer = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKeyBuffer);

  // HKDF info strings
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const hkdfAuthKey = await crypto.subtle.importKey('raw', sharedSecretBits, 'HKDF', false, [
    'deriveBits',
  ]);
  const prkBuffer = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: userAuthBytes,
      info: authInfo,
    },
    hkdfAuthKey,
    256
  );

  const keyInfo = concatBuffers(
    new TextEncoder().encode('Content-Encoding: aes128gcm\0'),
    base64UrlToBytes(subscription.p256dh),
    localPublicKeyBytes
  );

  const prkKey = await crypto.subtle.importKey('raw', prkBuffer, 'HKDF', false, ['deriveBits']);

  const cekBuffer = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: concatBuffers(new TextEncoder().encode('Content-Encoding: nonce\0'), keyInfo),
    },
    prkKey,
    96
  );

  const contentEncryptionKeyBuffer = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: concatBuffers(new TextEncoder().encode('Content-Encoding: aesgcm\0'), keyInfo),
    },
    prkKey,
    128
  );

  const contentEncryptionKey = await crypto.subtle.importKey(
    'raw',
    contentEncryptionKeyBuffer,
    'AES-GCM',
    false,
    ['encrypt']
  );

  // Pad payload
  const payloadBytes = new TextEncoder().encode(payloadText);
  const paddedPayload = new Uint8Array(2 + payloadBytes.length);
  paddedPayload.set([0, 0], 0);
  paddedPayload.set(payloadBytes, 2);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(cekBuffer) },
    contentEncryptionKey,
    paddedPayload
  );

  const ciphertext = new Uint8Array(ciphertextBuffer);

  // Construct aes128gcm body payload: record_header (16 bytes salt + 4 bytes record size + 1 byte key len + key) + ciphertext
  const recordSize = ciphertext.length;
  const headerBuf = new Uint8Array(16 + 4 + 1 + localPublicKeyBytes.length);
  headerBuf.set(salt, 0);
  const view = new DataView(headerBuf.buffer);
  view.setUint32(16, recordSize, false);
  headerBuf[20] = localPublicKeyBytes.length;
  headerBuf.set(localPublicKeyBytes, 21);

  const bodyBuffer = concatBuffers(headerBuf, ciphertext);

  return {
    headers: {
      Authorization: vapidHeader,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
    },
    body: bodyBuffer,
  };
}

function base64UrlToBytes(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function concatBuffers(...bufs: Uint8Array[]): Uint8Array {
  const totalLen = bufs.reduce((acc, b) => acc + b.length, 0);
  const res = new Uint8Array(totalLen);
  let offset = 0;
  for (const b of bufs) {
    res.set(b, offset);
    offset += b.length;
  }
  return res;
}

// ---------------------------------------------------------------------------
// Deno HTTP Handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const vapidPublicKey =
      Deno.env.get('VAPID_PUBLIC_KEY') ??
      'BKRq9Wpys7fhjtS4N279fy9ajHUBxzBWeTlMxo4Hmaju-r2_zLPzXLvgwfNzjswXuEHW-v3uBkVSu7DeHz0drOQ';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? 'RAlUc3vGsPNxHoUkADlRQQVbMOSAZ7xEz7nOSkbfNS0';
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@friendcare.app';

    // Verify Auth Header
    const authHeader = req.headers.get('Authorization');
    if (
      !authHeader ||
      (!authHeader.includes(supabaseServiceKey) && !authHeader.includes('Bearer'))
    ) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const record = body.record || body;

    const { care_space_id, sender_id, content, type, reply_to_id } = record;

    if (!care_space_id || !sender_id) {
      return new Response(JSON.stringify({ error: 'Missing care_space_id or sender_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Resolve Sender Profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('display_name, avatar_emoji')
      .eq('user_id', sender_id)
      .single();

    const senderDisplayName = senderProfile?.display_name || 'Bạn đồng hành';

    // 2. Resolve Recipients in Care Space (user_id != sender_id)
    const { data: spaceMembers, error: membersError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('care_space_id', care_space_id)
      .neq('user_id', sender_id);

    if (membersError || !spaceMembers || spaceMembers.length === 0) {
      return new Response(JSON.stringify({ message: 'No recipients found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const recipientUserIds = spaceMembers.map((m) => m.user_id);

    // 3. Resolve Push Subscriptions for Recipients
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', recipientUserIds);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No push subscriptions for recipient' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Format Title & Body
    let notificationBody = '';

    // Check if message is a reply
    if (reply_to_id) {
      const { data: replyMsg } = await supabase
        .from('chat_messages')
        .select('content, type, is_deleted')
        .eq('id', reply_to_id)
        .single();

      let replyQuoteText = 'tin nhắn';
      if (replyMsg) {
        if (replyMsg.is_deleted) {
          replyQuoteText = 'tin nhắn đã bị xóa';
        } else if (replyMsg.type === 'IMAGE') {
          replyQuoteText = '📷 Hình ảnh';
        } else if (replyMsg.type === 'VIDEO') {
          replyQuoteText = '🎥 Video';
        } else {
          replyQuoteText = `"${replyMsg.content || ''}"`;
        }
      }

      const newMsgSnippet =
        type === 'IMAGE' ? '📷 Hình ảnh' : type === 'VIDEO' ? '🎥 Video' : content || '';
      notificationBody = `Đã trả lời ${replyQuoteText}: ${newMsgSnippet}`;
    } else if (type === 'IMAGE') {
      notificationBody = '📷 Đã gửi một ảnh';
    } else if (type === 'VIDEO') {
      notificationBody = '🎥 Đã gửi một video';
    } else {
      notificationBody = content || 'Đã gửi một tin nhắn';
    }

    const pushPayloadText = JSON.stringify({
      title: senderDisplayName,
      body: notificationBody,
      careSpaceId: care_space_id,
      url: '/chat',
      tag: `chat-${care_space_id}`,
    });

    // 5. Send Web Push to all subscriptions
    const staleSubscriptionIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const { headers, body: encryptedBody } = await buildWebPushPayload(
            sub,
            pushPayloadText,
            vapidPublicKey,
            vapidPrivateKey,
            vapidSubject
          );

          const pushRes = await fetch(sub.endpoint, {
            method: 'POST',
            headers,
            body: encryptedBody,
          });

          if (pushRes.status === 410 || pushRes.status === 404) {
            staleSubscriptionIds.push(sub.id);
          }
        } catch (err) {
          console.error(`[Push] Delivery error for sub ${sub.id}:`, err);
        }
      })
    );

    // Clean up stale subscriptions
    if (staleSubscriptionIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', staleSubscriptionIds);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentCount: subscriptions.length - staleSubscriptionIds.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[send-push-notification] Error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
