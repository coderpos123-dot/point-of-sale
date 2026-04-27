// ==================== NOTIFICATION SERVICE ====================
// Centralized notification management

class NotificationService {
    constructor() {
        this.notifications = [];
        this.listeners = [];
        this.load();
    }

    // Generate unique ID
    generateId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Add notification
    add(type, title, message) {
        const notification = {
            id: this.generateId(),
            type,
            title,
            message,
            date: new Date().toISOString(),
            read: false
        };
        
        this.notifications.unshift(notification);
        
        // Keep only last 100 notifications
        if (this.notifications.length > 100) {
            this.notifications = this.notifications.slice(0, 100);
        }
        
        this.save();
        this.updateBadge();
        this.notifyListeners('add', notification);
        
        return notification;
    }

    // Mark as read
    markAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification && !notification.read) {
            notification.read = true;
            this.save();
            this.updateBadge();
            this.notifyListeners('markRead', notification);
        }
    }

    // Mark all as read
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.save();
        this.updateBadge();
        this.notifyListeners('markAllRead');
    }

    // Delete notification
    delete(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            const deleted = this.notifications.splice(index, 1)[0];
            this.save();
            this.updateBadge();
            this.notifyListeners('delete', deleted);
        }
    }

    // Clear all
    clearAll() {
        this.notifications = [];
        this.save();
        this.updateBadge();
        this.notifyListeners('clearAll');
    }

    // Get all notifications
    getAll() {
        return this.notifications;
    }

    // Get unread count
    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    // Update badge
    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            const count = this.getUnreadCount();
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    // Save to localStorage
    save() {
        try {
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('Failed to save notifications:', error);
        }
    }

    // Load from localStorage
    load() {
        try {
            const stored = localStorage.getItem('notifications');
            if (stored) {
                this.notifications = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
            this.notifications = [];
        }
    }

    // Add listener
    addListener(callback) {
        this.listeners.push(callback);
    }

    // Notify listeners
    notifyListeners(action, data) {
        this.listeners.forEach(callback => {
            try {
                callback(action, data);
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }
}

// Create global instance
window.NotificationService = new NotificationService();

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.NotificationService.updateBadge();
    });
} else {
    window.NotificationService.updateBadge();
}
// ==================== NOTIFICATION SERVICE ====================
// Centralized notification management

class NotificationService {
    constructor() {
        this.notifications = [];
        this.listeners = [];
        this.load();
    }

    // Generate unique ID
    generateId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Add notification
    add(type, title, message) {
        const notification = {
            id: this.generateId(),
            type,
            title,
            message,
            date: new Date().toISOString(),
            read: false
        };
        
        this.notifications.unshift(notification);
        
        // Keep only last 100 notifications
        if (this.notifications.length > 100) {
            this.notifications = this.notifications.slice(0, 100);
        }
        
        this.save();
        this.updateBadge();
        this.notifyListeners('add', notification);
        
        return notification;
    }

    // Mark as read
    markAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification && !notification.read) {
            notification.read = true;
            this.save();
            this.updateBadge();
            this.notifyListeners('markRead', notification);
        }
    }

    // Mark all as read
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.save();
        this.updateBadge();
        this.notifyListeners('markAllRead');
    }

    // Delete notification
    delete(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            const deleted = this.notifications.splice(index, 1)[0];
            this.save();
            this.updateBadge();
            this.notifyListeners('delete', deleted);
        }
    }

    // Clear all
    clearAll() {
        this.notifications = [];
        this.save();
        this.updateBadge();
        this.notifyListeners('clearAll');
    }

    // Get all notifications
    getAll() {
        return this.notifications;
    }

    // Get unread count
    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    // Update badge
    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            const count = this.getUnreadCount();
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    // Save to localStorage
    save() {
        try {
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('Failed to save notifications:', error);
        }
    }

    // Load from localStorage
    load() {
        try {
            const stored = localStorage.getItem('notifications');
            if (stored) {
                this.notifications = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
            this.notifications = [];
        }
    }

    // Add listener
    addListener(callback) {
        this.listeners.push(callback);
    }

    // Notify listeners
    notifyListeners(action, data) {
        this.listeners.forEach(callback => {
            try {
                callback(action, data);
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }
}

// Create global instance
window.NotificationService = new NotificationService();

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.NotificationService.updateBadge();
    });
} else {
    window.NotificationService.updateBadge();
}
