/* El-bannawy PWA Service Worker — Offline & Smart Cache Engine (v3) */
/* eslint-disable */
const CACHE_APP = "el-bannawy-app-v3";
const CACHE_FILES = "el-bannawy-files-v3";
const OFFLINE_URL = "/offline";

const APP_SHELL = [
  "/",
  "/offline",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-icon-512.png",
  "/icons/apple-touch-icon.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_APP);
      await cache.addAll(APP_SHELL);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_APP && k !== CACHE_FILES)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico"
  );
}

function isFileUrl(url) {
  // Lesson PDFs and images served from the storage layer.
  return url.pathname.includes("/files/");
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_FILES);
      cache.put(request, response.clone());
      pruneFilesCache(cache);
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_FILES);
      cache.put(request, response.clone());
      pruneFilesCache(cache);
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached ?? new Response("Offline", { status: 503 });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_APP);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline ?? new Response("Offline", { status: 503 });
  }
}

// Keep the files cache bounded (LRU-ish): drop the oldest entries past a cap.
const FILE_CACHE_LIMIT = 60;

async function pruneFilesCache(cache) {
  try {
    const requests = await cache.keys();
    if (requests.length <= FILE_CACHE_LIMIT) return;
    const sorted = requests
      .map((r) => ({ r, t: r.url.length }))
      .sort((a, b) => a.t - b.t);
    const excess = sorted.slice(0, requests.length - FILE_CACHE_LIMIT);
    await Promise.all(excess.map(({ r }) => cache.delete(r)));
  } catch {
    // ignore
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    // Cross-origin backend: cache lesson PDFs and images offline.
    if (isFileUrl(url)) {
      event.respondWith(cacheFirst(request));
    }
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_APP));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

// ── Background Sync (offline submission queue) ─────────────────────────
// The app queues submissions in IndexedDB (el-bannawy-offline / queue).
// When connectivity returns, this SW either wakes an open client (which runs
// the app-level sync engine) or flushes the queue itself if no client is open.
const QUEUE_DB = "el-bannawy-offline";
const QUEUE_STORE = "queue";
const SYNC_TAG = "el-bannawy-sync";

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function queueGetAll(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const getReq = tx.objectStore(QUEUE_STORE).getAll();
    getReq.onsuccess = () => resolve(getReq.result || []);
    getReq.onerror = () => reject(getReq.error);
  });
}

function queueDelete(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function apiBaseUrl() {
  return (
    (self.__EL_BANNAWY_API_URL || "http://localhost:4000/api/v1")
  );
}

async function flushQueueFromWorker() {
  let db;
  try {
    db = await openQueueDb();
  } catch {
    return;
  }
  let records;
  try {
    records = await queueGetAll(db);
  } catch {
    return;
  }
  for (const record of records) {
    try {
      const response = await fetch(`${apiBaseUrl()}${record.endpoint}`, {
        method: record.method || "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: typeof record.body === "string" ? record.body : JSON.stringify(record.body || {}),
      });
      if (response.ok) {
        await queueDelete(db, record.id);
      }
    } catch {
      // Offline again — stop and wait for the next sync event.
      break;
    }
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag !== SYNC_TAG) return;
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      if (clients.length > 0) {
        // Wake an open tab so the app-level engine syncs (with latest-wins and dedupe).
        clients.forEach((client) => client.postMessage({ type: SYNC_TAG }));
        return;
      }
      await flushQueueFromWorker();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "el-bannawy-api-url") {
    self.__EL_BANNAWY_API_URL = event.data.url;
  }
});

// ── Push Notifications (FCM) ──────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json();
  if (!data) return;
  const title = data.notification?.title ?? data.title ?? "إشعار جديد";
  const options = {
    body: data.notification?.body ?? data.body ?? "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-48.png",
    vibrate: [200, 100, 200],
    data: data.data ?? {},
    ...(data.notification?.image ? { image: data.notification.image } : {}),
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = new URL("/dashboard/notifications", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    }),
  );
});
