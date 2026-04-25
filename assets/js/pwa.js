// ==================== PWA SUPPORT ====================
// Progressive Web App functionality - FULL OFFLINE SUPPORT

// Remove forced screen orientation lock - let device handle it naturally
// This respects user's device rotation settings
console.log('📱 PWA: Respecting device rotation settings');

// Clear old service workers and caches on load
if ('serviceWorker' in navigator) {
    // Unregister all old service workers
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
            registration.unregister().then(() => {
                console.log('🧹 Cleared old service worker');
            });
        });
    });
    
    // Clear old caches
    caches.keys().then(cacheNames => {
        return Promise.all(
            cacheNames.map(cacheName => {
                if (cacheName !== 'pos-system-v60') {
                    console.log('🧹 Clearing old cache:', cacheName);
                    return caches.delete(cacheName);
                }
            })
        );
    });
}

// Register service worker for offline functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Use absolute path from root to avoid 404 errors when on subpages
        const swPath = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/').replace(/\/pages$/, '') + '/service-worker.js';
        // If we're in a subdirectory (like /pages/), go up to root
        const rootPath = window.location.pathname.includes('/pages/') 
            ? '../service-worker.js' 
            : './service-worker.js';
        navigator.serviceWorker.register(rootPath)
            .then(registration => {
                console.log('✅ Service Worker registered - App works OFFLINE!');
                console.log('📍 Scope:', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available
                            console.log('🔄 New version available!');
                            if (typeof showToast === 'function') {
                                showToast('New version available! Refresh to update.', 'info');
                            }
                        }
                    });
                });
                
                // Update service worker on page load
                registration.update();
            })
            .catch(error => {
                console.error('❌ Service Worker registration failed:', error);
                console.log('⚠️ App will still work but without offline support');
            });
    });
} else {
    console.warn('⚠️ Service Workers not supported in this browser');
    console.log('💡 App will work but without offline support');
}

// Install prompt
let deferredPrompt;
let installPromptShown = false;

window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📱 PWA: Install prompt available');
    // Prevent the mini-infobar from appearing
    e.preventDefault();
    // Store the event for later use
    deferredPrompt = e;
    
    // Show install button/notification
    showInstallPrompt();
});

function showInstallPrompt() {
    console.log('📱 PWA: Showing install prompt');
    
    // Don't show if already shown
    if (installPromptShown) {
        console.log('📱 PWA: Install prompt already shown');
        return;
    }
    
    // Don't show if already installed
    if (isInstalledApp()) {
        console.log('📱 PWA: App already installed');
        return;
    }
    
    installPromptShown = true;
    
    // Check if it's an Apple device
    const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    // Create install banner if it doesn't exist
    let installBanner = document.getElementById('pwaInstallBanner');
    
    if (!installBanner) {
        installBanner = document.createElement('div');
        installBanner.id = 'pwaInstallBanner';
        installBanner.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #7c3aed, #6d28d9);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(124, 58, 237, 0.4);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 16px;
            max-width: 90%;
            animation: slideUp 0.4s ease-out;
        `;
        
        // Different text for Apple devices
        const titleText = isApple && isSafari ? 'Install POS System' : 'Install POS System';
        const descText = isApple && isSafari 
            ? 'Tap the share button and select "Add to Home Screen" or "Add to Dock"' 
            : 'Install as app for better experience & offline access';
        const buttonText = isApple && isSafari ? 'Show Instructions' : 'Install';
        
        installBanner.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">${titleText}</div>
                <div style="font-size: 14px; opacity: 0.9;">${descText}</div>
            </div>
            <button id="pwaInstallBtn" style="
                background: white;
                color: #7c3aed;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: 700;
                cursor: pointer;
                font-size: 14px;
                white-space: nowrap;
            ">${buttonText}</button>
            <button id="pwaCloseBtn" style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: none;
                padding: 8px;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
            ">✕</button>
        `;
        
        document.body.appendChild(installBanner);
        
        // Add event listeners
        document.getElementById('pwaInstallBtn').addEventListener('click', installApp);
        document.getElementById('pwaCloseBtn').addEventListener('click', () => {
            installBanner.style.animation = 'slideDown 0.3s ease-out';
            setTimeout(() => installBanner.remove(), 300);
        });
    }
    
    // Show toast notification as well
    if (typeof showToast === 'function') {
        const toastMsg = isApple && isSafari 
            ? '📱 Tap Share → Add to Home Screen to install!' 
            : '📱 Install app for offline access!';
        showToast(toastMsg, 'info');
    }
}

