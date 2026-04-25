// ==================== CENTRALIZED INVENTORY SERVICE ====================
// Single source of truth for inventory operations with auto-cleanup

class InventoryService {
    constructor() {
        this.inventory = [];
        this.listeners = [];
        this.soldOutHistory = [];
    }

    // Add inventory item
    add(itemData) {
        const newItem = {
            id: this.generateId(),
            name: itemData.name,
            quantity: parseInt(itemData.quantity),
            buyingPrice: parseFloat(itemData.buyingPrice),
            sellingPrice: parseFloat(itemData.sellingPrice),
            lowStockThreshold: parseInt(itemData.lowStockThreshold) || 10,
            dateAdded: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        // Calculate profits
        newItem.profitPerItem = newItem.sellingPrice - newItem.buyingPrice;
        newItem.netProfit = newItem.profitPerItem * newItem.quantity;
        
        this.inventory.push(newItem);
        this.save();
        
        this.notifyListeners('add', newItem);
        
        return { success: true, message: 'Item added successfully', item: newItem };
    }

    // Update inventory item with auto-cleanup
    update(id, updates) {
        const itemIndex = this.inventory.findIndex(item => item.id === id);
        if (itemIndex === -1) {
            return { success: false, message: 'Item not found' };
        }
        
        const item = this.inventory[itemIndex];
        const oldQuantity = item.quantity;
        
        Object.assign(item, updates);
        item.lastUpdated = new Date().toISOString();
        
        // Recalculate profits
        item.profitPerItem = item.sellingPrice - item.buyingPrice;
        item.netProfit = item.profitPerItem * item.quantity;
        
        // Check for zero stock auto-removal
        if (item.quantity <= 0 && oldQuantity > 0) {
            this.handleZeroStock(item);
            return { success: true, message: 'Item sold out and moved to history', soldOut: true };
        }
        
        this.save();
        this.checkLowStock(item);
        this.notifyListeners('update', item);
        
        return { success: true, message: 'Item updated successfully' };
    }

    // Delete inventory item
    delete(id) {
        const itemIndex = this.inventory.findIndex(item => item.id === id);
        if (itemIndex === -1) {
            return { success: false, message: 'Item not found' };
        }
        
        const item = this.inventory[itemIndex];
        this.inventory.splice(itemIndex, 1);
        this.save();
        
        this.notifyListeners('delete', item);
        
        return { success: true, message: 'Item deleted successfully' };
    }

    // Update stock after sale with auto-cleanup
    updateStock(cartItems) {
        const soldOutItems = [];
        
        cartItems.forEach(cartItem => {
            const inventoryItem = this.inventory.find(item => item.id === cartItem.id);
            if (inventoryItem) {
                const oldQuantity = inventoryItem.quantity;
                inventoryItem.quantity -= cartItem.quantity;
                inventoryItem.lastUpdated = new Date().toISOString();
                
                // Check for zero stock
                if (inventoryItem.quantity <= 0 && oldQuantity > 0) {
                    soldOutItems.push(inventoryItem);
                    this.handleZeroStock(inventoryItem);
                } else {
                    // Check low stock for remaining items
                    this.checkLowStock(inventoryItem);
                }
            }
        });
        
        this.save();
        
        // Notify about stock updates
        soldOutItems.forEach(item => {
            this.notifyListeners('soldOut', item);
        });
        
        return { soldOutItems };
    }

    // Handle zero stock items
    handleZeroStock(item) {
        // Move to sold out history
        const soldOutRecord = {
            ...item,
            soldOutDate: new Date().toISOString(),
            originalId: item.id
        };
        
        this.soldOutHistory.push(soldOutRecord);
        
        // Remove from active inventory
        this.inventory = this.inventory.filter(i => i.id !== item.id);
        
        console.log(`📦 Item sold out: ${item.name} - moved to history`);
    }

    // Check low stock and notify
    checkLowStock(item) {
        const threshold = item.lowStockThreshold || (typeof AppData !== 'undefined' ? AppData.settings?.lowStockThreshold : 10) || 10;
        
        if (item.quantity > 0 && item.quantity <= threshold) {
            console.warn(`Low stock alert: ${item.name} is running low (${item.quantity} left)`);
        }
    }

    // Get all active inventory
    getAll() {
        return [...this.inventory];
    }

    // Get sold out history
    getSoldOutHistory() {
        return [...this.soldOutHistory];
    }

    // Find item by ID
    findById(id) {
        return this.inventory.find(item => item.id === id);
    }

    // Get low stock items
    getLowStockItems() {
        return this.inventory.filter(item => {
            const threshold = item.lowStockThreshold || (typeof AppData !== 'undefined' ? AppData.settings?.lowStockThreshold : 10) || 10;
            return item.quantity <= threshold;
        });
    }

    // Save to storage
    save() {
        try {
            if (typeof AppData !== 'undefined') {
                AppData.inventory = this.inventory;
                if (typeof saveData === 'function') {
                    saveData();
                }
            }
            localStorage.setItem('inventory', JSON.stringify(this.inventory));
            localStorage.setItem('soldOutHistory', JSON.stringify(this.soldOutHistory));
        } catch (error) {
            console.error('Failed to save inventory:', error);
        }
    }

    // Load from storage
    load() {
        try {
            if (typeof AppData !== 'undefined' && AppData.inventory) {
                this.inventory = AppData.inventory;
            } else {
                const saved = localStorage.getItem('inventory');
                if (saved) {
                    this.inventory = JSON.parse(saved);
                }
            }
            
            const savedHistory = localStorage.getItem('soldOutHistory');
            if (savedHistory) {
                this.soldOutHistory = JSON.parse(savedHistory);
            }
        } catch (error) {
            console.error('Failed to load inventory:', error);
            this.inventory = [];
            this.soldOutHistory = [];
        }
    }

    // Add listener for inventory changes
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
                console.error('Inventory listener error:', error);
            }
        });
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Clean up zero stock items (manual trigger)
    cleanupZeroStock() {
        const zeroStockItems = this.inventory.filter(item => item.quantity <= 0);
        
        zeroStockItems.forEach(item => {
            this.handleZeroStock(item);
        });
        
        this.save();
        
        return {
            success: true,
            message: `${zeroStockItems.length} zero-stock items moved to history`,
            count: zeroStockItems.length
        };
    }
}

// Create global inventory service instance
window.InventoryService = new InventoryService();

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.InventoryService.load();
    });
} else {
    window.InventoryService.load();
}

console.log('✅ Inventory Service initialized');