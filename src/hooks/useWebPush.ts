/**
 * useWebPush.ts
 *
 * Custom React hook for managing Web Push API permission and subscriptions.
 *
 * Directives:
 *  - Does NOT prompt for permission on initial page load.
 *  - Triggered strictly by explicit user action (requestPermissionAndSubscribe).
 *  - Upserts PushSubscription payloads (endpoint, p256dh, auth) to Supabase `push_subscriptions`.
 *  - Handles 'default', 'granted', 'denied', 'unsupported' permission states cleanly.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { urlBase64ToUint8Array } from '../utils/vapidHelper';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface UseWebPushReturn {
  permission: NotificationPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  error: Error | null;
  requestPermissionAndSubscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
}

const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) ||
  'BKRq9Wpys7fhjtS4N279fy9ajHUBxzBWeTlMxo4Hmaju-r2_zLPzXLvgwfNzjswXuEHW-v3uBkVSu7DeHz0drOQ';

export function useWebPush(): UseWebPushReturn {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Check initial browser capability & permission state
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission as NotificationPermissionState);

    // Check if subscription exists in service worker
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setIsSubscribed(!!sub);
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.warn('[useWebPush] getSubscription error:', err);
        }
      });
  }, []);

  // Request permission & subscribe
  const requestPermissionAndSubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Request Browser Permission
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);

      if (result !== 'granted') {
        setIsLoading(false);
        return false;
      }

      // 2. Wait for Service Worker
      const reg = await navigator.serviceWorker.ready;

      // 3. Subscribe via PushManager
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as unknown as BufferSource,
        });
      }

      const jsonSub = subscription.toJSON();
      const endpoint = jsonSub.endpoint;
      const p256dh = jsonSub.keys?.p256dh;
      const auth = jsonSub.keys?.auth;

      if (!endpoint || !p256dh || !auth) {
        throw new Error('Subscription keys are incomplete from browser PushManager.');
      }

      // 4. Save to Supabase push_subscriptions table
      const { error: dbError } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,endpoint' }
      );

      if (dbError) {
        throw new Error(`DB upsert error: ${dbError.message}`);
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      console.error('[useWebPush] Subscribe failed:', errorObj);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Unsubscribe
  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', endpoint);
      }

      setIsSubscribed(false);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      console.error('[useWebPush] Unsubscribe failed:', errorObj);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermissionAndSubscribe,
    unsubscribe,
  };
}
