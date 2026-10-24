let registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

export function getPushRegistration(): Promise<ServiceWorkerRegistration> {
  if (!registrationPromise) {
    registrationPromise = (async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          (async () => {
            await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
            return navigator.serviceWorker.ready;
          })(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('Thông báo chưa sẵn sàng. Hãy tải lại trang và thử lại.')), 12000);
          }),
        ]);
      } finally { clearTimeout(timer); }
    })().catch(error => {
      registrationPromise = null;
      throw error;
    });
  }
  return registrationPromise;
}
