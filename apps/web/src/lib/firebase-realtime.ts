"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  ref,
  onValue,
  set,
  push,
  update,
  remove,
  onDisconnect,
  serverTimestamp,
  type DataSnapshot,
} from "firebase/database";
import { getRealtimeDatabase, isFirebaseConfigured } from "@/lib/firebase-config";

type RealtimeCallback<T> = (data: T | null) => void;

interface UseRealtimeOptions {
  /** Path in the Realtime Database, e.g. "notifications/user123" */
  path: string;
  /** Poll mode — listen for value changes */
  listen?: boolean;
}

// T provides return-type inference for callers
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function useRealtimeValue<T>({
  path,
  listen = true,
}: UseRealtimeOptions): {
  data: T | null;
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const callbackRef = useRef<RealtimeCallback<T>>(setData);

  useEffect(() => {
    const db = getRealtimeDatabase();
    if (!db || !isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const dbRef = ref(db, path);
    setLoading(true);

    const unsubscribe = onValue(
      dbRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val() as T | null;
        callbackRef.current(val);
        setLoading(false);
      },
      (err: Error) => {
        setError(err);
        setLoading(false);
      },
    );

    return (): void => {
      unsubscribe();
    };
  }, [path, listen]);

  return { data, loading, error };
}

export function useRealtimeMutation<T = unknown>(): {
  setValue: (path: string, value: T) => Promise<void>;
  pushValue: (path: string, value: T) => Promise<string | null>;
  updateValue: (path: string, value: Partial<T>) => Promise<void>;
  removeValue: (path: string) => Promise<void>;
  ready: boolean;
} {
  const setValue = useCallback(async (path: string, value: T): Promise<void> => {
    const db = getRealtimeDatabase();
    if (!db) return;
    await set(ref(db, path), { ...(value as object), updatedAt: serverTimestamp() });
  }, []);

  const pushValue = useCallback(async (path: string, value: T): Promise<string | null> => {
    const db = getRealtimeDatabase();
    if (!db) return null;
    const newRef = push(ref(db, path));
    await set(newRef, { ...(value as object), createdAt: serverTimestamp() });
    return newRef.key;
  }, []);

  const updateValue = useCallback(async (path: string, value: Partial<T>): Promise<void> => {
    const db = getRealtimeDatabase();
    if (!db) return;
    await update(ref(db, path), { ...value, updatedAt: serverTimestamp() });
  }, []);

  const removeValue = useCallback(async (path: string): Promise<void> => {
    const db = getRealtimeDatabase();
    if (!db) return;
    await remove(ref(db, path));
  }, []);

  return {
    setValue,
    pushValue,
    updateValue,
    removeValue,
    ready: isFirebaseConfigured(),
  };
}

export function usePresence(userId: string): void {
  useEffect(() => {
    const db = getRealtimeDatabase();
    if (!db || !isFirebaseConfigured() || !userId) return;

    const presenceRef = ref(db, `presence/${userId}`);

    void set(presenceRef, {
      online: true,
      lastSeen: serverTimestamp(),
    });

    // Mark offline on disconnect
    void onDisconnect(presenceRef).set({
      online: false,
      lastSeen: serverTimestamp(),
    });

    return (): void => {
      void set(presenceRef, {
        online: false,
        lastSeen: serverTimestamp(),
      });
    };
  }, [userId]);
}
