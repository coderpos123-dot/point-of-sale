// ==================== CENTRALIZED ROUTER SERVICE ====================
// Single source of truth for navigation and active page state

class RouterService {
    constructor() {
        this.currentPage = null;
        this.listeners = [];
        this.initialized = false;
    }

    // Initialize router
    init() {
        if (this.initialized) return;
        
        this.currentPage = this.getCurrentPageFromURL();
        this.updateActiveState();
        this.setupNavigationListeners();
        this.initialized = true;
        
        console.log('✅ Router Service initialized, current page:', this.currentPage);
    }

    // Get current page from URL
    getCurrentPageFromURL() {
        const path = window.location.pathname;
        const filename = path.split('/').pop();
        return filename.replace('.html', '') || 'index';
    }

    // Update active navigation state
    updateActiveState() {
        // Remove all active classes first
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
        });

        // Set active class for current page
        const currentPageItem = document.querySelector(`.nav-item[data-page="${this.currentPage}"]`);
        if (currentPageItem) {
            currentPageItem.classList.add('active');
        }

        // Update page title in topbar
        this.updatePageTitle();
        
        // Notify listeners
        this.notifyListeners('pageChanged', this.currentPage);
    }

    // Update page title
    updatePageTitle() {
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            const titles = {
                'dashboard': 'Dashboard',
                'sales': 'Sales',
                'Inventory': 'Inventory', // Capital I to match filename
                'expenses': 'Expenses',
                'wallet': 'Wallet',
                'reports': 'Reports',
                'profile': 'Profile',
                'settings': 'Settings',
                'manage-users': 'Manage Users',
                'transaction_history': 'Transaction History'
            };
            pageTitle.textContent = titles[this.currentPage] || 'Dashboard';
        }
    }

    // Navigate to page
    navigateTo(pageName, pageFile) {
        if (this.currentPage === pageName) return;
        
        this.currentPage = pageName;
        
        // Use simple redirect for reliability
        if (pageFile && window.location.pathname !== pageFile) {
            window.location.href = pageFile;
        }
    }

    // Setup navigation event listeners
    setupNavigationListeners() {
        // Handle navigation clicks with debouncing
        let navigationTimeout = null;
        
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem && navItem.hasAttribute('data-page')) {
                e.preventDefault();
                
                // Clear any pending navigation
                if (navigationTimeout) {
                    clearTimeout(navigationTimeout);
                }
                
                const pageName = navItem.getAttribute('data-page');
                const pageFile = navItem.getAttribute('data-href');
                
                if (pageFile) {
                    // Debounce navigation to prevent rapid clicks
                    navigationTimeout = setTimeout(() => {
                        this.navigateTo(pageName, pageFile);
                    }, 150);
                }
            }
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => {
            this.currentPage = this.getCurrentPageFromURL();
            this.updateActiveState();
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Refresh active state when page becomes visible
                setTimeout(() => {
                    this.updateActiveState();
                }, 100);
            }
        });
    }

    // Add listener for page changes
    addListener(callback) {
        this.listeners.push(callback);
    }

    // Remove listener
    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    // Notify all listeners
    notifyListeners(action, data = null) {
        this.listeners.forEach(callback => {
            try {
                callback(action, data);
            } catch (error) {
                console.error('Router listener error:', error);
            }
        });
    }

    // Get current page
    getCurrentPage() {
        return this.currentPage;
    }

    // Force refresh of active state (for manual corrections)
    refreshActiveState() {
        this.currentPage = this.getCurrentPageFromURL();
        this.updateActiveState();
    }
}

// Create global router service instance
window.RouterService = new RouterService();

// Auto-initialize when components are loaded
function initializeRouterWhenReady() {
    const sidebar = document.getElementById('sidebar');
    const topbar = document.querySelector('.topbar');
    
    if (sidebar && topbar) {
        window.RouterService.init();
    } else {
        setTimeout(initializeRouterWhenReady, 100);
    }
}

// Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRouterWhenReady);
} else {
    initializeRouterWhenReady();
}

console.log('✅ Router Service loaded');