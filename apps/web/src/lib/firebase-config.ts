import { initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

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
let database: Database | null = null;

function getFirebaseApp(): FirebaseApp {
  app ??= initializeApp(firebaseConfig);
  return app;
}

export function getRealtimeDatabase(): Database | null {
  const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (!dbUrl) {
    console.warn("Firebase Realtime Database URL not configured");
    return null;
  }

  database ??= getDatabase(getFirebaseApp());
  return database;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL);
}
