export type PushPermission = NotificationPermission | 'unsupported';

export interface PushState {
  permission: PushPermission;
  needsInstall: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: Error | null;
}

interface PushDependencies {
  registration: () => Promise<ServiceWorkerRegistration>;
  publicKey: () => Promise<string>;
  save: (userId: string, subscription: PushSubscriptionJSON) => Promise<void>;
  remove: (userId: string, endpoint: string) => Promise<void>;
}

const OWNER_KEY = 'friend-care:push-owner';
const disabledKey = (userId: string) => `friend-care:push-disabled:${userId}`;

function stored(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function remember(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* Private browsing may disable storage. */ }
}

export function pushEnvironment(): Pick<PushState, 'permission' | 'needsInstall'> {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const supported = window.isSecureContext && 'Notification' in window
    && 'serviceWorker' in navigator && 'PushManager' in window;
  return {
    permission: supported ? Notification.permission : 'unsupported',
    needsInstall: ios && !standalone,
  };
}

function keyBytes(key: string): Uint8Array<ArrayBuffer> {
  const value = key.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(value.padEnd(Math.ceil(value.length / 4) * 4, '=')), c => c.charCodeAt(0));
}

function matchesKey(subscription: PushSubscription, key: Uint8Array): boolean {
  const existing = subscription.options.applicationServerKey;
  if (!existing) return false;
  const bytes = new Uint8Array(existing);
  return bytes.length === key.length && bytes.every((value, index) => value === key[index]);
}

/** One controller per app: settings, chat and background restoration share state. */
export function createPushController(deps: PushDependencies) {
  let state: PushState = { ...pushEnvironment(), isSubscribed: false, isLoading: false, error: null };
  let activeUser: string | null = null;
  let endpoint: string | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  let permissionRequest: Promise<NotificationPermission> | null = null;
  const listeners = new Set<() => void>();
  const update = (patch: Partial<PushState>) => {
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
  };
  const enqueue = (work: () => Promise<boolean>): Promise<boolean> => {
    const task = queue.then(work, work);
    queue = task.catch(() => false);
    return task;
  };

  async function restore(userId: string): Promise<boolean> {
    if (activeUser !== userId) return false;
    update({ ...pushEnvironment(), isLoading: true, error: null, isSubscribed: false });
    endpoint = null;
    try {
      // Revoke the previous account even when the next account has opted out.
      if (stored(OWNER_KEY) && stored(OWNER_KEY) !== userId && 'serviceWorker' in navigator) {
        const oldRegistration = await navigator.serviceWorker.getRegistration('/');
        const oldSubscription = await oldRegistration?.pushManager.getSubscription();
        if (oldSubscription && !await oldSubscription.unsubscribe()) throw new Error('Chưa thể ngắt thông báo của tài khoản trước.');
        remember(OWNER_KEY, null);
      }
      if (stored(disabledKey(userId)) && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration('/');
        const subscription = await reg?.pushManager.getSubscription();
        if (subscription && !await subscription.unsubscribe()) throw new Error('Chưa tắt được thông báo. Hãy thử lại.');
        remember(OWNER_KEY, null);
        return false;
      }
      if (state.needsInstall || state.permission !== 'granted') return false;
      const reg = await deps.registration();
      const key = keyBytes(await deps.publicKey());
      if (activeUser !== userId) return false;
      let subscription = await reg.pushManager.getSubscription();
      // Rebind a shared browser after account changes, or rotate an obsolete VAPID key.
      if (subscription && (stored(OWNER_KEY) !== userId || !matchesKey(subscription, key))) {
        if (!await subscription.unsubscribe()) throw new Error('Chưa thể cập nhật đăng ký thông báo. Hãy thử lại.');
        subscription = null;
      }
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      }
      if (activeUser !== userId) {
        await subscription.unsubscribe();
        return false;
      }
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('Trình duyệt chưa tạo được đăng ký thông báo đầy đủ.');
      }
      await deps.save(userId, json);
      if (activeUser !== userId) {
        await subscription.unsubscribe();
        return false;
      }
      remember(OWNER_KEY, userId);
      endpoint = subscription.endpoint;
      update({ isSubscribed: true });
      return true;
    } catch (error) {
      if (activeUser === userId) update({ error: error instanceof Error ? error : new Error('Chưa bật được thông báo.') });
      return false;
    } finally {
      update({ isLoading: false });
    }
  }

  return {
    getSnapshot: () => state,
    getEndpoint: () => endpoint,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    sync(userId: string | null): Promise<boolean> {
      activeUser = userId;
      return enqueue(async () => {
        if (activeUser !== userId) return false;
        if (userId) return restore(userId);
        endpoint = null;
        update({ ...pushEnvironment(), isSubscribed: false, error: null });
        if (stored(OWNER_KEY) && 'serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.getRegistration('/');
            const subscription = await reg?.pushManager.getSubscription();
            await subscription?.unsubscribe();
            remember(OWNER_KEY, null);
          } catch { /* Retry on the next signed-out visit. */ }
        }
        return false;
      });
    },
    enable(userId: string): Promise<boolean> {
      const environment = pushEnvironment();
      update({ ...environment, error: null });
      if (environment.needsInstall || environment.permission === 'unsupported') return Promise.resolve(false);
      if (environment.permission === 'denied') {
        update({ error: new Error('Hãy cho phép thông báo trong cài đặt của trình duyệt hoặc iPhone.') });
        return Promise.resolve(false);
      }
      // Invoke directly from the click, before any await: required by Safari/iOS.
      let permission: Promise<NotificationPermission>;
      try {
        if (environment.permission === 'default') {
          permissionRequest ??= Notification.requestPermission().finally(() => { permissionRequest = null; });
          permission = permissionRequest;
        } else permission = Promise.resolve(environment.permission);
      } catch {
        update({ error: new Error('Chưa xin được quyền thông báo. Vui lòng thử lại.') });
        return Promise.resolve(false);
      }
      activeUser = userId;
      update({ isLoading: true });
      return enqueue(async () => {
        try {
          const result = await permission;
          update({ permission: result });
          if (result !== 'granted' || activeUser !== userId) return false;
          remember(disabledKey(userId), null);
          return await restore(userId);
        } catch {
          update({ error: new Error('Chưa xin được quyền thông báo. Vui lòng thử lại.') });
          return false;
        } finally { update({ isLoading: false }); }
      });
    },
    disable(userId: string): Promise<boolean> {
      remember(disabledKey(userId), 'true');
      return enqueue(async () => {
        if (activeUser !== userId) return false;
        update({ isLoading: true, error: null });
        try {
          const reg = await deps.registration();
          const subscription = await reg.pushManager.getSubscription();
          if (subscription) {
            if (!await subscription.unsubscribe()) throw new Error('Chưa tắt được thông báo. Hãy thử lại.');
            await deps.remove(userId, subscription.endpoint).catch(() => undefined);
          }
          endpoint = null;
          remember(OWNER_KEY, null);
          update({ isSubscribed: false });
          return true;
        } catch (error) {
          update({ error: error instanceof Error ? error : new Error('Chưa tắt được thông báo.') });
          return false;
        } finally { update({ isLoading: false }); }
      });
    },
  };
}
