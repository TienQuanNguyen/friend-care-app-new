import { useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { WebPushContext } from './WebPushContext';
import { createPushController } from '../lib/webPushClient';
import { getPushRegistration } from '../lib/pushRegistration';
import { supabase } from '../lib/supabase';

export function WebPushProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const controller = useMemo(() => createPushController({
    registration: getPushRegistration,
    async publicKey() {
      const { data, error } = await supabase.functions.invoke('send-push-notification', { body: { action: 'config' } });
      if (error || typeof data?.publicKey !== 'string') {
        throw new Error('Máy chủ thông báo chưa sẵn sàng. Vui lòng thử lại sau.');
      }
      return data.publicKey;
    },
    async save(owner, subscription) {
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: owner, endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh, auth: subscription.keys?.auth,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,endpoint' });
      if (error) throw new Error('Chưa lưu được thiết bị nhận thông báo. Hãy bấm thử lại.');
    },
    async remove(owner, endpoint) {
      const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', owner).eq('endpoint', endpoint);
      if (error) throw error;
    },
  }), []);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  useEffect(() => {
    let lastSync = 0;
    const sync = () => {
      if (document.visibilityState === 'hidden' || Date.now() - lastSync < 60000) return;
      lastSync = Date.now();
      void controller.sync(userId);
    };
    const timer = window.setTimeout(() => {
      lastSync = Date.now();
      void controller.sync(userId);
    }, 0);
    window.addEventListener('online', sync);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', sync);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [controller, userId]);

  const enable = useCallback(() => userId ? controller.enable(userId) : Promise.resolve(false), [controller, userId]);
  const disable = useCallback(() => userId ? controller.disable(userId) : Promise.resolve(false), [controller, userId]);
  const sendTest = useCallback(async () => {
    const endpoint = controller.getEndpoint();
    if (!endpoint) throw new Error('Hãy bật thông báo trên thiết bị này trước.');
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: { action: 'test', endpoint },
    });
    if (error || data?.sentCount !== 1) throw new Error('Chưa gửi được thông báo thử. Hãy thử bật lại thông báo.');
  }, [controller]);

  return <WebPushContext.Provider value={{ ...state, requestPermissionAndSubscribe: enable, unsubscribe: disable, sendTest }}>
    {children}
  </WebPushContext.Provider>;
}
