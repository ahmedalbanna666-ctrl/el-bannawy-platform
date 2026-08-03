import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  type UserCredential,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
};

let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp {
  app ??= initializeApp(firebaseConfig, "auth");
  return app;
}

export function isFirebaseAuthConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId,
  );
}

export async function createFirebaseUser(email: string, password: string): Promise<string | null> {
  if (!isFirebaseAuthConfigured()) return null;
  const credential: UserCredential = await createUserWithEmailAndPassword(
    getAuth(getFirebaseApp()),
    email,
    password,
  );
  return credential.user.getIdToken();
}

export async function signInFirebaseUser(email: string, password: string): Promise<string | null> {
  if (!isFirebaseAuthConfigured()) return null;
  const credential: UserCredential = await signInWithEmailAndPassword(
    getAuth(getFirebaseApp()),
    email,
    password,
  );
  return credential.user.getIdToken();
}

export async function resetFirebasePassword(email: string): Promise<void> {
  if (!isFirebaseAuthConfigured()) return;
  await sendPasswordResetEmail(getAuth(getFirebaseApp()), email);
}
