import { useEffect } from 'react';
import { api } from '../services/api';

const VAPID_PUBLIC_KEY = 'BG0zUGg23D90B7RTofXRe_CmqbaAJCCMph2wHWyQlL5Py__C6TJTLQInDgzV6kHcr4H8VEbrFaRGQwHoBX5UEWw';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications(isLoggedIn) {
  useEffect(() => {
    if (!isLoggedIn) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const setup = async () => {
      try {
        // Register service worker
        const reg = await navigator.serviceWorker.register('/sw.js');

        // Check existing subscription
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          // Request permission
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') return;

          // Subscribe
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        // Save subscription to backend
        const subJson = sub.toJSON();
        await api.subscribePush({
          endpoint: subJson.endpoint,
          keys: { p256dh: subJson.keys.p256dh, auth: subJson.keys.auth },
        });
      } catch (err) {
        console.warn('Push setup failed:', err.message);
      }
    };

    setup();
  }, [isLoggedIn]);
}