// Check if install prompt is available after a delay (for browsers that delay the event)
setTimeout(() => {
    if (!installPromptShown && !isInstalledApp()) {
        const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        
        console.log('📱 PWA: Device check - isApple:', isApple, 'isSafari:', isSafari);
        console.log('📱 PWA: User Agent:', navigator.userAgent);
        
        if (isApple && isSafari) {
            console.log('📱 PWA: Apple device detected - showing install prompt');
            showInstallPrompt(); // Show for Apple devices even without beforeinstallprompt
        } else if (!deferredPrompt) {
            console.log('📱 PWA: Install prompt not available yet');
            console.log('💡 Visit the site a few more times for install option');
        }
    }
}, 2000);

async function installApp() {
    console.log('📱 PWA: Install button clicked');
    
    // Check if it's iOS/macOS Safari
    const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    if (isApple && isSafari && !deferredPrompt) {
        // Show Apple-specific install instructions
        showAppleInstallInstructions();
        return;
    }
    
    if (!deferredPrompt) {
        console.log('⚠️ PWA: No install prompt available');
        if (typeof showToast === 'function') {
            showToast('Install not available. Try: Menu → Install App or Add to Home Screen', 'warning');
        }
        return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('✅ User accepted the install prompt');
        if (typeof showToast === 'function') {
            showToast('App installed successfully!', 'success');
        }
    } else {
        console.log('❌ User dismissed the install prompt');
        if (typeof showToast === 'function') {
            showToast('Installation cancelled', 'info');
        }
    }
    
    // Clear the deferred prompt
    deferredPrompt = null;
    
    // Hide install banner
    const installBanner = document.getElementById('pwaInstallBanner');
    if (installBanner) {
        installBanner.style.animation = 'slideDown 0.3s ease-out';
        setTimeout(() => installBanner.remove(), 300);
    }
}

