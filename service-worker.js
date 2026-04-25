// Service Worker for POS System - OPTIMIZED for fast PWA installation
// Enables FULL offline functionality with minimal install delay

const CACHE_NAME = 'pos-system-v66'; // Updated cache version for optimization

// Get the base path from the service worker location
const getBasePath = () => {
  const swPath = self.location.pathname;
  return swPath.substring(0, swPath.lastIndexOf('/') + 1);
};

const BASE_PATH = getBasePath();

// ONLY ESSENTIAL FILES for fast installation - others cached on-demand
const CORE_FILES = [
  `${BASE_PATH}`,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}assets/css/styles.css`,
  `${BASE_PATH}assets/js/main.js`,
  `${BASE_PATH}assets/js/pwa.js`
];

// Install event - FAST installation with minimal caching
self.addEventListener('install', event => {
  console.log('✅ Service Worker: Installing (optimized)...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Service Worker: Caching core files only');
        // Cache only essential files for fast installation
        return cache.addAll(CORE_FILES);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete (fast)');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('❌ Service Worker installation failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('✅ Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - NETWORK FIRST with cache fallback for better performance
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Don't cache if response is not ok
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const url = event.request.url;
        
        // Cache CDN resources and local files (but not API endpoints)
        const isCDN = url.includes('unpkg.com') || 
                     url.includes('cdn.jsdelivr.net') || 
                     url.includes('cdnjs.cloudflare.com');
        const isLocal = url.includes(self.location.origin);
        
        // Cache if it's CDN or local (but not API endpoints)
        if ((isCDN || isLocal) && !url.includes('/api/')) {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        
        return networkResponse;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // For navigation requests, return index.html
          if (event.request.mode === 'navigate') {
            return caches.match(`${BASE_PATH}index.html`);
          }
          
          return new Response('Offline - content not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Background sync event - sync data when connection restored
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('🔄 Service Worker: Background sync triggered');
    event.waitUntil(syncData());
  }
});

// Sync data function
async function syncData() {
  try {
    console.log('🔄 Service Worker: Attempting to sync data...');
    
    // Notify all clients to sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_REQUESTED',
        timestamp: new Date().toISOString()
      });
    });
    
    console.log('✅ Service Worker: Sync request sent to clients');
  } catch (error) {
    console.error('❌ Service Worker: Sync failed', error);
  }
}

// Push notification event (for future use)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New notification from POS System',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'pos-notification'
  };

  event.waitUntil(
    self.registration.showNotification('POS System', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Message event - handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Service Worker: Loaded (optimized for fast installation)');
