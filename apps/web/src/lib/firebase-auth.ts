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
  try {
    const credential: UserCredential = await createUserWithEmailAndPassword(
      getAuth(getFirebaseApp()),
      email,
      password,
    );
    return await credential.user.getIdToken();
  } catch {
    // Account already exists or Firebase unavailable — the platform DB handles registration
    return null;
  }
}

export async function signInFirebaseUser(email: string, password: string): Promise<string | null> {
  if (!isFirebaseAuthConfigured()) return null;
  try {
    const credential: UserCredential = await signInWithEmailAndPassword(
      getAuth(getFirebaseApp()),
      email,
      password,
    );
    return await credential.user.getIdToken();
  } catch {
    // User not in Firebase / wrong password — fall back to the platform's own auth (JWT)
    return null;
  }
}

export async function resetFirebasePassword(email: string): Promise<void> {
  if (!isFirebaseAuthConfigured()) return;
  await sendPasswordResetEmail(getAuth(getFirebaseApp()), email);
}
