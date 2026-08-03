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

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function getFcmApp(): FirebaseApp {
  app = app ?? initializeApp(firebaseConfig, "fcm");
  return app;
}

function getFcmMessaging(): Messaging {
  messaging = messaging ?? getMessaging(getFcmApp());
  return messaging;
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

    const msg = getFcmMessaging();
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- getToken is the standard FCM web push API
    const token = await getToken(msg, { vapidKey });
    return token;
  } catch (err) {
    console.error("FCM token request failed:", err);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: { title?: string; body?: string }) => void): () => void {
  try {
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
