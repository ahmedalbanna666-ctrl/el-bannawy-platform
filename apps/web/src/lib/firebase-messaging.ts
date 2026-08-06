import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
import { initializeApp, type FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

const SW_PATH = "/sw.js";

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let swRegistrationPromise: Promise<ServiceWorkerRegistration> | null = null;

function getFcmApp(): FirebaseApp {
  app = app ?? initializeApp(firebaseConfig, "fcm");
  return app;
}

function getFcmMessaging(): Messaging {
  messaging = messaging ?? getMessaging(getFcmApp());
  return messaging;
}

/**
 * Registers (and memoizes) our custom service worker. The Firebase Messaging
 * SDK needs an explicit registration when the app does not use the default
 * `firebase-messaging-sw.js` worker, otherwise `getToken()`/`onMessage()` fail
 * silently because the default worker file does not exist.
 */
function getSwRegistration(): Promise<ServiceWorkerRegistration> {
  swRegistrationPromise = swRegistrationPromise ?? navigator.serviceWorker.register(SW_PATH);
  return swRegistrationPromise;
}

export async function requestFcmToken(): Promise<string | null> {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn("FCM VAPID key not configured");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return null;
    }

    const registration = await getSwRegistration();
    const msg = getFcmMessaging();
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- getToken is the standard FCM web push API
    const token = await getToken(msg, { vapidKey, serviceWorkerRegistration: registration });
    return token;
  } catch (err) {
    console.error("FCM token request failed:", err);
    return null;
  }
}

export async function onForegroundMessage(
  callback: (payload: { title?: string; body?: string }) => void,
): Promise<() => void> {
  try {
    await getSwRegistration();
    const msg = getFcmMessaging();
    const unsubscribe = onMessage(msg, (payload) => {
      callback({
        title: payload.notification?.title,
        body: payload.notification?.body,
      });
    });
    return unsubscribe;
  } catch {
    return (): void => { /* noop */ };
  }
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window && "serviceWorker" in navigator;
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export function getPushPermission(): PushPermission {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * User-initiated enable flow: registers the service worker, requests browser
 * notification permission, fetches an FCM token and returns it. The caller
 * persists the token via the backend device-token endpoint.
 */
export async function enableWebPush(): Promise<{ ok: boolean; token?: string; error?: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: "هذا المتصفح لا يدعم إشعارات المتصفح" };
  }
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    return { ok: false, error: "إشعارات المتصفح غير مهيأة في إعدادات المنصة" };
  }
  try {
    await getSwRegistration();
    const token = await requestFcmToken();
    if (!token) {
      return { ok: false, error: "لم يتم منح إذن الإشعارات من المتصفح" };
    }
    return { ok: true, token };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر تفعيل إشعارات المتصفح" };
  }
}
