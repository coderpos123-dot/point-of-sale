// ==================== PWA SUPPORT - OPTIMIZED ====================
// Progressive Web App functionality - FAST INSTALLATION

console.log('📱 PWA: Optimized for fast installation');

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
                if (cacheName !== 'pos-system-v66') {
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
        // Use absolute path from root for reliable service worker registration
        const swPath = '/service-worker.js';
        navigator.serviceWorker.register(swPath)
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: slideUp 0.5s ease-out;
        `;
        
        const icon = document.createElement('div');
        icon.innerHTML = '📲';
        icon.style.cssText = 'font-size: 24px;';
        
        const text = document.createElement('div');
        text.innerHTML = isApple && isSafari 
            ? 'Add to Home Screen for best experience'
            : 'Install this app for offline access';
        text.style.cssText = 'font-size: 14px; font-weight: 500;';
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 4px;
            margin-left: 8px;
        `;
        closeButton.onclick = () => {
            installBanner.style.animation = 'slideDown 0.3s ease-in';
            setTimeout(() => installBanner.remove(), 300);
        };
        
        const installButton = document.createElement('button');
        installButton.innerHTML = isApple && isSafari ? 'Learn How' : 'Install';
        installButton.style.cssText = `
            background: white;
            color: #667eea;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            margin-left: 8px;
        `;
        installButton.onclick = () => {
            if (isApple && isSafari) {
                // Show iOS instructions
                alert('To install: Tap the Share button, then "Add to Home Screen"');
            } else if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    }
                    deferredPrompt = null;
                });
            }
            installBanner.style.animation = 'slideDown 0.3s ease-in';
            setTimeout(() => installBanner.remove(), 300);
        };
        
        installBanner.appendChild(icon);
        installBanner.appendChild(text);
        installBanner.appendChild(installButton);
        installBanner.appendChild(closeButton);
        document.body.appendChild(installBanner);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (installBanner && document.body.contains(installBanner)) {
                installBanner.style.animation = 'slideDown 0.3s ease-in';
                setTimeout(() => installBanner.remove(), 300);
            }
        }, 10000);
    }
}

// Manual install function
function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            deferredPrompt = null;
        });
    } else {
        console.log('Install prompt not available');
    }
}

// Check if running as installed app
function isInstalledApp() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
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

console.log('✅ PWA module loaded');
