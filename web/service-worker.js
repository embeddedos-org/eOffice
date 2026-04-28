// eOffice Service Worker — Offline-First with Network-First API Strategy
const CACHE_NAME = 'eoffice-cache-v2';
const API_CACHE = 'eoffice-api-cache-v1';

// Static assets to precache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install: precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: strategy based on request type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Static assets: cache-first with network fallback
  event.respondWith(cacheFirstWithNetwork(request));
});

async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (request.method === 'GET') {
      const cached = await caches.match(request);
      if (cached) return cached;
    }
    // Queue offline mutations for background sync
    if (request.method !== 'GET') {
      await queueOfflineRequest(request);
      return new Response(JSON.stringify({ queued: true, message: 'Request queued for sync' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// Offline queue using IndexedDB
const OFFLINE_QUEUE_DB = 'eoffice-offline-queue';

async function queueOfflineRequest(request) {
  try {
    const body = await request.clone().text();
    const item = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      timestamp: Date.now(),
    };
    // Store in IndexedDB
    const db = await openDB();
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').add(item);
  } catch {}
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_QUEUE_DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('queue', { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'eoffice-sync') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  try {
    const db = await openDB();
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    const items = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
    });

    for (const item of items) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });
      } catch {
        // Will retry on next sync
        return;
      }
    }

    // Clear queue after successful sync
    const clearTx = db.transaction('queue', 'readwrite');
    clearTx.objectStore('queue').clear();
  } catch {}
}