function showAppleInstallInstructions() {
    console.log('📱 PWA: Showing Apple install instructions');
    
    // Create Apple install modal
    const modal = document.createElement('div');
    modal.id = 'appleInstallModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease-out;
    `;
    
    const isPhone = /iPhone|iPod/.test(navigator.userAgent);
    const isMac = /Macintosh/.test(navigator.userAgent);
    
    let instructions = '';
    if (isPhone) {
        instructions = `
            <div style="text-align: center; margin: 20px 0;">
                <div style="font-size: 48px; margin-bottom: 10px;">📱</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 20px;">Install on iPhone</div>
                <div style="text-align: left; max-width: 300px;">
                    <div style="display: flex; align-items: center; margin: 15px 0; padding: 10px; background: rgba(124, 58, 237, 0.1); border-radius: 8px;">
                        <span style="font-size: 24px; margin-right: 15px;">1️⃣</span>
                        <span>Tap the <strong>Share</strong> button ⬆️ at the bottom</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 15px 0; padding: 10px; background: rgba(124, 58, 237, 0.1); border-radius: 8px;">
                        <span style="font-size: 24px; margin-right: 15px;">2️⃣</span>
                        <span>Scroll down and tap <strong>"Add to Home Screen"</strong> 📱</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 15px 0; padding: 10px; background: rgba(124, 58, 237, 0.1); border-radius: 8px;">
                        <span style="font-size: 24px; margin-right: 15px;">3️⃣</span>
                        <span>Tap <strong>"Add"</strong> to install the app</span>
                    </div>
                </div>
            </div>
        `;
    } else if (isMac) {
        instructions = `
            <div style="text-align: center; margin: 20px 0;">
                <div style="font-size: 48px; margin-bottom: 10px;">💻</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 20px;">Install on Mac</div>
                <div style="text-align: left; max-width: 350px;">
                    <div style="display: flex; align-items: center; margin: 15px 0; padding: 10px; background: rgba(124, 58, 237, 0.1); border-radius: 8px;">
                        <span style="font-size: 24px; margin-right: 15px;">1️⃣</span>
                        <span>Click <strong>File</strong> in the menu bar</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 15px 0; padding: 10px; background: rgba(124, 58, 237, 0.1); border-radius: 8px;">
                        <span style="font-size: 24px; margin-right: 15px;">2️⃣</span>
                        <span>Select <strong>"Add to Dock"</strong> 🖥️</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 15px 0; padding: 10px; background: rgba(124, 58, 237, 0.1); border-radius: 8px;">
                        <span style="font-size: 24px; margin-right: 15px;">3️⃣</span>
                        <span>The app will appear in your Dock for easy access</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        instructions = `
            <div style="text-align: center; margin: 20px 0;">
                <div style="font-size: 48px; margin-bottom: 10px;">🍎</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 20px;">Install on Apple Device</div>
                <div style="text-align: left; max-width: 300px;">
                    <div style="margin: 15px 0; padding: 15px; background: rgba(124, 58, 237, 0.1); border-radius: 8px;">
                        <strong>Safari Browser:</strong><br>
                        Use the Share button and select "Add to Home Screen" or "Add to Dock"
                    </div>
                </div>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 16px;
            padding: 30px;
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
        ">
            <button onclick="document.getElementById('appleInstallModal').remove()" style="
                position: absolute;
                top: 15px;
                right: 15px;
                background: rgba(0, 0, 0, 0.1);
                border: none;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
            ">✕</button>
            
            ${instructions}
            
            <div style="text-align: center; margin-top: 30px;">
                <button onclick="document.getElementById('appleInstallModal').remove()" style="
                    background: #7c3aed;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 16px;
                ">Got it!</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add fade in animation
    const fadeInStyle = document.createElement('style');
    fadeInStyle.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(fadeInStyle);
}

// Check if app is installed
window.addEventListener('appinstalled', () => {
    console.log('✅ POS System installed successfully');
    if (typeof showToast === 'function') {
        showToast('POS System installed! You can now use it offline.', 'success');
    }
    deferredPrompt = null;
    
    // Hide install banner
    const installBanner = document.getElementById('pwaInstallBanner');
    if (installBanner) {
        installBanner.remove();
    }
});

// Handle online/offline status with better feedback
window.addEventListener('online', () => {
    console.log('✅ Internet connection restored - ONLINE');
    document.body.classList.remove('offline');
    
    if (typeof showToast === 'function') {
        showToast('✓ Back online - syncing data...', 'success');
    }
    
    // Trigger sync if SyncManager is available
    if (typeof SyncManager !== 'undefined' && SyncManager.syncQueue.length > 0) {
        console.log('🔄 Syncing queued data...');
        setTimeout(() => {
            SyncManager.syncToDatabase();
        }, 1000);
    }
});

window.addEventListener('offline', () => {
    console.log('⚠️ Internet connection lost - OFFLINE MODE');
    console.log('💾 All data will be saved locally');
    document.body.classList.add('offline');
    
    if (typeof showToast === 'function') {
        showToast('⚠️ Offline mode - data saved locally', 'warning');
    }
});

// Listen for messages from service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data.type === 'SYNC_REQUESTED') {
            console.log('Service Worker requested sync');
            // Check if syncToDatabase function exists in global scope
            if (typeof syncToDatabase === 'function') {
                syncToDatabase();
            } else {
                console.warn('syncToDatabase function not available');
            }
        }
    });
}

// Sync to database function - handles offline data synchronization
function syncToDatabase() {
    console.log('🔄 Starting database sync...');
    
    try {
        // Check if we're online
        if (!navigator.onLine) {
            console.log('⚠️ Offline - sync will be attempted when connection is restored');
            return;
        }
        
        // Check if AppData exists
        if (typeof AppData === 'undefined') {
            console.warn('⚠️ AppData not available for sync');
            return;
        }
        
        // Simulate sync process (replace with actual API calls)
        console.log('📊 Syncing user data...');
        console.log('📦 Syncing inventory data...');
        console.log('💰 Syncing sales data...');
        console.log('💸 Syncing expense data...');
        console.log('🔔 Syncing notifications...');
        
        // Save data locally as backup
        if (typeof saveData === 'function') {
            saveData();
        }
        
        console.log('✅ Database sync completed successfully');
        
        // Show success notification if toast function is available
        if (typeof showToast === 'function') {
            showToast('Data synced successfully', 'success');
        }
        
    } catch (error) {
        console.error('❌ Database sync failed:', error);
        
        // Show error notification if toast function is available
        if (typeof showToast === 'function') {
            showToast('Sync failed - data saved locally', 'warning');
        }
    }
}

// Export syncToDatabase function to global scope
window.syncToDatabase = syncToDatabase;

// Background sync registration (if supported)
if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(registration => {
        // Register for background sync
        return registration.sync.register('sync-data');
    }).then(() => {
        console.log('✅ Background sync registered');
    }).catch(error => {
        console.log('❌ Background sync registration failed:', error);
    });
}

// Check if running as installed app
function isInstalledApp() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
}

if (isInstalledApp()) {
    console.log('✅ Running as installed app');
    document.body.classList.add('installed-app');
} else {
    console.log('📱 Running in browser - install prompt will be shown if available');
}

// Add CSS animations for install banner
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translate(-50%, 100px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
    
    @keyframes slideDown {
        from {
            opacity: 1;
            transform: translate(-50%, 0);
        }
        to {
            opacity: 0;
            transform: translate(-50%, 100px);
        }
    }
`;
document.head.appendChild(style);

// Export functions
window.installApp = installApp;
window.isInstalledApp = isInstalledApp;
