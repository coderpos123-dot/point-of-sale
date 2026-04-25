// ==================== CENTRALIZED THEME SYSTEM ====================
// This file handles ALL theme functionality for the entire POS system
// NO other files should contain theme logic to prevent conflicts

(function() {
    'use strict';
    
    // Default theme - consistent across the entire system
    const DEFAULT_THEME = 'dark';
    
    // Initialize theme immediately to prevent flicker
    function initThemeImmediate() {
        const savedTheme = localStorage.getItem('theme') || DEFAULT_THEME;
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Store in global for other scripts
        window.currentTheme = savedTheme;
    }
    
    // Call immediately if DOM exists
    if (document.documentElement) {
        initThemeImmediate();
    }
    
    // Main theme initialization function
    function initTheme() {
        const html = document.documentElement;
        const savedTheme = localStorage.getItem('theme') || DEFAULT_THEME;
        
        html.setAttribute('data-theme', savedTheme);
        window.currentTheme = savedTheme;
        
        // Update AppData if available
        if (typeof AppData !== 'undefined' && AppData.settings) {
            AppData.settings.theme = savedTheme;
            if (typeof saveData === 'function') {
                saveData();
            }
        }
        
        updateThemeIcon(savedTheme);
        console.log('✅ Theme initialized:', savedTheme);
    }

    function updateThemeIcon(theme) {
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.setAttribute('data-lucide', theme === 'dark' ? 'moon' : 'sun');
        }
        
        // Update any theme selects in settings
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = theme;
        }
    }

    function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme') || DEFAULT_THEME;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Update DOM immediately
        html.setAttribute('data-theme', newTheme);
        
        // Update localStorage
        localStorage.setItem('theme', newTheme);
        
        // Update global variable
        window.currentTheme = newTheme;
        
        // Update AppData settings
        if (typeof AppData !== 'undefined' && AppData.settings) {
            AppData.settings.theme = newTheme;
            if (typeof saveData === 'function') {
                saveData();
            }
        }
        
        // Update icon
        updateThemeIcon(newTheme);
        
        // Refresh icons after theme change
        setTimeout(() => {
            if (typeof refreshIcons === 'function') {
                refreshIcons();
            } else if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 50);
        
        console.log('✅ Theme toggled to:', newTheme);
    }
    
    // Get current theme
    function getCurrentTheme() {
        return window.currentTheme || localStorage.getItem('theme') || DEFAULT_THEME;
    }
    
    // Set theme programmatically
    function setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            console.error('Invalid theme:', theme);
            return;
        }
        
        const html = document.documentElement;
        html.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        window.currentTheme = theme;
        
        if (typeof AppData !== 'undefined' && AppData.settings) {
            AppData.settings.theme = theme;
            if (typeof saveData === 'function') {
                saveData();
            }
        }
        
        updateThemeIcon(theme);
        
        setTimeout(() => {
            if (typeof refreshIcons === 'function') {
                refreshIcons();
            } else if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 50);
    }

    // Make functions globally available
    window.initTheme = initTheme;
    window.toggleTheme = toggleTheme;
    window.updateThemeIcon = updateThemeIcon;
    window.getCurrentTheme = getCurrentTheme;
    window.setTheme = setTheme;

    // Initialize theme when DOM is ready
    if (document.readyState !== 'loading') {
        initTheme();
    } else {
        document.addEventListener('DOMContentLoaded', initTheme);
    }
    
})();
