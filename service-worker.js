// Service Worker for POS System
// Enables FULL offline functionality and app installation

const CACHE_NAME = 'pos-system-v65'; // Updated cache version

// Get the base path from the service worker location
const getBasePath = () => {
  const swPath = self.location.pathname;
  return swPath.substring(0, swPath.lastIndexOf('/') + 1);
};

const BASE_PATH = getBasePath();

// ONLY FILES THAT ACTUALLY EXIST - INCLUDING NEW SERVICE FILES
const urlsToCache = [
  `${BASE_PATH}`,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}IDZ-logo.png`,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}pages/dashboard.html`,
  `${BASE_PATH}pages/sales.html`,
  `${BASE_PATH}pages/Inventory.html`,
  `${BASE_PATH}pages/expenses.html`,
  `${BASE_PATH}pages/wallet.html`,
  `${BASE_PATH}pages/reports.html`,
  `${BASE_PATH}pages/profile.html`,
  `${BASE_PATH}pages/settings.html`,
  `${BASE_PATH}pages/manage-users.html`,
  `${BASE_PATH}pages/transaction_history.html`,
  `${BASE_PATH}assets/css/styles.css`,
  `${BASE_PATH}assets/js/main.js`,
  `${BASE_PATH}assets/js/pwa.js`,
  `${BASE_PATH}assets/js/theme_toggle.js`,
  `${BASE_PATH}assets/js/notification-service.js`,
  `${BASE_PATH}assets/js/router-service.js`,
  `${BASE_PATH}assets/js/inventory-service.js`,
  `${BASE_PATH}assets/componets/sidebar.html`,
  `${BASE_PATH}assets/componets/topbar.html`
];

// Install event - cache resources with better error handling
self.addEventListener('install', event => {
  console.log('✅ Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Service Worker: Caching core files');
        
        // Cache local files first (more reliable)
        const localFiles = urlsToCache.filter(url => !url.startsWith('http'));
        const externalFiles = [
          'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js',
          'https://cdn.jsdelivr.net/npm/lucide-static@0.294.0/font/lucide.min.css',
          'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'
        ];
        
        // Cache local files first
        return cache.addAll(localFiles)
          .then(() => {
            console.log('✅ Local files cached successfully');
            
            // Try to cache external files individually
            return Promise.allSettled(
              externalFiles.map(url => 
                cache.add(url).catch(err => {
                  console.warn('⚠️ Failed to cache external resource:', url, err);
                  return null;
                })
              )
            );
          })
          .then(() => {
            console.log('✅ Service Worker: Installation complete');
          });
      })
      .then(() => {
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
      console.log('✅ Service Worker: Activated and ready for offline use');
      return self.clients.claim();
    })
  );
});

// Fetch event - OFFLINE FIRST strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    // Try cache first for instant offline support
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return cached version immediately
          return cachedResponse;
        }

        // Not in cache, try network
        return fetch(event.request)
          .then(networkResponse => {
            // Don't cache if response is not ok
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            const url = event.request.url;
            
            // Cache CDN resources (Lucide icons, jsPDF)
            const isCDN = url.includes('unpkg.com') || 
                         url.includes('cdn.jsdelivr.net') || 
                         url.includes('cdnjs.cloudflare.com');
            
            // Cache local resources
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
          .catch(error => {
            console.log('⚠️ Fetch failed, using offline fallback:', error);
            
            // For navigation requests, return index.html from base path
            if (event.request.mode === 'navigate') {
              return caches.match(`${BASE_PATH}index.html`);
            }
            
            // For other requests, return a basic offline response
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

console.log('✅ Service Worker: Script loaded and ready');
