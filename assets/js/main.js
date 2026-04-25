<<<<<<< HEAD
// ==================== MAIN.JS - CENTRALIZED FRONTEND LOGIC ====================
// This file contains ALL frontend logic for the POS System
// Backend calculations are handled by server.js API endpoints

// ==================== DATA MANAGEMENT ====================
const AppData = {
    user: null,
    users: [],
    inventory: [],
    sales: [],
    transactions: [],
    expenses: [],
    wallet: {
        balance: 0,
        transactions: []
    },
    dailySales: {
        date: new Date().toDateString(),
        total: 0,
        count: 0,
        profit: 0
    },
    notifications: [],
    settings: {
        businessName: "International Dealers ZM",
        currency: "ZMW",
        theme: localStorage.getItem('theme') || 'dark',
        lowStockThreshold: 10
    }
};

// Load data from localStorage
function loadData() {
    try {
        const saved = localStorage.getItem('posSystemData');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(AppData, parsed);
            console.log('✅ Data loaded from localStorage');
        }
    } catch (error) {
        console.error('❌ Error loading data:', error);
    }
}

// Save data to localStorage
function saveData() {
    try {
        localStorage.setItem('posSystemData', JSON.stringify(AppData));
        console.log('✅ Data saved to localStorage');
    } catch (error) {
        console.error('❌ Error saving data:', error);
    }
}

// Initialize data on load
loadData();

// ==================== UTILITY FUNCTIONS ====================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatCurrency(amount) {
    return `ZMW ${parseFloat(amount || 0).toFixed(2)}`;
}

function isLoggedIn() {
    return AppData.user !== null;
}

// ==================== AUTHENTICATION ====================
function login(email, password) {
    // Check main user
    if (AppData.user && AppData.user.email === email && AppData.user.password === password) {
        const sessionId = generateId();
        if (!AppData.user.sessions) AppData.user.sessions = [];
        AppData.user.sessions.push({
            id: sessionId,
            location: 'Local Device',
            lastActivity: new Date().toISOString()
        });
        localStorage.setItem('currentSession', sessionId);
        saveData();
        return { success: true, message: 'Login successful', user: AppData.user };
    }
    
    // Check additional users
    const user = AppData.users.find(u => u.email === email && u.password === password);
    if (user) {
        if (user.status === 'inactive') {
            return { success: false, message: 'Account is inactive' };
        }
        AppData.user = user;
        const sessionId = generateId();
        if (!user.sessions) user.sessions = [];
        user.sessions.push({
            id: sessionId,
            location: 'Local Device',
            lastActivity: new Date().toISOString()
        });
        localStorage.setItem('currentSession', sessionId);
        saveData();
        return { success: true, message: 'Login successful', user };
    }
    
    return { success: false, message: 'Invalid email or password' };
}

function createAccount(userData) {
    // Check if email exists
    if (AppData.user && AppData.user.email === userData.email) {
        return { success: false, message: 'Email already registered' };
    }
    
    const existingUser = AppData.users.find(u => u.email === userData.email);
    if (existingUser) {
        return { success: false, message: 'Email already registered' };
    }
    
    const newUser = {
        id: generateId(),
        name: userData.name,
        email: userData.email,
        dateOfBirth: userData.dateOfBirth,
        password: userData.password,
        securityQuestion: userData.securityQuestion,
        securityAnswer: userData.securityAnswer,
        role: AppData.user ? 'user' : 'admin',
        createdAt: new Date().toISOString(),
        sessions: []
    };
    
    if (!AppData.user) {
        AppData.user = newUser;
    } else {
        AppData.users.push(newUser);
    }
    
    saveData();
    return { success: true, message: 'Account created successfully' };
}

function logout() {
    const sessionId = localStorage.getItem('currentSession');
    if (AppData.user && AppData.user.sessions) {
        AppData.user.sessions = AppData.user.sessions.filter(s => s.id !== sessionId);
    }
    localStorage.removeItem('currentSession');
    AppData.user = null;
    saveData();
    window.location.href = '../index.html';
}

function deleteAccount() {
    localStorage.clear();
    window.location.href = '../index.html';
}

function eraseAllData() {
    const user = AppData.user;
    const settings = AppData.settings;
    
    AppData.inventory = [];
    AppData.sales = [];
    AppData.transactions = [];
    AppData.expenses = [];
    AppData.wallet = { balance: 0, transactions: [] };
    AppData.dailySales = { date: new Date().toDateString(), total: 0, count: 0, profit: 0 };
    AppData.notifications = [];
    
    saveData();
    return { success: true, message: 'All data erased successfully' };
}

// ==================== INVENTORY MANAGEMENT ====================
function addInventoryItem(itemData) {
    if (window.InventoryService) {
        return window.InventoryService.add(itemData);
    }
    
    // Fallback for backward compatibility
    const newItem = {
        id: generateId(),
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
    
    AppData.inventory.push(newItem);
    saveData();
    
    addNotification('success', 'Inventory Updated', `${newItem.name} added to inventory`);
    
    return { success: true, message: 'Item added successfully', item: newItem };
}

function updateInventoryItem(id, updates) {
    if (window.InventoryService) {
        return window.InventoryService.update(id, updates);
    }
    
    // Fallback for backward compatibility
    const itemIndex = AppData.inventory.findIndex(item => item.id === id);
    if (itemIndex === -1) {
        return { success: false, message: 'Item not found' };
    }
    
    const item = AppData.inventory[itemIndex];
    Object.assign(item, updates);
    item.lastUpdated = new Date().toISOString();
    
    // Recalculate profits
    item.profitPerItem = item.sellingPrice - item.buyingPrice;
    item.netProfit = item.profitPerItem * item.quantity;
    
    // Check for zero stock auto-removal
    if (item.quantity <= 0) {
        // Move to history and remove from active inventory
        addNotification('warning', 'Sold Out', `${item.name} is now out of stock and removed from inventory`);
        AppData.inventory.splice(itemIndex, 1);
        saveData();
        return { success: true, message: 'Item sold out and removed from inventory', soldOut: true };
    }
    
    saveData();
    
    return { success: true, message: 'Item updated successfully' };
}

function deleteInventoryItem(id) {
    if (window.InventoryService) {
        return window.InventoryService.delete(id);
    }
    
    // Fallback for backward compatibility
    const itemIndex = AppData.inventory.findIndex(item => item.id === id);
    if (itemIndex === -1) {
        return { success: false, message: 'Item not found' };
    }
    
    AppData.inventory.splice(itemIndex, 1);
    saveData();
    
    return { success: true, message: 'Item deleted successfully' };
}

// ==================== SALES MANAGEMENT ====================
function recordSale(cartItems, paymentMethod = 'Cash') {
    // Validate stock
    for (const cartItem of cartItems) {
        const inventoryItem = AppData.inventory.find(item => item.id === cartItem.id);
        if (!inventoryItem || inventoryItem.quantity < cartItem.quantity) {
            return { success: false, message: `Insufficient stock for ${cartItem.name}` };
        }
    }
    
    // Calculate totals
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const profit = cartItems.reduce((sum, item) => sum + ((item.price - item.buyingPrice) * item.quantity), 0);
    
    // Create sale record with enhanced accountability
    const sale = {
        id: generateId(),
        items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            buyingPrice: item.buyingPrice
        })),
        total,
        profit,
        amount: total,
        type: 'sale',
        paymentMethod,
        soldBy: AppData.user.name,
        soldByUserId: AppData.user.id, // Track user ID for accountability
        soldByRole: AppData.user.role, // Track user role (admin/worker)
        date: new Date().toISOString()
    };
    
    // Update inventory with auto-cleanup for zero stock
    if (window.InventoryService) {
        const stockResult = window.InventoryService.updateStock(cartItems);
        if (stockResult.soldOutItems && stockResult.soldOutItems.length > 0) {
            console.log(`📦 ${stockResult.soldOutItems.length} items sold out and moved to history`);
        }
    } else {
        // Fallback inventory update
        cartItems.forEach(cartItem => {
            const inventoryItem = AppData.inventory.find(item => item.id === cartItem.id);
            if (inventoryItem) {
                inventoryItem.quantity -= cartItem.quantity;
                inventoryItem.lastUpdated = new Date().toISOString();
                
                // Check for zero stock and auto-remove
                if (inventoryItem.quantity <= 0) {
                    addNotification('warning', 'Sold Out', `${inventoryItem.name} is now out of stock and removed from inventory`);
                    AppData.inventory = AppData.inventory.filter(item => item.id !== inventoryItem.id);
                } else {
                    // Check low stock
                    const threshold = inventoryItem.lowStockThreshold || AppData.settings.lowStockThreshold;
                    if (inventoryItem.quantity <= threshold) {
                        addNotification('warning', 'Low Stock Alert', `${inventoryItem.name} is running low (${inventoryItem.quantity} left)`);
                    }
                }
            }
        });
    }
    
    // Add to sales and transactions
    AppData.sales.push(sale);
    AppData.transactions.push(sale);
    
    // Update daily sales
    checkAndResetDailySales();
    AppData.dailySales.total += total;
    AppData.dailySales.count += 1;
    AppData.dailySales.profit += profit;
    
    // Update wallet
    AppData.wallet.balance += total;
    AppData.wallet.transactions.push({
        id: generateId(),
        amount: total,
        description: `Sale - ${cartItems.map(i => i.name).join(', ')}`,
        date: new Date().toISOString()
    });
    
    saveData();
    
    addNotification('success', 'Sale Completed', `Sale of ${formatCurrency(total)} recorded successfully`);
    
    return { success: true, message: 'Sale recorded successfully', sale };
}

function deleteSale(id) {
    const saleIndex = AppData.sales.findIndex(s => s.id === id);
    if (saleIndex === -1) {
        return { success: false, message: 'Sale not found' };
    }
    
    const sale = AppData.sales[saleIndex];
    
    // Return stock
    sale.items.forEach(item => {
        const inventoryItem = AppData.inventory.find(i => i.id === item.id);
        if (inventoryItem) {
            inventoryItem.quantity += item.quantity;
        }
    });
    
    // Remove from sales and transactions
    AppData.sales.splice(saleIndex, 1);
    AppData.transactions = AppData.transactions.filter(t => t.id !== id);
    
    // Update daily sales
    checkAndResetDailySales();
    if (new Date(sale.date).toDateString() === AppData.dailySales.date) {
        AppData.dailySales.total -= sale.total;
        AppData.dailySales.count -= 1;
        AppData.dailySales.profit -= sale.profit;
    }
    
    // Update wallet
    AppData.wallet.balance -= sale.total;
    AppData.wallet.transactions.push({
        id: generateId(),
        amount: -sale.total,
        description: `Sale deleted - refund`,
        date: new Date().toISOString()
    });
    
    saveData();
    
    return { success: true, message: 'Sale deleted and stock returned' };
}

// ==================== EXPENSES MANAGEMENT ====================
function addExpense(expenseData) {
    const expense = {
        id: generateId(),
        item: expenseData.item,
        amount: parseFloat(expenseData.amount),
        date: new Date().toISOString()
    };
    
    // Check wallet balance
    if (AppData.wallet.balance < expense.amount) {
        return { success: false, message: 'Insufficient wallet balance' };
    }
    
    AppData.expenses.push(expense);
    
    // Update wallet
    AppData.wallet.balance -= expense.amount;
    AppData.wallet.transactions.push({
        id: generateId(),
        amount: -expense.amount,
        description: expense.item,
        date: new Date().toISOString()
    });
    
    saveData();
    
    addNotification('info', 'Expense Recorded', `${expense.item} - ${formatCurrency(expense.amount)}`);
    
    return { success: true, message: 'Expense recorded successfully', expense };
}

function deleteExpense(id) {
    const expenseIndex = AppData.expenses.findIndex(e => e.id === id);
    if (expenseIndex === -1) {
        return { success: false, message: 'Expense not found' };
    }
    
    const expense = AppData.expenses[expenseIndex];
    
    // Refund to wallet
    AppData.wallet.balance += expense.amount;
    AppData.wallet.transactions.push({
        id: generateId(),
        amount: expense.amount,
        description: `Expense deleted - ${expense.item}`,
        date: new Date().toISOString()
    });
    
    AppData.expenses.splice(expenseIndex, 1);
    saveData();
    
    return { success: true, message: 'Expense deleted and amount refunded' };
}

// ==================== WALLET MANAGEMENT ====================
function topUpWallet(amount) {
    const value = parseFloat(amount);
    if (value <= 0) {
        return { success: false, message: 'Invalid amount' };
    }
    
    AppData.wallet.balance += value;
    AppData.wallet.transactions.push({
        id: generateId(),
        amount: value,
        description: 'Wallet top-up',
        date: new Date().toISOString()
    });
    
    saveData();
    
    return { success: true, message: 'Wallet topped up successfully' };
}

function withdrawFromWallet(amount) {
    const value = parseFloat(amount);
    if (value <= 0) {
        return { success: false, message: 'Invalid amount' };
    }
    
    if (AppData.wallet.balance < value) {
        return { success: false, message: 'Insufficient balance' };
    }
    
    AppData.wallet.balance -= value;
    AppData.wallet.transactions.push({
        id: generateId(),
        amount: -value,
        description: 'Withdrawal',
        date: new Date().toISOString()
    });
    
    saveData();
    
    return { success: true, message: 'Withdrawal successful' };
}

// ==================== USER MANAGEMENT ====================
function getAllUsers() {
    return AppData.users || [];
}

function addUser(userData) {
    // Check if email exists
    const exists = AppData.users.some(u => u.email === userData.email);
    if (exists) {
        return { success: false, message: 'Email already exists' };
    }
    
    const newUser = {
        id: generateId(),
        name: userData.name,
        email: userData.email,
        contact: userData.contact,
        role: userData.role,
        password: userData.password,
        status: userData.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessions: []
    };
    
    AppData.users.push(newUser);
    saveData();
    
    return { success: true, message: 'User added successfully', user: newUser };
}

function updateUser(id, updates) {
    const userIndex = AppData.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
        return { success: false, message: 'User not found' };
    }
    
    const user = AppData.users[userIndex];
    Object.assign(user, updates);
    user.updatedAt = new Date().toISOString();
    
    // Update password if provided
    if (updates.password && updates.password.trim() !== '') {
        user.password = updates.password;
    }
    
    saveData();
    
    return { success: true, message: 'User updated successfully' };
}

function deleteUser(id) {
    const userIndex = AppData.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
        return { success: false, message: 'User not found' };
    }
    
    AppData.users.splice(userIndex, 1);
    saveData();
    
    return { success: true, message: 'User deleted successfully' };
}

// ==================== DASHBOARD STATS ====================
function checkAndResetDailySales() {
    const today = new Date().toDateString();
    if (AppData.dailySales.date !== today) {
        AppData.dailySales = {
            date: today,
            total: 0,
            count: 0,
            profit: 0
        };
        saveData();
    }
}

function getDashboardStats() {
    checkAndResetDailySales();
    
    const totalInventoryValue = AppData.inventory.reduce((sum, item) => 
        sum + (item.buyingPrice * item.quantity), 0);
    
    const lowStockCount = AppData.inventory.filter(item => 
        item.quantity <= (item.lowStockThreshold || AppData.settings.lowStockThreshold)).length;
    
    const today = new Date().toDateString();
    const totalExpenses = AppData.expenses
        .filter(expense => new Date(expense.date).toDateString() === today)
        .reduce((sum, expense) => sum + expense.amount, 0);
    
    return {
        dailySales: AppData.dailySales,
        totalInventoryValue,
        lowStockCount,
        totalSales: AppData.sales.length,
        walletBalance: AppData.wallet.balance,
        totalExpenses
    };
}

// ==================== NOTIFICATIONS ====================
function addNotification(type, title, message) {
    if (window.NotificationService) {
        return window.NotificationService.add(type, title, message);
    }
}

function updateNotificationBadge() {
    if (window.NotificationService) {
        window.NotificationService.updateBadge();
    }
}

function markAllNotificationsAsRead() {
    if (window.NotificationService) {
        window.NotificationService.markAllAsRead();
    }
}

function clearAllNotifications() {
    if (window.NotificationService) {
        window.NotificationService.clearAll();
    }
}

// ==================== UI COMPONENTS ====================
async function loadComponent(elementId, componentPath) {
    try {
        const response = await fetch(componentPath);
        const html = await response.text();
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        }
    } catch (error) {
        console.error(`Error loading component ${componentPath}:`, error);
    }
}

async function initializeComponents() {
    await loadComponent('sidebarContainer', '../assets/componets/sidebar.html');
    await loadComponent('topbarContainer', '../assets/componets/topbar.html');
    
    // Initialize after components load
    setTimeout(() => {
        initializeSidebar();
        initializeTopbar();
        updateNotificationBadge();
        refreshIcons();
    }, 100);
}

function initializeSidebar() {
    // Use RouterService if available for consistent active state management
    if (window.RouterService) {
        window.RouterService.refreshActiveState();
    } else {
        // Fallback: FIRST: Remove ALL active classes to prevent duplicates
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // THEN: Set active nav item based on current page
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
        navItems.forEach(item => {
            const page = item.getAttribute('data-page');
            if (page === currentPage) {
                item.classList.add('active');
            }
        });
    }
    
    // Hide admin-only items for workers
    if (AppData.user && AppData.user.role === 'worker') {
        document.querySelectorAll('[data-role="admin"]').forEach(el => {
            el.style.display = 'none';
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

function initializeTopbar() {
    // Profile info
    const profileName = document.getElementById('profileName');
    if (profileName && AppData.user) {
        profileName.textContent = AppData.user.name;
    }
    
    // Profile image
    updateTopbarProfile();
    
    // Sidebar toggle (works on both desktop and mobile)
    const mobileToggle = document.getElementById('mobileSidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // On mobile: toggle mobile-open class
            if (window.innerWidth <= 1023) {
                sidebar.classList.toggle('mobile-open');
            } else {
                // On desktop: toggle collapsed class
                sidebar.classList.toggle('collapsed');
                
                // Save collapsed state
                const isCollapsed = sidebar.classList.contains('collapsed');
                localStorage.setItem('sidebarCollapsed', isCollapsed);
            }
        });
        
        // Restore collapsed state on desktop
        if (window.innerWidth > 1023) {
            const savedCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (savedCollapsed) {
                sidebar.classList.add('collapsed');
            }
        }
        
        // Close mobile sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1023 &&
                sidebar.classList.contains('mobile-open') && 
                !sidebar.contains(e.target) && 
                !mobileToggle.contains(e.target)) {
                sidebar.classList.remove('mobile-open');
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 1023) {
                // Remove mobile class on desktop
                sidebar.classList.remove('mobile-open');
            } else {
                // Remove collapsed class on mobile
                sidebar.classList.remove('collapsed');
            }
        });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (typeof toggleTheme === 'function') {
                toggleTheme();
            }
        });
    }
    
    // Profile dropdown
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        
        document.addEventListener('click', () => {
            profileDropdown.classList.remove('active');
        });
    }
    
    // Topbar logout
    const topbarLogout = document.getElementById('topbarLogout');
    if (topbarLogout) {
        topbarLogout.addEventListener('click', logout);
    }
    
    // Notifications
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsPanel = document.getElementById('notificationsPanel');
    const closeNotifications = document.getElementById('closeNotifications');
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    if (notificationsBtn && notificationsPanel) {
        notificationsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationsPanel.classList.toggle('active');
            loadNotificationsPanel();
        });
        
        if (closeNotifications) {
            closeNotifications.addEventListener('click', () => {
                notificationsPanel.classList.remove('active');
            });
        }
        
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                markAllNotificationsAsRead();
                loadNotificationsPanel();
                showToast('All notifications marked as read', 'success');
            });
        }
        
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Clear all notifications?')) {
                    clearAllNotifications();
                    loadNotificationsPanel();
                    showToast('All notifications cleared', 'success');
                }
            });
        }
        
        document.addEventListener('click', (e) => {
            if (!notificationsPanel.contains(e.target) && !notificationsBtn.contains(e.target)) {
                notificationsPanel.classList.remove('active');
            }
        });
    }
    
    // Page title
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
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
        pageTitle.textContent = titles[currentPage] || 'Dashboard';
    }
}

function updateTopbarProfile() {
    const profileImage = document.getElementById('profileImage');
    const profilePlaceholder = document.getElementById('profilePlaceholder');
    
    if (AppData.user && AppData.user.profilePicture) {
        if (profileImage) {
            profileImage.src = AppData.user.profilePicture;
            profileImage.style.display = 'block';
        }
        if (profilePlaceholder) {
            profilePlaceholder.style.display = 'none';
        }
    } else {
        if (profileImage) {
            profileImage.style.display = 'none';
        }
        if (profilePlaceholder) {
            profilePlaceholder.style.display = 'flex';
        }
    }
}

function loadNotificationsPanel() {
    const list = document.getElementById('topbarNotificationsList');
    if (!list) return;
    
    const notifications = window.NotificationService ? window.NotificationService.getAll() : [];
    
    if (notifications.length === 0) {
        list.innerHTML = `
            <div class="empty-notifications">
                <span class="unicode-icon">🔕</span>
                <p>No notifications</p>
            </div>
        `;
        return;
    }
    
    const unicodeIconMap = {
        'info': 'ℹ️',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌'
    };
    
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };
    
    list.innerHTML = notifications.slice(0, 10).map(n => `
        <div class="notification-item ${n.type} ${n.read ? 'read' : 'unread'}" data-id="${n.id}" onclick="markNotificationAsRead('${n.id}')">
            <div class="notification-item-header">
                <span class="unicode-icon notification-item-icon">${unicodeIconMap[n.type] || 'ℹ️'}</span>
                <span class="notification-item-title">${n.title}</span>
            </div>
            <p class="notification-item-message">${n.message}</p>
            <span class="notification-item-date">${formatDate(n.date)}</span>
        </div>
    `).join('');
}

function markNotificationAsRead(id) {
    if (window.NotificationService) {
        window.NotificationService.markAsRead(id);
        loadNotificationsPanel();
    }
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        'success': 'check-circle',
        'error': 'x-circle',
        'warning': 'alert-triangle',
        'info': 'info'
    };
    
    toast.innerHTML = `
        <i data-lucide="${iconMap[type]}" class="toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== ICON REFRESH ====================
function refreshIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

// ==================== SPA NAVIGATION ====================
let currentPageContent = null;

async function navigateToPage(pageName, pageFile) {
    try {
        // Fetch the page HTML
        const response = await fetch(pageFile);
        if (!response.ok) {
            throw new Error(`Failed to load page: ${pageFile}`);
        }
        
        const html = await response.text();
        
        // Parse the HTML to extract the main content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Get the content wrapper from the new page
        const newContent = doc.querySelector('.content-wrapper');
        if (!newContent) {
            console.error('No content-wrapper found in page');
            return;
        }
        
        // Replace the current content
        const currentContent = document.querySelector('.content-wrapper');
        if (currentContent) {
            // Store scroll position
            const scrollPos = window.scrollY;
            
            // Fade out animation
            currentContent.style.opacity = '0';
            currentContent.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                currentContent.innerHTML = newContent.innerHTML;
                
                // Update page title
                const pageTitle = document.getElementById('pageTitle');
                if (pageTitle) {
                    const titles = {
                        'dashboard': 'Dashboard',
                        'sales': 'Sales',
                        'inventory': 'Inventory',
                        'expenses': 'Expenses',
                        'wallet': 'Wallet',
                        'reports': 'Reports',
                        'profile': 'Profile',
                        'settings': 'Settings',
                        'notifications': 'Notifications',
                        'manage-users': 'Manage Users',
                        'transaction_history': 'Transaction History'
                    };
                    pageTitle.textContent = titles[pageName] || 'Dashboard';
                }
                
                // Update active nav item
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                    if (item.getAttribute('data-page') === pageName) {
                        item.classList.add('active');
                    }
                });
                
                // Fade in animation
                currentContent.style.opacity = '1';
                currentContent.style.transform = 'translateY(0)';
                
                // Scroll to top
                window.scrollTo(0, 0);
                
                // Refresh icons
                refreshIcons();
                
                // Execute any page-specific initialization scripts
                executePageScripts(doc);
                
                // Update browser history
                history.pushState({ page: pageName }, '', pageFile);
                
            }, 200);
        }
        
    } catch (error) {
        console.error('Navigation error:', error);
        showToast('Failed to load page', 'error');
    }
}

function executePageScripts(doc) {
    // Extract and execute inline scripts from the loaded page
    const scripts = doc.querySelectorAll('script');
    scripts.forEach(script => {
        if (script.textContent && !script.src) {
            try {
                // Wrap script execution in a function to handle DOM timing issues
                // Use setTimeout to ensure DOM is fully rendered before script runs
                setTimeout(() => {
                    try {
                        eval(script.textContent);
                    } catch (error) {
                        console.error('Error executing page script:', error);
                    }
                }, 50);
            } catch (error) {
                console.error('Error preparing page script:', error);
            }
        }
    });
}

function initializeSPANavigation() {
    // Prevent multiple initializations
    if (window.spaNavigationInitialized) {
        return;
    }
    window.spaNavigationInitialized = true;
    
    console.log('🔄 Initializing simplified navigation...');
    
    // Handle navigation clicks with debouncing to prevent double navigation
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
                    console.log('🔄 Navigating to:', pageName, pageFile);
                    
                    // Use simple redirect instead of complex SPA to avoid conflicts
                    if (window.location.pathname !== pageFile) {
                        window.location.href = pageFile;
                    }
                }, 150);
            }
        }
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.page) {
            const navItem = document.querySelector(`.nav-item[data-page="${e.state.page}"]`);
            if (navItem) {
                const pageFile = navItem.getAttribute('data-href');
                if (pageFile && window.location.pathname !== pageFile) {
                    window.location.href = pageFile;
                }
            }
        }
    });
    
    // Set initial state
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    history.replaceState({ page: currentPage }, '', window.location.pathname);
    
    console.log('✅ Navigation system initialized');
}

// ==================== ADDITIONAL HELPER FUNCTIONS ====================
// These are placeholder functions to prevent console errors when called from wrong context
// The actual implementations exist in their respective pages

// ==================== CENTRALIZED FUNCTIONS - ALL PAGES USE MAIN.JS ONLY ====================
// NO MORE STANDALONE FUNCTIONS IN INDIVIDUAL PAGES - EVERYTHING IS HERE

// ==================== SALES PAGE FUNCTIONS ====================
let cart = [];

function loadSalesData() {
    const stats = getDashboardStats();
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    updateElement('todaySales', formatCurrency(stats.dailySales.total));
    updateElement('todayTransactions', stats.dailySales.count);
    updateElement('todayProfit', formatCurrency(stats.dailySales.profit));
    updateElement('itemsSold', calculateItemsSold());
    updateElement('todayDate', new Date().toLocaleDateString());
}

function calculateItemsSold() {
    return AppData.sales
        .filter(sale => new Date(sale.date).toDateString() === new Date().toDateString())
        .reduce((sum, sale) => sum + sale.items.reduce((s, item) => s + item.quantity, 0), 0);
}

function closeProductModal() {
    console.log('🛒 Closing product modal...');
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.remove('active');
        console.log('✅ Product modal closed');
    }
}

function loadProductList() {
    const searchTerm = document.getElementById('searchProduct')?.value.toLowerCase() || '';
    const products = AppData.inventory.filter(item => 
        item.quantity > 0 && item.name.toLowerCase().includes(searchTerm)
    );
    
    const productList = document.getElementById('productList');
    const emptyProducts = document.getElementById('emptyProducts');
    
    if (!productList) return;
    
    if (products.length === 0) {
        productList.innerHTML = '';
        if (emptyProducts) emptyProducts.style.display = 'flex';
    } else {
        if (emptyProducts) emptyProducts.style.display = 'none';
        productList.innerHTML = products.map(product => `
            <div class="product-item" onclick="addToCart('${product.id}')">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-stock">Stock: ${product.quantity}</div>
                </div>
                <div class="product-price">${formatCurrency(product.sellingPrice)}</div>
            </div>
        `).join('');
    }
    refreshIcons();
}

function addToCart(productId) {
    console.log('🛒 Adding product to cart:', productId);
    const product = AppData.inventory.find(p => p.id === productId);
    if (!product || product.quantity === 0) {
        console.error('❌ Product not available:', productId);
        showToast('Product not available', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        if (existingItem.quantity >= product.quantity) {
            console.warn('⚠️ Cannot add more than available stock');
            showToast('Cannot add more than available stock', 'warning');
            return;
        }
        existingItem.quantity++;
        console.log('✅ Increased quantity for existing item');
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.sellingPrice,
            buyingPrice: product.buyingPrice,
            quantity: 1,
            maxQuantity: product.quantity
        });
        console.log('✅ Added new item to cart');
    }
    
    updateCart();
    closeProductModal();
    showToast('Product added to cart', 'success');
}

function updateCart() {
    const cartItems = document.getElementById('cartItems');
    const emptyCart = document.getElementById('emptyCart');
    const cartSummary = document.getElementById('cartSummary');
    const clearCartBtn = document.getElementById('clearCartBtn');
    
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '';
        if (emptyCart) emptyCart.style.display = 'flex';
        if (cartSummary) cartSummary.style.display = 'none';
        if (clearCartBtn) clearCartBtn.style.display = 'none';
    } else {
        if (emptyCart) emptyCart.style.display = 'none';
        if (cartSummary) cartSummary.style.display = 'block';
        if (clearCartBtn) clearCartBtn.style.display = 'flex';
        
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${formatCurrency(item.price)} each</div>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-controls">
                        <button onclick="decreaseQuantity('${item.id}')" class="qty-btn">
                            <i data-lucide="minus"></i>
                        </button>
                        <input type="number" value="${item.quantity}" 
                            onchange="updateQuantity('${item.id}', this.value)"
                            min="1" max="${item.maxQuantity}" class="qty-input">
                        <button onclick="increaseQuantity('${item.id}')" class="qty-btn">
                            <i data-lucide="plus"></i>
                        </button>
                    </div>
                    <input type="number" value="${item.price}" step="0.01" 
                        onchange="updatePrice('${item.id}', this.value)"
                        class="price-input" placeholder="Price">
                    <div class="cart-item-total">${formatCurrency(item.price * item.quantity)}</div>
                    <button onclick="removeFromCart('${item.id}')" class="table-btn delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const netProfit = cart.reduce((sum, item) => sum + ((item.price - item.buyingPrice) * item.quantity), 0);
        
        const profitColor = netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
        
        const updateElement = (id, value, color = null) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                if (color) element.style.color = color;
            }
        };
        
        updateElement('cartSubtotal', formatCurrency(total));
        updateElement('cartTotal', formatCurrency(total));
        updateElement('cartNetProfit', formatCurrency(netProfit), profitColor);
    }
    refreshIcons();
}

function increaseQuantity(id) {
    const item = cart.find(i => i.id === id);
    if (item && item.quantity < item.maxQuantity) {
        item.quantity++;
        updateCart();
    } else {
        showToast('Maximum quantity reached', 'warning');
    }
}

function decreaseQuantity(id) {
    const item = cart.find(i => i.id === id);
    if (item && item.quantity > 1) {
        item.quantity--;
        updateCart();
    }
}

function updateQuantity(id, value) {
    const item = cart.find(i => i.id === id);
    const qty = parseInt(value);
    if (item && qty > 0 && qty <= item.maxQuantity) {
        item.quantity = qty;
        updateCart();
    } else {
        showToast('Invalid quantity', 'error');
        updateCart();
    }
}

function updatePrice(id, value) {
    const item = cart.find(i => i.id === id);
    const price = parseFloat(value);
    if (item && price > 0) {
        item.price = price;
        updateCart();
    } else {
        showToast('Invalid price', 'error');
        updateCart();
    }
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCart();
    showToast('Item removed from cart', 'info');
}

function clearCart() {
    if (confirm('Clear all items from cart?')) {
        cart = [];
        updateCart();
        showToast('Cart cleared', 'info');
    }
}

function completeSale() {
    if (cart.length === 0) {
        showToast('Cart is empty', 'error');
        return;
    }
    
    const paymentMethod = document.getElementById('paymentMethod')?.value || 'Cash';
    
    const result = recordSale(cart, paymentMethod);
    if (result.success) {
        showToast('Sale completed successfully!', 'success');
        cart = [];
        updateCart();
        loadSalesData();
    } else {
        showToast(result.message, 'error');
    }
}

// ==================== INVENTORY PAGE FUNCTIONS ====================
let editingItemId = null;

function loadInventoryData() {
    const stats = getDashboardStats();
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    updateElement('totalItems', AppData.inventory.length);
    updateElement('totalValue', formatCurrency(stats.totalInventoryValue));
    updateElement('lowStockItems', stats.lowStockCount);
    updateElement('potentialProfit', formatCurrency(
        AppData.inventory.reduce((sum, item) => sum + item.netProfit, 0)
    ));
    
    loadInventoryTable();
}

let inventoryCurrentPage = 1;
let inventoryPageSize = 25;
let inventoryFilteredItems = [];

function loadInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    const emptyState = document.getElementById('emptyInventory');
    const paginationContainer = document.getElementById('inventoryPagination');
    
    if (!tbody) return;
    
    const searchTerm = document.getElementById('searchInventory')?.value.toLowerCase() || '';
    const filterValue = document.getElementById('filterStock')?.value || 'all';
    
    inventoryFilteredItems = AppData.inventory.filter(item => {
        const threshold = item.lowStockThreshold || AppData.settings.lowStockThreshold;
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        const matchesFilter = filterValue === 'all' || 
            (filterValue === 'low' && item.quantity <= threshold) ||
            (filterValue === 'instock' && item.quantity > threshold);
        return matchesSearch && matchesFilter;
    });
    
    if (inventoryFilteredItems.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        if (paginationContainer) paginationContainer.style.display = 'none';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        
        const totalPages = Math.ceil(inventoryFilteredItems.length / inventoryPageSize);
        if (inventoryCurrentPage > totalPages) inventoryCurrentPage = totalPages;
        if (inventoryCurrentPage < 1) inventoryCurrentPage = 1;
        
        const startIndex = (inventoryCurrentPage - 1) * inventoryPageSize;
        const endIndex = Math.min(startIndex + inventoryPageSize, inventoryFilteredItems.length);
        const pageItems = inventoryFilteredItems.slice(startIndex, endIndex);
        
        const isWorker = AppData.user && AppData.user.role === 'worker';
        
        tbody.innerHTML = pageItems.map(item => {
            const salesAmount = item.sellingPrice * item.quantity;
            const threshold = item.lowStockThreshold || AppData.settings.lowStockThreshold;
            const isLowStock = item.quantity <= threshold;
            
            const actionButtons = isWorker ? '' : `
                <div class="table-actions">
                    <button class="table-btn edit" onclick="editItem('${item.id}')" title="Edit">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="table-btn delete" onclick="deleteItem('${item.id}')" title="Delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `;
            
            return `
            <tr>
                <td style="font-weight: 600;">${item.name}</td>
                <td>
                    ${isLowStock ? 
                        `<span class="badge warning">${item.quantity}</span>` : 
                        `<span class="badge success">${item.quantity}</span>`
                    }
                </td>
                <td>${formatCurrency(item.buyingPrice)}</td>
                <td>${formatCurrency(item.sellingPrice)}</td>
                <td style="color: var(--color-info); font-weight: 600;">${formatCurrency(salesAmount)}</td>
                <td style="color: var(--color-success); font-weight: 600;">${formatCurrency(item.netProfit)}</td>
                <td>${actionButtons}</td>
            </tr>
        `;
        }).join('');
        
        if (inventoryFilteredItems.length > inventoryPageSize && paginationContainer) {
            paginationContainer.style.display = 'flex';
            const updateElement = (id, value) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            };
            
            updateElement('inventoryShowingStart', startIndex + 1);
            updateElement('inventoryShowingEnd', endIndex);
            updateElement('inventoryTotal', inventoryFilteredItems.length);
            updateElement('inventoryCurrentPage', inventoryCurrentPage);
            updateElement('inventoryTotalPages', totalPages);
            
            const updateButton = (id, disabled) => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = disabled;
            };
            
            updateButton('inventoryFirstBtn', inventoryCurrentPage === 1);
            updateButton('inventoryPrevBtn', inventoryCurrentPage === 1);
            updateButton('inventoryNextBtn', inventoryCurrentPage === totalPages);
            updateButton('inventoryLastBtn', inventoryCurrentPage === totalPages);
        } else if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
    }
    refreshIcons();
}

function changeInventoryPage(action) {
    const totalPages = Math.ceil(inventoryFilteredItems.length / inventoryPageSize);
    
    switch(action) {
        case 'first':
            inventoryCurrentPage = 1;
            break;
        case 'prev':
            if (inventoryCurrentPage > 1) inventoryCurrentPage--;
            break;
        case 'next':
            if (inventoryCurrentPage < totalPages) inventoryCurrentPage++;
            break;
        case 'last':
            inventoryCurrentPage = totalPages;
            break;
    }
    
    loadInventoryTable();
}

function changeInventoryPageSize() {
    const pageSizeElement = document.getElementById('inventoryPageSize');
    if (pageSizeElement) {
        inventoryPageSize = parseInt(pageSizeElement.value);
        inventoryCurrentPage = 1;
        loadInventoryTable();
    }
}

function closeItemModal() {
    const modal = document.getElementById('itemModal');
    if (modal) {
        modal.classList.remove('active');
        const form = document.getElementById('itemForm');
        if (form) form.reset();
        editingItemId = null;
    }
}

function editItem(id) {
    const isWorker = AppData.user && AppData.user.role === 'worker';
    if (isWorker) {
        showToast('You do not have permission to edit items', 'error');
        return;
    }
    
    const item = AppData.inventory.find(i => i.id === id);
    if (!item) return;
    
    editingItemId = id;
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
    };
    
    updateElement('modalTitle', 'Edit Item');
    updateElement('submitBtnText', 'Update Item');
    updateElement('itemId', id);
    updateElement('itemName', item.name);
    updateElement('itemQuantity', item.quantity);
    updateElement('itemBuyingPrice', item.buyingPrice);
    updateElement('itemSellingPrice', item.sellingPrice);
    updateElement('lowStockThreshold', item.lowStockThreshold || 10);
    
    const modalTitle = document.getElementById('modalTitle');
    const submitBtnText = document.getElementById('submitBtnText');
    if (modalTitle) modalTitle.textContent = 'Edit Item';
    if (submitBtnText) submitBtnText.textContent = 'Update Item';
    
    calculateProfits();
    
    const modal = document.getElementById('itemModal');
    if (modal) modal.classList.add('active');
}

function deleteItem(id) {
    const isWorker = AppData.user && AppData.user.role === 'worker';
    if (isWorker) {
        showToast('You do not have permission to delete items', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    const result = deleteInventoryItem(id);
    if (result.success) {
        showToast(result.message, 'success');
        loadInventoryData();
    } else {
        showToast(result.message, 'error');
    }
}

function calculateProfits() {
    const quantity = parseFloat(document.getElementById('itemQuantity')?.value) || 0;
    const buyingPrice = parseFloat(document.getElementById('itemBuyingPrice')?.value) || 0;
    const sellingPrice = parseFloat(document.getElementById('itemSellingPrice')?.value) || 0;
    
    const profitPerItem = sellingPrice - buyingPrice;
    const netProfit = profitPerItem * quantity;
    
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.value = formatCurrency(value);
    };
    
    updateElement('profitPerItem', profitPerItem);
    updateElement('netProfit', netProfit);
}

// ==================== EXPENSES PAGE FUNCTIONS ====================
let expensesCurrentPage = 1;
const expensesItemsPerPage = 10;
let allExpenses = [];

function loadExpensesData() {
    const total = AppData.expenses.reduce((sum, e) => sum + e.amount, 0);
    const today = new Date().toDateString();
    const todayTotal = AppData.expenses.filter(e => new Date(e.date).toDateString() === today).reduce((sum, e) => sum + e.amount, 0);
    const month = new Date().getMonth();
    const monthTotal = AppData.expenses.filter(e => new Date(e.date).getMonth() === month).reduce((sum, e) => sum + e.amount, 0);
    
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    updateElement('totalExpenses', formatCurrency(total));
    updateElement('monthExpenses', formatCurrency(monthTotal));
    updateElement('todayExpenses', formatCurrency(todayTotal));
    updateElement('expenseCount', AppData.expenses.length);
    updateElement('monthName', new Date().toLocaleDateString('en-US', { month: 'long' }));
    
    loadExpenseList();
}

function loadExpenseList() {
    const searchTerm = document.getElementById('searchExpense')?.value.toLowerCase() || '';
    
    allExpenses = AppData.expenses
        .filter(e => e.item.toLowerCase().includes(searchTerm))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    expensesCurrentPage = 1;
    displayExpenses();
}

function displayExpenses() {
    const list = document.getElementById('expenseList');
    const empty = document.getElementById('emptyExpenses');
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (!list) return;
    
    if (allExpenses.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'flex';
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
    }
    
    if (empty) empty.style.display = 'none';
    
    const totalPages = Math.ceil(allExpenses.length / expensesItemsPerPage);
    const startIndex = (expensesCurrentPage - 1) * expensesItemsPerPage;
    const endIndex = Math.min(startIndex + expensesItemsPerPage, allExpenses.length);
    const paginatedExpenses = allExpenses.slice(startIndex, endIndex);
    
    list.innerHTML = paginatedExpenses.map(e => `
        <div class="expense-item">
            <div class="expense-info">
                <div class="expense-name">${e.item}</div>
                <div class="expense-date">${new Date(e.date).toLocaleString()}</div>
            </div>
            <div class="expense-amount">-${formatCurrency(e.amount)}</div>
            <button class="table-btn delete" onclick="deleteExpenseItem('${e.id}')" title="Delete">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
    `).join('');
    
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    updateElement('showingStart', startIndex + 1);
    updateElement('showingEnd', endIndex);
    updateElement('totalItems', allExpenses.length);
    
    if (allExpenses.length > expensesItemsPerPage && paginationContainer) {
        paginationContainer.style.display = 'flex';
        updateExpensesPaginationButtons(totalPages);
    } else if (paginationContainer) {
        paginationContainer.style.display = 'none';
    }
    
    refreshIcons();
}

function updateExpensesPaginationButtons(totalPages) {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageNumbers = document.getElementById('pageNumbers');
    
    if (prevBtn) {
        prevBtn.disabled = expensesCurrentPage === 1;
        prevBtn.style.opacity = expensesCurrentPage === 1 ? '0.5' : '1';
        prevBtn.style.cursor = expensesCurrentPage === 1 ? 'not-allowed' : 'pointer';
    }
    
    if (nextBtn) {
        nextBtn.disabled = expensesCurrentPage === totalPages;
        nextBtn.style.opacity = expensesCurrentPage === totalPages ? '0.5' : '1';
        nextBtn.style.cursor = expensesCurrentPage === totalPages ? 'not-allowed' : 'pointer';
    }
    
    if (pageNumbers) {
        pageNumbers.innerHTML = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, expensesCurrentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'action-btn secondary';
            pageBtn.style.padding = '0.5rem 1rem';
            pageBtn.style.minWidth = '40px';
            pageBtn.textContent = i;
            
            if (i === expensesCurrentPage) {
                pageBtn.style.background = 'var(--color-primary)';
                pageBtn.style.color = '#0a0e1a';
                pageBtn.style.fontWeight = '700';
            }
            
            pageBtn.onclick = () => goToExpensePage(i);
            pageNumbers.appendChild(pageBtn);
        }
    }
}

function changeExpensePage(direction) {
    const totalPages = Math.ceil(allExpenses.length / expensesItemsPerPage);
    const newPage = expensesCurrentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        expensesCurrentPage = newPage;
        displayExpenses();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function goToExpensePage(page) {
    expensesCurrentPage = page;
    displayExpenses();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeExpenseModal() {
    const modal = document.getElementById('expenseModal');
    if (modal) {
        modal.classList.remove('active');
        const form = document.getElementById('expenseForm');
        if (form) form.reset();
    }
}

function deleteExpenseItem(id) {
    if (!confirm('Delete this expense? Amount will be refunded to wallet.')) return;
    const result = deleteExpense(id);
    if (result.success) {
        showToast(result.message, 'success');
        loadExpensesData();
    } else {
        showToast(result.message, 'error');
    }
}

// ==================== WALLET PAGE FUNCTIONS ====================
function loadWalletData() {
    const balanceElement = document.getElementById('walletBalance');
    if (balanceElement) {
        balanceElement.textContent = formatCurrency(AppData.wallet.balance);
    }
    loadTransactions();
}

function loadTransactions() {
    const list = document.getElementById('transactionList');
    const empty = document.getElementById('emptyTransactions');
    
    if (!list) return;
    
    const transactions = AppData.wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (transactions.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'flex';
    } else {
        if (empty) empty.style.display = 'none';
        list.innerHTML = transactions.map(t => {
            const isIncome = t.amount > 0;
            const icon = isIncome ? 'arrow-down-circle' : 'arrow-up-circle';
            return `
                <div class="transaction-item">
                    <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
                        <i data-lucide="${icon}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-type">${t.description}</div>
                        <div class="transaction-date">${new Date(t.date).toLocaleString()}</div>
                    </div>
                    <div class="transaction-amount ${isIncome ? 'positive' : 'negative'}">
                        ${isIncome ? '+' : ''}${formatCurrency(Math.abs(t.amount))}
                    </div>
                </div>
            `;
        }).join('');
    }
    refreshIcons();
}

function closeTopUpModal() {
    const modal = document.getElementById('topUpModal');
    if (modal) {
        modal.classList.remove('active');
        const form = document.getElementById('topUpForm');
        if (form) form.reset();
    }
}

function closeWithdrawModal() {
    const modal = document.getElementById('withdrawModal');
    if (modal) {
        modal.classList.remove('active');
        const form = document.getElementById('withdrawForm');
        if (form) form.reset();
    }
}

// ==================== REPORTS PAGE FUNCTIONS ====================
let currentReportType = null;
let currentReportData = null;

function initializeDates() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDateElement = document.getElementById('startDate');
    const endDateElement = document.getElementById('endDate');
    
    if (startDateElement) startDateElement.valueAsDate = firstDayOfMonth;
    if (endDateElement) endDateElement.valueAsDate = today;
}

function getDateRange() {
    const start = document.getElementById('startDate')?.value;
    const end = document.getElementById('endDate')?.value;
    return { 
        start: start ? new Date(start) : null, 
        end: end ? new Date(end + 'T23:59:59') : null 
    };
}

function filterByDateRange(items, dateField = 'date') {
    const { start, end } = getDateRange();
    if (!start && !end) return items;
    
    return items.filter(item => {
        const itemDate = new Date(item[dateField]);
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        return true;
    });
}

function showPreview(title, content) {
    const previewTitle = document.getElementById('previewTitle');
    const previewContent = document.getElementById('reportPreviewContent');
    const previewSection = document.getElementById('reportPreviewSection');
    
    if (previewTitle) previewTitle.textContent = title;
    if (previewContent) previewContent.innerHTML = content;
    if (previewSection) {
        previewSection.style.display = 'block';
        previewSection.scrollIntoView({ behavior: 'smooth' });
    }
    refreshIcons();
}

let cachedLogo = null;

function downloadCurrentReport() {
    if (!currentReportType) {
        showToast('No report to download', 'error');
        return;
    }
    
    showToast('Generating PDF...', 'info');
    
    setTimeout(() => {
        try {
            // Check if jsPDF is available
            if (typeof window.jspdf === 'undefined') {
                console.error('jsPDF library not loaded');
                showToast('PDF library not available. Please check your internet connection.', 'error');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                compress: true
            });
            
            const { start, end } = getDateRange();
            const periodText = start && end ? 
                `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` : 
                'All Time';
            
            if (cachedLogo) {
                addLogoAndGenerate(doc, periodText, cachedLogo);
                return;
            }
            
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                
                ctx.drawImage(img, 0, 0);
                
                cachedLogo = canvas.toDataURL('image/png');
                
                addLogoAndGenerate(doc, periodText, cachedLogo);
            };
            
            img.onerror = function() {
                console.warn('Logo failed to load, generating without logo');
                addLogoAndGenerate(doc, periodText, null);
            };
            
            // Fix logo path for different page locations
            const currentPath = window.location.pathname;
            const logoPath = currentPath.includes('/pages/') 
                ? '../IDZ-logo.png' 
                : './IDZ-logo.png';
            
            img.crossOrigin = 'anonymous';
            img.src = logoPath;
            
        } catch (error) {
            console.error('PDF generation error:', error);
            showToast('Failed to generate PDF: ' + error.message, 'error');
        }
    }, 100);
}

function addLogoAndGenerate(doc, periodText, logo) {
    if (logo) {
        const logoWidth = 20;
        const logoHeight = 20;
        const logoX = (210 - logoWidth) / 2;
        const logoY = 10;
        
        try {
            doc.addImage(logo, 'PNG', logoX, logoY, logoWidth, logoHeight);
        } catch (e) {
            console.warn('Failed to add logo:', e);
        }
        
        doc.setFontSize(18);
        doc.setTextColor(124, 58, 237);
        doc.setFont(undefined, 'bold');
        doc.text(AppData.settings.businessName, 105, logoY + logoHeight + 8, { align: 'center' });
    } else {
        doc.setFontSize(18);
        doc.setTextColor(124, 58, 237);
        doc.setFont(undefined, 'bold');
        doc.text(AppData.settings.businessName, 105, 20, { align: 'center' });
    }
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    
    generateReportContent(doc, periodText);
}

function generateReportContent(doc, periodText) {
    if (currentReportType === 'sales') {
        doc.text('SALES REPORT', 105, 50, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Period: ${periodText}`, 105, 57, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 62, { align: 'center' });
        
        const totalSales = currentReportData.reduce((sum, s) => sum + s.total, 0);
        const totalProfit = currentReportData.reduce((sum, s) => sum + s.profit, 0);
        const totalItems = currentReportData.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0);
        
        // Enhanced summary box with better styling
        doc.setFillColor(124, 58, 237); // Primary color background
        doc.rect(14, 68, 182, 28, 'F');
        
        // White text on colored background
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        
        // Column 1
        doc.text('Total Sales', 25, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(totalSales), 25, 82, { align: 'left' });
        
        // Column 2
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Total Profit', 70, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(totalProfit), 70, 82, { align: 'left' });
        
        // Column 3
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Transactions', 120, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(currentReportData.length.toString(), 120, 82, { align: 'left' });
        
        // Column 4
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Items Sold', 165, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(totalItems.toString(), 165, 82, { align: 'left' });
        
        // Reset text color for table
        doc.setTextColor(0, 0, 0);
        
        const MAX_ROWS = 1000;
        const allSalesItems = currentReportData.flatMap(sale => 
            sale.items.map((item, idx) => {
                const itemProfit = (item.price - item.buyingPrice) * item.quantity;
                
                return [
                    new Date(sale.date).toLocaleString(),
                    item.name,
                    item.quantity.toString(),
                    idx === 0 ? (sale.soldBy || 'Unknown') : '',
                    idx === 0 ? (sale.paymentMethod || 'Cash') : '',
                    formatCurrency(item.price * item.quantity),
                    formatCurrency(itemProfit)
                ];
            })
        );
        
        const salesData = allSalesItems.slice(0, MAX_ROWS);
        
        if (allSalesItems.length > MAX_ROWS) {
            showToast(`Report limited to ${MAX_ROWS} rows (${allSalesItems.length} total). Use date filters for complete reports.`, 'warning');
        }
        
        doc.autoTable({
            startY: 102,
            head: [['Date', 'Product', 'Qty', 'Sold By', 'Payment', 'Total', 'Profit']],
            body: salesData,
            theme: 'striped',
            headStyles: { 
                fillColor: [124, 58, 237], 
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7
            },
            styles: { 
                fontSize: 6,
                cellPadding: 1.5,
                lineWidth: 0.1,
                overflow: 'linebreak',
                cellWidth: 'wrap'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 'auto' },
                4: { cellWidth: 'auto' },
                5: { cellWidth: 'auto' },
                6: { cellWidth: 'auto' }
            },
            margin: { left: 14, right: 14, top: 20, bottom: 20 },
            tableWidth: 'auto',
            showHead: 'everyPage',
            didParseCell: function(data) {
                if (data.column.index === 6 && data.section === 'body') {
                    const value = data.cell.raw;
                    if (value && value.includes('-')) {
                        data.cell.styles.textColor = [220, 38, 38];
                    }
                }
            }
        });
        
        const pageCount = doc.internal.getNumberOfPages();
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('Page ' + i + ' of ' + pageCount, 14, pageHeight - 10);
        }
        
        doc.setPage(pageCount);
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setDrawColor(124, 58, 237);
        doc.setLineWidth(0.5);
        doc.line(14, finalY, 196, finalY);
        
        doc.setFontSize(10);
        doc.setTextColor(124, 58, 237);
        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL SALES: ${formatCurrency(totalSales)}`, 14, finalY + 8);
        doc.text(`TOTAL PROFIT: ${formatCurrency(totalProfit)}`, 120, finalY + 8);
        
        doc.save(`Sales_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('Report downloaded successfully!', 'success');
        
    } else if (currentReportType === 'expense') {
        doc.text('EXPENSE REPORT', 105, 50, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Period: ${periodText}`, 105, 57, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 62, { align: 'center' });
        
        const totalExpenses = currentReportData.reduce((sum, e) => sum + e.amount, 0);
        const avgExpense = currentReportData.length > 0 ? totalExpenses / currentReportData.length : 0;
        
        // Enhanced summary box with better styling
        doc.setFillColor(124, 58, 237);
        doc.rect(14, 68, 182, 28, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        
        doc.text('Total Expenses', 40, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(totalExpenses), 40, 82, { align: 'left' });
        
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Expense Count', 105, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(currentReportData.length.toString(), 105, 82, { align: 'left' });
        
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Average', 155, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(avgExpense), 155, 82, { align: 'left' });
        
        doc.setTextColor(0, 0, 0);
        
        const MAX_ROWS = 1000;
        const expenseData = currentReportData.slice(0, MAX_ROWS).map(expense => [
            new Date(expense.date).toLocaleString(),
            expense.item,
            formatCurrency(expense.amount)
        ]);
        
        if (currentReportData.length > MAX_ROWS) {
            showToast(`Report limited to ${MAX_ROWS} rows (${currentReportData.length} total). Use date filters for complete reports.`, 'warning');
        }
        
        doc.autoTable({
            startY: 102,
            head: [['Date', 'Item', 'Amount']],
            body: expenseData,
            theme: 'striped',
            headStyles: { 
                fillColor: [124, 58, 237], 
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9
            },
            styles: { 
                fontSize: 8,
                cellPadding: 2,
                lineWidth: 0.1,
                overflow: 'linebreak',
                cellWidth: 'wrap'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { left: 14, right: 14, top: 20, bottom: 20 },
            tableWidth: 'auto',
            showHead: 'everyPage'
        });
        
        const pageCountExp = doc.internal.getNumberOfPages();
        const pageSizeExp = doc.internal.pageSize;
        const pageHeightExp = pageSizeExp.height ? pageSizeExp.height : pageSizeExp.getHeight();
        for (let i = 1; i <= pageCountExp; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('Page ' + i + ' of ' + pageCountExp, 14, pageHeightExp - 10);
        }
        
        doc.setPage(pageCountExp);
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setDrawColor(124, 58, 237);
        doc.setLineWidth(0.5);
        doc.line(14, finalY, 196, finalY);
        
        doc.setFontSize(10);
        doc.setTextColor(124, 58, 237);
        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL EXPENSES: ${formatCurrency(totalExpenses)}`, 14, finalY + 8);
        
        doc.save(`Expense_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        
    } else if (currentReportType === 'inventory') {
        doc.text('INVENTORY REPORT', 105, 50, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 57, { align: 'center' });
        
        const totalValue = currentReportData.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
        const totalCost = currentReportData.reduce((sum, item) => sum + (item.buyingPrice * item.quantity), 0);
        const potentialProfit = currentReportData.reduce((sum, item) => sum + item.netProfit, 0);
        const totalItems = currentReportData.reduce((sum, item) => sum + item.quantity, 0);
        
        // Enhanced summary box with better styling
        doc.setFillColor(124, 58, 237); // Primary color background
        doc.rect(14, 68, 182, 28, 'F');
        
        // White text on colored background
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        
        // Column 1
        doc.text('Total Value', 30, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(totalValue), 30, 82, { align: 'left' });
        
        // Column 2
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Total Cost', 75, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(totalCost), 75, 82, { align: 'left' });
        
        // Column 3
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Potential Profit', 120, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(potentialProfit), 120, 82, { align: 'left' });
        
        // Column 4
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Total Items', 165, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(totalItems.toString(), 165, 82, { align: 'left' });
        
        // Reset text color for table
        doc.setTextColor(0, 0, 0);
        
        const MAX_ROWS = 1000;
        const inventoryData = currentReportData.slice(0, MAX_ROWS).map(item => {
            const salesAmount = item.sellingPrice * item.quantity;
            return [
                item.name,
                item.quantity.toString(),
                formatCurrency(item.buyingPrice),
                formatCurrency(item.sellingPrice),
                formatCurrency(salesAmount),
                formatCurrency(item.netProfit)
            ];
        });
        
        if (currentReportData.length > MAX_ROWS) {
            showToast(`Report limited to ${MAX_ROWS} rows (${currentReportData.length} total).`, 'warning');
        }
        
        doc.autoTable({
            startY: 102,
            head: [['Product', 'Qty', 'Buy Price', 'Sell Price', 'Sales Amount', 'Net Profit']],
            body: inventoryData,
            theme: 'striped',
            headStyles: { 
                fillColor: [124, 58, 237], 
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8
            },
            styles: { 
                fontSize: 7,
                cellPadding: 1.5,
                lineWidth: 0.1,
                overflow: 'linebreak',
                cellWidth: 'wrap'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { left: 14, right: 14, top: 20, bottom: 20 },
            tableWidth: 'auto',
            showHead: 'everyPage'
        });
        
        const pageCountInv = doc.internal.getNumberOfPages();
        const pageSizeInv = doc.internal.pageSize;
        const pageHeightInv = pageSizeInv.height ? pageSizeInv.height : pageSizeInv.getHeight();
        for (let i = 1; i <= pageCountInv; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('Page ' + i + ' of ' + pageCountInv, 14, pageHeightInv - 10);
        }
        
        doc.setPage(pageCountInv);
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setDrawColor(124, 58, 237);
        doc.setLineWidth(0.5);
        doc.line(14, finalY, 196, finalY);
        
        doc.setFontSize(10);
        doc.setTextColor(124, 58, 237);
        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL VALUE: ${formatCurrency(totalValue)}`, 14, finalY + 8);
        doc.text(`POTENTIAL PROFIT: ${formatCurrency(potentialProfit)}`, 120, finalY + 8);
        
        doc.save(`Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    }
    
    showToast('Report downloaded successfully', 'success');
}

// ==================== ADDITIONAL GLOBAL FUNCTIONS ====================
// These functions are called from various pages and need to be globally available

function previewExpenseReport() {
    console.log('📊 Generating expense report preview...');
    
    if (!AppData.expenses || AppData.expenses.length === 0) {
        showToast('No expense data available for report', 'warning');
        return;
    }
    
    currentReportType = 'expense';
    const expenses = filterByDateRange ? filterByDateRange(AppData.expenses) : AppData.expenses;
    currentReportData = expenses;
    
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const start = startDate ? startDate.value : null;
    const end = endDate ? endDate.value : null;
    
    const periodText = start && end ? 
        `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}` : 
        'All Time';
    
    const preview = `
        <div class="report-header">
            <div style="text-align: center; margin-bottom: 15px;">
                <img src="../IDZ-logo.png" alt="Logo" style="width: 80px; height: 80px; object-fit: contain;">
            </div>
            <h1>${AppData.settings.businessName}</h1>
            <h2>Expense Report</h2>
            <div class="report-meta">
                <div>Period: ${periodText}</div>
                <div>Generated: ${new Date().toLocaleString()}</div>
            </div>
        </div>
        
        <div class="report-summary">
            <div class="report-summary-item">
                <div class="report-summary-label">Total Expenses</div>
                <div class="report-summary-value">${formatCurrency(totalExpenses)}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Expense Count</div>
                <div class="report-summary-value">${expenses.length}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Average Expense</div>
                <div class="report-summary-value">${formatCurrency(expenses.length > 0 ? totalExpenses / expenses.length : 0)}</div>
            </div>
        </div>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Item</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenses.map(expense => `
                        <tr>
                            <td>${new Date(expense.date).toLocaleString()}</td>
                            <td>${expense.item}</td>
                            <td style="color: var(--color-danger); font-weight: 600;">${formatCurrency(expense.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    showPreview('Expense Report', preview);
}

function previewInventoryReport() {
    console.log('📊 Generating inventory report preview...');
    
    if (!AppData.inventory || AppData.inventory.length === 0) {
        showToast('No inventory data available for report', 'warning');
        return;
    }
    
    currentReportType = 'inventory';
    currentReportData = AppData.inventory;
    
    const totalValue = AppData.inventory.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    const totalCost = AppData.inventory.reduce((sum, item) => sum + (item.buyingPrice * item.quantity), 0);
    const potentialProfit = AppData.inventory.reduce((sum, item) => sum + item.netProfit, 0);
    const totalItems = AppData.inventory.reduce((sum, item) => sum + item.quantity, 0);
    
    const preview = `
        <div class="report-header">
            <div style="text-align: center; margin-bottom: 15px;">
                <img src="../IDZ-logo.png" alt="Logo" style="width: 80px; height: 80px; object-fit: contain;">
            </div>
            <h1>${AppData.settings.businessName}</h1>
            <h2>Inventory Report</h2>
            <div class="report-meta">
                <div>Generated: ${new Date().toLocaleString()}</div>
            </div>
        </div>
        
        <div class="report-summary">
            <div class="report-summary-item">
                <div class="report-summary-label">Total Value</div>
                <div class="report-summary-value">${formatCurrency(totalValue)}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Total Cost</div>
                <div class="report-summary-value">${formatCurrency(totalCost)}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Potential Profit</div>
                <div class="report-summary-value">${formatCurrency(potentialProfit)}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Total Items</div>
                <div class="report-summary-value">${totalItems}</div>
            </div>
        </div>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Buying Price</th>
                        <th>Selling Price</th>
                        <th>Sales Amount</th>
                        <th>Net Profit</th>
                    </tr>
                </thead>
                <tbody>
                    ${AppData.inventory.map(item => {
                        const salesAmount = item.sellingPrice * item.quantity;
                        return `
                        <tr>
                            <td style="font-weight: 600;">${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>${formatCurrency(item.buyingPrice)}</td>
                            <td>${formatCurrency(item.sellingPrice)}</td>
                            <td style="color: var(--color-info); font-weight: 600;">${formatCurrency(salesAmount)}</td>
                            <td style="color: var(--color-success); font-weight: 600;">${formatCurrency(item.netProfit)}</td>
                        </tr>
                    `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    showPreview('Inventory Report', preview);
}

// ==================== GLOBAL MODAL FUNCTIONS ====================
// These functions work across all pages by checking context and either
// calling local functions or redirecting to the appropriate page

function showProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.add('active');
        // Load product list if function exists
        if (typeof loadProductList === 'function') {
            loadProductList();
        }
        console.log('✅ Product modal opened successfully');
    } else {
        console.error('❌ Product modal not found - redirecting to sales page');
        window.location.href = 'sales.html';
    }
}

function showAddItemModal() {
    const modal = document.getElementById('itemModal');
    if (modal) {
        // Reset form and show modal
        editingItemId = null;
        const modalTitle = document.getElementById('modalTitle');
        const submitBtnText = document.getElementById('submitBtnText');
        const itemForm = document.getElementById('itemForm');
        
        if (modalTitle) modalTitle.textContent = 'Add Item';
        if (submitBtnText) submitBtnText.textContent = 'Add Item';
        if (itemForm) itemForm.reset();
        
        modal.classList.add('active');
        console.log('✅ Add item modal opened successfully');
    } else {
        console.error('❌ Item modal not found - redirecting to inventory page');
        window.location.href = 'Inventory.html';
    }
}

function previewSalesReport() {
    console.log('📊 Generating sales report preview...');
    
    if (!AppData.sales || AppData.sales.length === 0) {
        showToast('No sales data available for report', 'warning');
        return;
    }
    
    currentReportType = 'sales';
    const sales = filterByDateRange ? filterByDateRange(AppData.sales) : AppData.sales;
    currentReportData = sales;
    
    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
    const totalItems = sales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0);
    
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const start = startDate ? startDate.value : null;
    const end = endDate ? endDate.value : null;
    
    const periodText = start && end ? 
        `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}` : 
        'All Time';
    
    console.log('✅ Sales report preview generated successfully');
    
    const preview = `
        <div class="report-header">
            <div style="text-align: center; margin-bottom: 15px;">
                <img src="../IDZ-logo.png" alt="Logo" style="width: 80px; height: 80px; object-fit: contain;">
            </div>
            <h1>${AppData.settings.businessName}</h1>
            <h2>Sales Report</h2>
            <div class="report-meta">
                <div>Period: ${periodText}</div>
                <div>Generated: ${new Date().toLocaleString()}</div>
            </div>
        </div>
        
        <div class="report-summary">
            <div class="report-summary-item">
                <div class="report-summary-label">Total Sales</div>
                <div class="report-summary-value">${formatCurrency(totalSales)}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Total Profit</div>
                <div class="report-summary-value">${formatCurrency(totalProfit)}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Transactions</div>
                <div class="report-summary-value">${sales.length}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Items Sold</div>
                <div class="report-summary-value">${totalItems}</div>
            </div>
        </div>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Product Name</th>
                        <th>Quantity</th>
                        <th>Sold By</th>
                        <th>Payment</th>
                        <th>Total</th>
                        <th>Profit</th>
                    </tr>
                </thead>
                <tbody>
                    ${sales.flatMap(sale => 
                        sale.items.map((item, idx) => {
                            const itemProfit = (item.price - item.buyingPrice) * item.quantity;
                            const profitColor = itemProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
                            
                            return `
                            <tr>
                                <td>${new Date(sale.date).toLocaleString()}</td>
                                <td style="font-weight: 600;">${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>${idx === 0 ? (sale.soldBy || 'Unknown') : ''}</td>
                                <td>${idx === 0 ? (sale.paymentMethod || 'Cash') : ''}</td>
                                <td style="color: var(--color-success); font-weight: 600;">${formatCurrency(item.price * item.quantity)}</td>
                                <td style="color: ${profitColor}; font-weight: 600;">${formatCurrency(itemProfit)}</td>
                            </tr>
                        `;
                        })
                    ).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    showPreview('Sales Report', preview);
}

function showAddExpenseModal() {
    const modal = document.getElementById('expenseModal');
    if (modal) {
        modal.classList.add('active');
        console.log('✅ Add expense modal opened successfully');
    } else {
        console.error('❌ Expense modal not found - redirecting to expenses page');
        window.location.href = 'expenses.html';
    }
}

function showTopUpModal() {
    const modal = document.getElementById('topUpModal');
    if (modal) {
        modal.classList.add('active');
        console.log('✅ Top up modal opened successfully');
    } else {
        console.error('❌ Top up modal not found - redirecting to wallet page');
        window.location.href = 'wallet.html';
    }
}

function showWithdrawModal() {
    const modal = document.getElementById('withdrawModal');
    if (modal) {
        modal.classList.add('active');
        console.log('✅ Withdraw modal opened successfully');
    } else {
        console.error('❌ Withdraw modal not found - redirecting to wallet page');
        window.location.href = 'wallet.html';
    }
}

function closeTopUpModal() {
    const modal = document.getElementById('topUpModal');
    const form = document.getElementById('topUpForm');
    if (modal) {
        modal.classList.remove('active');
        if (form) form.reset();
        console.log('✅ Top up modal closed successfully');
    }
}

function closeWithdrawModal() {
    const modal = document.getElementById('withdrawModal');
    const form = document.getElementById('withdrawForm');
    if (modal) {
        modal.classList.remove('active');
        if (form) form.reset();
        console.log('✅ Withdraw modal closed successfully');
    }
}

function closeExpenseModal() {
    const modal = document.getElementById('expenseModal');
    const form = document.getElementById('expenseForm');
    if (modal) {
        modal.classList.remove('active');
        if (form) form.reset();
        console.log('✅ Expense modal closed successfully');
    }
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.remove('active');
        console.log('✅ Product modal closed successfully');
    }
}

function closeItemModal() {
    const modal = document.getElementById('itemModal');
    const form = document.getElementById('itemForm');
    if (modal) {
        modal.classList.remove('active');
        if (form) form.reset();
        editingItemId = null;
        console.log('✅ Item modal closed successfully');
    }
}

// ==================== DATA LOADING FUNCTIONS ====================
// These functions load data into page elements and are used across multiple pages

function loadWalletData() {
    // Check if we're on wallet page
    if (window.location.pathname.includes('wallet.html')) {
        const walletBalance = document.getElementById('walletBalance');
        if (walletBalance) {
            walletBalance.textContent = formatCurrency(AppData.wallet.balance);
            loadTransactions();
        }
    }
}

function loadTransactions() {
    // Check if we're on wallet page
    if (window.location.pathname.includes('wallet.html')) {
        const list = document.getElementById('transactionList');
        const empty = document.getElementById('emptyTransactions');
        
        if (list) {
            const transactions = AppData.wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            if (transactions.length === 0) {
                list.innerHTML = '';
                if (empty) empty.style.display = 'flex';
            } else {
                if (empty) empty.style.display = 'none';
                list.innerHTML = transactions.map(t => {
                    const isIncome = t.amount > 0;
                    const icon = isIncome ? 'arrow-down-circle' : 'arrow-up-circle';
                    return `
                        <div class="transaction-item">
                            <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
                                <i data-lucide="${icon}"></i>
                            </div>
                            <div class="transaction-details">
                                <div class="transaction-type">${t.description}</div>
                                <div class="transaction-date">${new Date(t.date).toLocaleString()}</div>
                            </div>
                            <div class="transaction-amount ${isIncome ? 'positive' : 'negative'}">
                                ${isIncome ? '+' : ''}${formatCurrency(Math.abs(t.amount))}
                            </div>
                        </div>
                    `;
                }).join('');
            }
            refreshIcons();
        }
    }
}

function loadExpensesData() {
    // Check if we're on expenses page
    if (window.location.pathname.includes('expenses.html')) {
        const total = AppData.expenses.reduce((sum, e) => sum + e.amount, 0);
        const today = new Date().toDateString();
        const todayTotal = AppData.expenses.filter(e => new Date(e.date).toDateString() === today).reduce((sum, e) => sum + e.amount, 0);
        const month = new Date().getMonth();
        const monthTotal = AppData.expenses.filter(e => new Date(e.date).getMonth() === month).reduce((sum, e) => sum + e.amount, 0);
        
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateElement('totalExpenses', formatCurrency(total));
        updateElement('monthExpenses', formatCurrency(monthTotal));
        updateElement('todayExpenses', formatCurrency(todayTotal));
        updateElement('expenseCount', AppData.expenses.length);
        updateElement('monthName', new Date().toLocaleDateString('en-US', { month: 'long' }));
        
        // Call loadExpenseList if it exists
        if (typeof loadExpenseList === 'function') {
            loadExpenseList();
        }
    }
}

function loadSalesData() {
    // Check if we're on sales page
    if (window.location.pathname.includes('sales.html')) {
        const stats = getDashboardStats();
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateElement('todaySales', formatCurrency(stats.dailySales.total));
        updateElement('todayTransactions', stats.dailySales.count);
        updateElement('todayProfit', formatCurrency(stats.dailySales.profit));
        updateElement('itemsSold', calculateItemsSold());
        updateElement('todayDate', new Date().toLocaleDateString());
    }
}

function loadInventoryData() {
    // Check if we're on inventory page
    if (window.location.pathname.includes('Inventory.html')) {
        const stats = getDashboardStats();
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateElement('totalItems', AppData.inventory.length);
        updateElement('totalValue', formatCurrency(stats.totalInventoryValue));
        updateElement('lowStockItems', stats.lowStockCount);
        updateElement('potentialProfit', formatCurrency(
            AppData.inventory.reduce((sum, item) => sum + item.netProfit, 0)
        ));
        
        // Call loadInventoryTable if it exists
        if (typeof loadInventoryTable === 'function') {
            loadInventoryTable();
        }
    }
}

// ==================== DELETE AND EDIT FUNCTIONS ====================
// These functions handle delete and edit operations across pages

function deleteExpenseItem(id) {
    // Check if we're on expenses page
    if (window.location.pathname.includes('expenses.html')) {
        if (!confirm('Delete this expense? Amount will be refunded to wallet.')) return;
        const result = deleteExpense(id);
        if (result.success) {
            showToast(result.message, 'success');
            loadExpensesData();
        } else {
            showToast(result.message, 'error');
        }
    }
}

function deleteTransaction(id) {
    // Check if we're on transaction history page
    if (window.location.pathname.includes('transaction_history.html')) {
        if (!confirm('Delete this transaction? Stock will be returned.')) return;
        const result = deleteSale(id);
        if (result.success) {
            showToast(result.message, 'success');
            // Call loadTransactions if it exists
            if (typeof loadTransactions === 'function') {
                loadTransactions();
            }
        } else {
            showToast(result.message, 'error');
        }
    }
}

function editItem(id) {
    // Check if we're on inventory page
    if (window.location.pathname.includes('Inventory.html')) {
        const isWorker = AppData.user && AppData.user.role === 'worker';
        if (isWorker) {
            showToast('You do not have permission to edit items', 'error');
            return;
        }
        
        const item = AppData.inventory.find(i => i.id === id);
        if (!item) return;
        
        editingItemId = id;
        
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        };
        
        updateElement('modalTitle', 'Edit Item');
        updateElement('submitBtnText', 'Update Item');
        updateElement('itemId', id);
        updateElement('itemName', item.name);
        updateElement('itemQuantity', item.quantity);
        updateElement('itemBuyingPrice', item.buyingPrice);
        updateElement('itemSellingPrice', item.sellingPrice);
        updateElement('lowStockThreshold', item.lowStockThreshold || 10);
        
        // Call calculateProfits if it exists
        if (typeof calculateProfits === 'function') {
            calculateProfits();
        }
        
        const modal = document.getElementById('itemModal');
        if (modal) {
            modal.classList.add('active');
        }
    }
}

function deleteItem(id) {
    // Check if we're on inventory page
    if (window.location.pathname.includes('Inventory.html')) {
        const isWorker = AppData.user && AppData.user.role === 'worker';
        if (isWorker) {
            showToast('You do not have permission to delete items', 'error');
            return;
        }
        
        if (!confirm('Delete this item? This action cannot be undone.')) return;
        
        const result = deleteInventoryItem(id);
        if (result.success) {
            showToast(result.message, 'success');
            // Call loadInventoryData if it exists
            if (typeof loadInventoryData === 'function') {
                loadInventoryData();
            }
        } else {
            showToast(result.message, 'error');
        }
    }
}

// ==================== SETTINGS PAGE FUNCTIONS ====================
// These functions handle settings page operations

function loadSettings() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        };
        
        updateElement('businessName', AppData.settings.businessName);
        updateElement('themeSelect', AppData.settings.theme);
        
        // Call loadSessions if it exists
        if (typeof loadSessions === 'function') {
            loadSessions();
        }
    }
}

function loadSessions() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const sessionsList = document.getElementById('sessionsList');
        if (!AppData.user.sessions || AppData.user.sessions.length === 0) {
            if (sessionsList) {
                sessionsList.innerHTML = '<p style="color: var(--text-secondary);">No active sessions</p>';
            }
        } else {
            if (sessionsList) {
                sessionsList.innerHTML = AppData.user.sessions.map(session => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-sm); border: 1px solid var(--border-color); border-radius: var(--border-radius); margin-bottom: var(--spacing-sm);">
                        <div>
                            <div style="font-weight: 600; color: var(--text-primary);">${session.location}</div>
                            <div style="font-size: var(--text-sm); color: var(--text-secondary);">Last active: ${new Date(session.lastActivity).toLocaleString()}</div>
                        </div>
                        <button class="action-btn danger" onclick="logoutSession('${session.id}')" style="padding: 0.25rem 0.5rem;">
                            <i data-lucide="log-out"></i>
                        </button>
                    </div>
                `).join('');
            }
        }
        
        refreshIcons();
    }
}

function logoutSession(sessionId) {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        if (AppData.user.sessions) {
            AppData.user.sessions = AppData.user.sessions.filter(s => s.id !== sessionId);
            saveData();
            
            // Call loadSessions if it exists
            if (typeof loadSessions === 'function') {
                loadSessions();
            }
            
            showToast('Session terminated', 'success');
        }
    }
}

function showChangePasswordModal() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const modal = document.getElementById('changePasswordModal');
        if (modal) {
            modal.classList.add('active');
        }
    }
}

function closeChangePasswordModal() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const modal = document.getElementById('changePasswordModal');
        const form = document.getElementById('changePasswordForm');
        if (modal) {
            modal.classList.remove('active');
            if (form) form.reset();
        }
    }
}

function exportData() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        try {
            // Create a backup of all data
            const backup = {
                user: AppData.user,
                users: AppData.users,
                inventory: AppData.inventory,
                sales: AppData.sales,
                expenses: AppData.expenses,
                wallet: AppData.wallet,
                settings: AppData.settings,
                notifications: AppData.notifications,
                exportDate: new Date().toISOString()
            };
            
            const dataStr = JSON.stringify(backup, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pos_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('Data exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showToast('Failed to export data', 'error');
        }
    }
}

function importData(event) {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate imported data
                if (importedData.user) AppData.user = importedData.user;
                if (importedData.users) AppData.users = importedData.users || [];
                if (importedData.inventory) AppData.inventory = importedData.inventory || [];
                if (importedData.sales) AppData.sales = importedData.sales || [];
                if (importedData.expenses) AppData.expenses = importedData.expenses || [];
                if (importedData.wallet) AppData.wallet = importedData.wallet || { balance: 0, transactions: [] };
                if (importedData.settings) AppData.settings = { ...AppData.settings, ...importedData.settings };
                if (importedData.notifications) AppData.notifications = importedData.notifications || [];
                
                saveData();
                showToast('Data imported successfully', 'success');
                
                // Reload page to show updated data
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                console.error('Import error:', error);
                showToast('Failed to import data', 'error');
            }
        };
        reader.readAsText(file);
    }
}

function logoutAllDevices() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        if (!confirm('Logout from all devices? You will need to login again.')) return;
        AppData.user.sessions = [];
        localStorage.removeItem('currentSession');
        saveData();
        showToast('Logged out from all devices', 'success');
        setTimeout(() => window.location.href = '../index.html', 1000);
    }
}

function confirmEraseData() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        if (!confirm('Erase ALL data? This cannot be undone!')) return;
        if (!confirm('Are you absolutely sure? All sales, inventory, and transactions will be deleted!')) return;
        const result = eraseAllData();
        if (result.success) {
            showToast(result.message, 'success');
            setTimeout(() => window.location.reload(), 1000);
        }
    }
}

function confirmDeleteAccount() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        if (!confirm('Delete your account? This will erase everything and cannot be undone!')) return;
        if (!confirm('Are you absolutely sure? This action is permanent!')) return;
        deleteAccount();
    }
}

function showAbout() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const modalTitle = document.getElementById('infoModalTitle');
        const modalContent = document.getElementById('infoModalContent');
        
        if (modalTitle && modalContent) {
            modalTitle.innerHTML = '<i data-lucide="info" class="title-icon"></i>About';
            modalContent.innerHTML = `
                <div style="text-align: center; margin-bottom: 30px;">
                    <h3 style="color: var(--color-primary); margin-bottom: 15px;">International Dealers ZM POS System</h3>
                    <p style="color: var(--text-secondary); line-height: 1.6;">Version: 1.0.0</p>
                    <p style="color: var(--text-secondary); line-height: 1.6;">© 2024 International Dealers ZM. All rights reserved.</p>
                    <p style="color: var(--text-secondary); line-height: 1.6;">Professional Point of Sale System with offline support, inventory management, sales tracking, and comprehensive reporting.</p>
                </div>
            `;
            
            const modal = document.getElementById('infoModal');
            if (modal) {
                modal.classList.add('active');
            }
            
            refreshIcons();
        }
    }
}

function showPrivacyPolicy() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const modalTitle = document.getElementById('infoModalTitle');
        const modalContent = document.getElementById('infoModalContent');
        
        if (modalTitle && modalContent) {
            modalTitle.innerHTML = '<i data-lucide="shield-check" class="title-icon"></i>Privacy Policy';
            modalContent.innerHTML = `
                <div style="text-align: center; margin-bottom: 25px;">
                    <h3 style="color: var(--color-primary); margin-bottom: 15px;">Privacy Policy</h3>
                    <div style="text-align: left; color: var(--text-secondary); line-height: 1.6;">
                        <p><strong>Data Collection:</strong> We collect only the data necessary for the POS system to function, including user information, inventory data, sales records, and system settings.</p>
                        <p><strong>Data Usage:</strong> Your data is stored locally in your browser and is not shared with third parties without your consent.</p>
                        <p><strong>Data Security:</strong> All data is encrypted and stored securely. We implement industry-standard security measures.</p>
                        <p><strong>Data Retention:</strong> You can export or delete your data at any time through the settings page.</p>
                    </div>
                </div>
            `;
            
            const modal = document.getElementById('infoModal');
            if (modal) {
                modal.classList.add('active');
            }
            
            refreshIcons();
        }
    }
}

function showTermsOfService() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const modalTitle = document.getElementById('infoModalTitle');
        const modalContent = document.getElementById('infoModalContent');
        
        if (modalTitle && modalContent) {
            modalTitle.innerHTML = '<i data-lucide="file-text" class="title-icon"></i>Terms of Service';
            modalContent.innerHTML = `
                <div style="text-align: center; margin-bottom: 25px;">
                    <h3 style="color: var(--color-primary); margin-bottom: 15px;">Terms of Service</h3>
                    <div style="text-align: left; color: var(--text-secondary); line-height: 1.6;">
                        <p><strong>Acceptance of Terms:</strong> By using this POS system, you agree to these terms and conditions.</p>
                        <p><strong>Usage Guidelines:</strong> Use this system for legitimate business purposes only. You are responsible for the accuracy of your data.</p>
                        <p><strong>Data Ownership:</strong> You retain full ownership of your data. We do not claim ownership of your business information.</p>
                        <p><strong>System Availability:</strong> While we strive for 100% uptime, we cannot guarantee uninterrupted service.</p>
                        <p><strong>Limitation of Liability:</strong> We are not liable for any business losses incurred while using this system.</p>
                        <p><strong>Termination:</strong> You may stop using this service at any time and can request data deletion.</p>
                    </div>
                </div>
            `;
            
            const modal = document.getElementById('infoModal');
            if (modal) {
                modal.classList.add('active');
            }
            
            refreshIcons();
        }
    }
}

function closeInfoModal() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const modal = document.getElementById('infoModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
}

// ==================== GLOBAL INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    if (typeof initTheme === 'function') {
        initTheme();
    }
    
    // Load components if on dashboard pages
    if (document.getElementById('sidebarContainer')) {
        initializeComponents();
        
        // Initialize SPA navigation after components load
        setTimeout(() => {
            initializeSPANavigation();
        }, 150);
    }
    
    // Initialize icons
    refreshIcons();
});

// Make functions globally available
window.AppData = AppData;
window.saveData = saveData;
window.loadData = loadData;
window.formatCurrency = formatCurrency;
window.isLoggedIn = isLoggedIn;
window.login = login;
window.createAccount = createAccount;
window.logout = logout;
window.deleteAccount = deleteAccount;
window.eraseAllData = eraseAllData;
window.addInventoryItem = addInventoryItem;
window.updateInventoryItem = updateInventoryItem;
window.deleteInventoryItem = deleteInventoryItem;
window.recordSale = recordSale;
window.deleteSale = deleteSale;
window.addExpense = addExpense;
window.deleteExpense = deleteExpense;
window.topUpWallet = topUpWallet;
window.withdrawFromWallet = withdrawFromWallet;
window.getAllUsers = getAllUsers;
window.addUser = addUser;
window.updateUser = updateUser;
window.deleteUser = deleteUser;
window.getDashboardStats = getDashboardStats;
window.checkAndResetDailySales = checkAndResetDailySales;
window.showToast = showToast;
window.refreshIcons = refreshIcons;
window.updateTopbarProfile = updateTopbarProfile;
window.generateId = generateId;
// Export functions to global scope for HTML onclick handlers - CLEAN VERSION
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.showProductModal = showProductModal;
window.showAddItemModal = showAddItemModal;
window.previewSalesReport = previewSalesReport;
window.previewExpenseReport = previewExpenseReport;
window.previewInventoryReport = previewInventoryReport;
window.downloadCurrentReport = downloadCurrentReport;
window.showAddExpenseModal = showAddExpenseModal;
window.showTopUpModal = showTopUpModal;
window.showWithdrawModal = showWithdrawModal;
window.closeTopUpModal = closeTopUpModal;
window.closeWithdrawModal = closeWithdrawModal;
window.closeExpenseModal = closeExpenseModal;
window.closeProductModal = closeProductModal;
window.closeItemModal = closeItemModal;
window.markNotificationAsRead = markNotificationAsRead;
window.deleteNotification = deleteNotification;
window.loadWalletData = loadWalletData;
window.loadTransactions = loadTransactions;
window.loadExpensesData = loadExpensesData;
window.loadSalesData = loadSalesData;
window.loadInventoryData = loadInventoryData;
window.deleteExpenseItem = deleteExpenseItem;
window.deleteTransaction = deleteTransaction;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.loadSettings = loadSettings;
window.loadSessions = loadSessions;
window.logoutSession = logoutSession;
window.showChangePasswordModal = showChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.exportData = exportData;
window.importData = importData;
window.logoutAllDevices = logoutAllDevices;
window.confirmEraseData = confirmEraseData;
window.confirmDeleteAccount = confirmDeleteAccount;
window.showAbout = showAbout;
window.showPrivacyPolicy = showPrivacyPolicy;
window.showTermsOfService = showTermsOfService;
window.closeInfoModal = closeInfoModal;

console.log('✅ Main.js loaded - All frontend logic centralized');
// ==================== PROFILE PAGE FUNCTIONS ====================
// Functions for profile.html page

function loadProfile() {
    if (!window.location.pathname.includes('profile.html')) return;
    
    document.getElementById('profileName').value = AppData.user.name;
    document.getElementById('profileEmail').value = AppData.user.email;
    document.getElementById('profileDOB').value = AppData.user.dateOfBirth || '';
    document.getElementById('memberSince').value = new Date(AppData.user.createdAt).toLocaleDateString();
    
    if (AppData.user.profilePicture) {
        document.getElementById('profileImg').src = AppData.user.profilePicture;
        document.getElementById('profileImg').style.display = 'block';
        document.getElementById('profilePlaceholderIcon').style.display = 'none';
        document.getElementById('deletePictureBtn').style.display = 'flex';
    } else {
        document.getElementById('profileImg').style.display = 'none';
        document.getElementById('profilePlaceholderIcon').style.display = 'block';
        document.getElementById('deletePictureBtn').style.display = 'none';
    }
}

function deleteProfilePicture() {
    if (!window.location.pathname.includes('profile.html')) return;
    
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    
    AppData.user.profilePicture = null;
    saveData();
    
    document.getElementById('profileImg').src = '';
    document.getElementById('profileImg').style.display = 'none';
    document.getElementById('profilePlaceholderIcon').style.display = 'block';
    document.getElementById('deletePictureBtn').style.display = 'none';
    
    // Update topbar profile picture
    if (typeof updateTopbarProfile === 'function') {
        updateTopbarProfile();
    }
    
    showToast('Profile picture removed', 'success');
    lucide.createIcons();
}

// ==================== TRANSACTION HISTORY PAGE FUNCTIONS ====================
// Functions for transaction_history.html page

let transactionCurrentPage = 1;
const transactionItemsPerPage = 10;
let allTransactions = [];

function loadTransactionHistory() {
    if (!window.location.pathname.includes('transaction_history.html')) return;
    
    const searchTerm = document.getElementById('searchTransaction')?.value.toLowerCase() || '';
    const filterType = document.getElementById('filterType')?.value || 'all';
    const filterDate = document.getElementById('filterDate')?.value || 'all';
    
    // Get date range based on filter
    const now = new Date();
    let startDate = null;
    
    switch(filterDate) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
    }
    
    // Filter and sort transactions (newest first)
    allTransactions = AppData.transactions.filter(t => {
        const matchesSearch = t.items.some(item => item.name.toLowerCase().includes(searchTerm));
        const matchesFilter = filterType === 'all' || t.type === filterType;
        const transactionDate = new Date(t.date);
        const matchesDate = !startDate || transactionDate >= startDate;
        return matchesSearch && matchesFilter && matchesDate;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    transactionCurrentPage = 1; // Reset to first page on new search
    displayTransactionHistory();
}

function displayTransactionHistory() {
    if (!window.location.pathname.includes('transaction_history.html')) return;
    
    const list = document.getElementById('transactionList');
    const empty = document.getElementById('emptyTransactions');
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (allTransactions.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'flex';
        paginationContainer.style.display = 'none';
        return;
    }
    
    empty.style.display = 'none';
    
    // Calculate pagination
    const totalPages = Math.ceil(allTransactions.length / transactionItemsPerPage);
    const startIndex = (transactionCurrentPage - 1) * transactionItemsPerPage;
    const endIndex = Math.min(startIndex + transactionItemsPerPage, allTransactions.length);
    const paginatedTransactions = allTransactions.slice(startIndex, endIndex);
    
    // Display transactions
    list.innerHTML = paginatedTransactions.map(t => {
        const isProfit = t.profit >= 0;
        const amountColor = isProfit ? 'positive' : 'negative';
        const amountSign = isProfit ? '+' : '';
        
        return `
        <div class="transaction-item">
            <div class="transaction-icon income">
                <i data-lucide="shopping-cart"></i>
            </div>
            <div class="transaction-details">
                <div class="transaction-type">
                    ${t.items.map(item => `${item.name} (${item.quantity})`).join(', ')}
                </div>
                <div class="transaction-date">${new Date(t.date).toLocaleString()}</div>
                <div style="display: flex; gap: var(--spacing-md); margin-top: var(--spacing-xs); font-size: var(--text-sm); color: var(--text-secondary); flex-wrap: wrap;">
                    <span><i data-lucide="user" style="width: 14px; height: 14px;"></i> ${t.soldBy || 'Unknown'}${t.soldByRole ? ` (${t.soldByRole})` : ''}</span>
                    <span><i data-lucide="credit-card" style="width: 14px; height: 14px;"></i> ${t.paymentMethod || 'Cash'}</span>
                </div>
            </div>
            <div class="transaction-amount ${amountColor}">${amountSign}${formatCurrency(t.amount)}</div>
            <button class="table-btn delete" onclick="deleteTransaction('${t.id}')" title="Delete">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
    `;
    }).join('');
    
    // Update pagination info
    document.getElementById('showingStart').textContent = startIndex + 1;
    document.getElementById('showingEnd').textContent = endIndex;
    document.getElementById('totalItems').textContent = allTransactions.length;
    
    // Show/hide pagination
    if (allTransactions.length > transactionItemsPerPage) {
        paginationContainer.style.display = 'flex';
        updateTransactionPaginationButtons(totalPages);
    } else {
        paginationContainer.style.display = 'none';
    }
    
    lucide.createIcons();
}

function updateTransactionPaginationButtons(totalPages) {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageNumbers = document.getElementById('pageNumbers');
    
    // Disable/enable prev/next buttons
    prevBtn.disabled = transactionCurrentPage === 1;
    nextBtn.disabled = transactionCurrentPage === totalPages;
    prevBtn.style.opacity = transactionCurrentPage === 1 ? '0.5' : '1';
    prevBtn.style.cursor = transactionCurrentPage === 1 ? 'not-allowed' : 'pointer';
    nextBtn.style.opacity = transactionCurrentPage === totalPages ? '0.5' : '1';
    nextBtn.style.cursor = transactionCurrentPage === totalPages ? 'not-allowed' : 'pointer';
    
    // Generate page numbers
    pageNumbers.innerHTML = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, transactionCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'action-btn secondary';
        pageBtn.style.padding = '0.5rem 1rem';
        pageBtn.style.minWidth = '40px';
        pageBtn.textContent = i;
        
        if (i === transactionCurrentPage) {
            pageBtn.style.background = 'var(--color-primary)';
            pageBtn.style.color = '#0a0e1a';
            pageBtn.style.fontWeight = '700';
        }
        
        pageBtn.onclick = () => goToTransactionPage(i);
        pageNumbers.appendChild(pageBtn);
    }
}

function changeTransactionPage(direction) {
    const totalPages = Math.ceil(allTransactions.length / transactionItemsPerPage);
    const newPage = transactionCurrentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        transactionCurrentPage = newPage;
        displayTransactionHistory();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function goToTransactionPage(page) {
    transactionCurrentPage = page;
    displayTransactionHistory();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== MANAGE USERS PAGE FUNCTIONS ====================
// Functions for manage-users.html page

let usersCurrentPage = 1;
let usersPageSize = 25;
let usersFilteredItems = [];

function loadUserStats() {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    const users = getAllUsers();
    const admins = users.filter(u => u.role === 'admin');
    const workers = users.filter(u => u.role === 'worker');
    const active = users.filter(u => u.status === 'active');
    
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('totalAdmins').textContent = admins.length;
    document.getElementById('totalWorkers').textContent = workers.length;
    document.getElementById('activeUsers').textContent = active.length;
}

function loadUsersTable() {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    console.log('Loading users table...');
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('emptyUsers');
    const paginationContainer = document.getElementById('usersPagination');
    
    if (!tbody) {
        console.error('Users table body not found');
        return;
    }
    
    const searchTerm = document.getElementById('searchUsers')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('filterRole')?.value || 'all';
    const statusFilter = document.getElementById('filterStatus')?.value || 'all';
    
    usersFilteredItems = getAllUsers().filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm) || 
                            user.email.toLowerCase().includes(searchTerm);
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
    });
    
    console.log('Filtered users:', usersFilteredItems.length);
    
    if (usersFilteredItems.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'flex';
        paginationContainer.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        
        // Calculate pagination
        const totalPages = Math.ceil(usersFilteredItems.length / usersPageSize);
        if (usersCurrentPage > totalPages) usersCurrentPage = totalPages;
        if (usersCurrentPage < 1) usersCurrentPage = 1;
        
        const startIndex = (usersCurrentPage - 1) * usersPageSize;
        const endIndex = Math.min(startIndex + usersPageSize, usersFilteredItems.length);
        const pageUsers = usersFilteredItems.slice(startIndex, endIndex);
        
        tbody.innerHTML = pageUsers.map(user => {
            const isCurrentUser = user.email === AppData.user.email;
            const statusClass = user.status === 'active' ? 'success' : 'warning';
            const roleClass = user.role === 'admin' ? 'primary' : 'secondary';
            
            // Capitalize each word in name
            const capitalizedName = user.name.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
            
            // Capitalize role
            const capitalizedRole = user.role.charAt(0).toUpperCase() + user.role.slice(1);
            
            // Capitalize status
            const capitalizedStatus = user.status.charAt(0).toUpperCase() + user.status.slice(1);
            
            // User icon based on role
            const userIcon = user.role === 'admin' ? 'shield-check' : 'user';
            
            return `
                <tr>
                    <td style="font-weight: 600;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i data-lucide="${userIcon}" style="width: 18px; height: 18px; color: var(--primary);"></i>
                            <span>${capitalizedName}</span>
                            ${isCurrentUser ? '<span class="badge primary" style="font-size: 0.7rem; margin-left: 0.5rem;">You</span>' : ''}
                        </div>
                    </td>
                    <td>${user.email}</td>
                    <td>${user.contact}</td>
                    <td><span class="badge ${roleClass}">${capitalizedRole}</span></td>
                    <td><span class="badge ${statusClass}">${capitalizedStatus}</span></td>
                    <td>
                        <div class="table-actions">
                            <button class="table-btn edit" onclick="openEditUserModal('${user.id}')" title="Edit">
                                <i data-lucide="edit-2"></i>
                            </button>
                            ${!isCurrentUser ? `
                                <button class="table-btn delete" onclick="handleDeleteUser('${user.id}')" title="Delete">
                                    <i data-lucide="trash-2"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Update pagination UI
        if (usersFilteredItems.length > usersPageSize) {
            paginationContainer.style.display = 'flex';
            document.getElementById('usersShowingStart').textContent = startIndex + 1;
            document.getElementById('usersShowingEnd').textContent = endIndex;
            document.getElementById('usersTotal').textContent = usersFilteredItems.length;
            document.getElementById('usersCurrentPage').textContent = usersCurrentPage;
            document.getElementById('usersTotalPages').textContent = totalPages;
            
            document.getElementById('usersFirstBtn').disabled = usersCurrentPage === 1;
            document.getElementById('usersPrevBtn').disabled = usersCurrentPage === 1;
            document.getElementById('usersNextBtn').disabled = usersCurrentPage === totalPages;
            document.getElementById('usersLastBtn').disabled = usersCurrentPage === totalPages;
        } else {
            paginationContainer.style.display = 'none';
        }
    }
    
    // Reinitialize icons
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

function openAddUserModal() {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    console.log('Opening Add User modal');
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.classList.add('active');
        
        setTimeout(() => {
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
        }, 100);
    } else {
        console.error('Add User modal not found');
    }
}

function closeAddUserModal() {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('addUserForm').reset();
    }
}

function openEditUserModal(userId) {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    const user = AppData.users.find(u => u.id === userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }
    
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserContact').value = user.contact;
    document.getElementById('editUserRole').value = user.role;
    document.getElementById('editUserStatus').value = user.status;
    document.getElementById('editUserPassword').value = '';
    
    const modal = document.getElementById('editUserModal');
    if (modal) {
        modal.classList.add('active');
        
        setTimeout(() => {
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
        }, 100);
    }
}

function closeEditUserModal() {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    const modal = document.getElementById('editUserModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('editUserForm').reset();
    }
}

function handleAddUser(e) {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    e.preventDefault();
    console.log('Handling add user form submission');
    
    const userData = {
        name: document.getElementById('userName').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        contact: document.getElementById('userContact').value.trim(),
        role: document.getElementById('userRole').value,
        password: document.getElementById('userPassword').value,
        status: document.getElementById('userStatus').value
    };
    
    console.log('Adding user:', userData.email);
    
    const result = addUser(userData);
    
    if (result.success) {
        showToast(result.message, 'success');
        closeAddUserModal();
        loadUserStats();
        loadUsersTable();
    } else {
        showToast(result.message, 'error');
    }
}

function handleEditUser(e) {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    e.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const password = document.getElementById('editUserPassword').value;
    
    const userData = {
        name: document.getElementById('editUserName').value.trim(),
        email: document.getElementById('editUserEmail').value.trim(),
        contact: document.getElementById('editUserContact').value.trim(),
        role: document.getElementById('editUserRole').value,
        status: document.getElementById('editUserStatus').value
    };
    
    // Only update password if provided
    if (password) {
        userData.password = password;
    }
    
    const result = updateUser(userId, userData);
    
    if (result.success) {
        showToast(result.message, 'success');
        closeEditUserModal();
        loadUserStats();
        loadUsersTable();
    } else {
        showToast(result.message, 'error');
    }
}

function handleDeleteUser(userId) {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }
    
    const result = deleteUser(userId);
    
    if (result.success) {
        showToast(result.message, 'success');
        loadUserStats();
        loadUsersTable();
    } else {
        showToast(result.message, 'error');
    }
}

function changeUsersPage(action) {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    const totalPages = Math.ceil(usersFilteredItems.length / usersPageSize);
    
    switch(action) {
        case 'first':
            usersCurrentPage = 1;
            break;
        case 'prev':
            if (usersCurrentPage > 1) usersCurrentPage--;
            break;
        case 'next':
            if (usersCurrentPage < totalPages) usersCurrentPage++;
            break;
        case 'last':
            usersCurrentPage = totalPages;
            break;
    }
    
    loadUsersTable();
}

function changeUsersPageSize() {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    usersPageSize = parseInt(document.getElementById('usersPageSize').value);
    usersCurrentPage = 1;
    loadUsersTable();
}

// ==================== EXPOSE ALL FUNCTIONS TO GLOBAL SCOPE ====================
// Make all functions globally available for onclick handlers and cross-page access

window.forceIconRefresh = forceIconRefresh;
window.formatDate = formatDate;
window.loadNotifications = loadNotifications;
window.displayNotifications = displayNotifications;
window.updatePaginationButtons = updatePaginationButtons;
window.changePage = changePage;
window.goToPage = goToPage;
window.loadProfile = loadProfile;
window.deleteProfilePicture = deleteProfilePicture;
window.loadTransactionHistory = loadTransactionHistory;
window.displayTransactionHistory = displayTransactionHistory;
window.updateTransactionPaginationButtons = updateTransactionPaginationButtons;
window.changeTransactionPage = changeTransactionPage;
window.goToTransactionPage = goToTransactionPage;
window.loadUserStats = loadUserStats;
window.loadUsersTable = loadUsersTable;
window.openAddUserModal = openAddUserModal;
window.closeAddUserModal = closeAddUserModal;
window.openEditUserModal = openEditUserModal;
window.closeEditUserModal = closeEditUserModal;
window.handleAddUser = handleAddUser;
window.handleEditUser = handleEditUser;
window.handleDeleteUser = handleDeleteUser;
window.changeUsersPage = changeUsersPage;
window.changeUsersPageSize = changeUsersPageSize;

=======
// ==================== MAIN.JS - CENTRALIZED FRONTEND LOGIC ====================
// This file contains ALL frontend logic for the POS System
// Backend calculations are handled by server.js API endpoints

// ==================== DATA MANAGEMENT ====================
const AppData = {
    user: null,
    users: [],
    inventory: [],
    sales: [],
    transactions: [],
    expenses: [],
    wallet: {
        balance: 0,
        transactions: []
    },
    dailySales: {
        date: new Date().toDateString(),
        total: 0,
        count: 0,
        profit: 0
    },
    notifications: [],
    settings: {
        businessName: "International Dealers ZM",
        currency: "ZMW",
        theme: localStorage.getItem('theme') || 'dark',
        lowStockThreshold: 10
    }
};

// Load data from localStorage
function loadData() {
    try {
        const saved = localStorage.getItem('posSystemData');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(AppData, parsed);
            console.log('✅ Data loaded from localStorage');
        }
    } catch (error) {
        console.error('❌ Error loading data:', error);
    }
}

// Save data to localStorage
function saveData() {
    try {
        localStorage.setItem('posSystemData', JSON.stringify(AppData));
        console.log('✅ Data saved to localStorage');
    } catch (error) {
        console.error('❌ Error saving data:', error);
    }
}

// Initialize data on load
loadData();

// ==================== UTILITY FUNCTIONS ====================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatCurrency(amount) {
    return `ZMW ${parseFloat(amount || 0).toFixed(2)}`;
}

function isLoggedIn() {
    return AppData.user !== null;
}

// ==================== AUTHENTICATION ====================
function login(email, password) {
    // Check main user
    if (AppData.user && AppData.user.email === email && AppData.user.password === password) {
        const sessionId = generateId();
        if (!AppData.user.sessions) AppData.user.sessions = [];
        AppData.user.sessions.push({
            id: sessionId,
            location: 'Local Device',
            lastActivity: new Date().toISOString()
        });
        localStorage.setItem('currentSession', sessionId);
        saveData();
        return { success: true, message: 'Login successful', user: AppData.user };
    }
    
    // Check additional users
    const user = AppData.users.find(u => u.email === email && u.password === password);
    if (user) {
        if (user.status === 'inactive') {
            return { success: false, message: 'Account is inactive' };
        }
        AppData.user = user;
        const sessionId = generateId();
        if (!user.sessions) user.sessions = [];
        user.sessions.push({
            id: sessionId,
            location: 'Local Device',
            lastActivity: new Date().toISOString()
        });
        localStorage.setItem('currentSession', sessionId);
        saveData();
        return { success: true, message: 'Login successful', user };
    }
    
    return { success: false, message: 'Invalid email or password' };
}

function createAccount(userData) {
    // Check if email exists
    if (AppData.user && AppData.user.email === userData.email) {
        return { success: false, message: 'Email already registered' };
    }
    
    const existingUser = AppData.users.find(u => u.email === userData.email);
    if (existingUser) {
        return { success: false, message: 'Email already registered' };
    }
    
    const newUser = {
        id: generateId(),
        name: userData.name,
        email: userData.email,
        dateOfBirth: userData.dateOfBirth,
        password: userData.password,
        securityQuestion: userData.securityQuestion,
        securityAnswer: userData.securityAnswer,
        role: AppData.user ? 'user' : 'admin',
        createdAt: new Date().toISOString(),
        sessions: []
    };
    
    if (!AppData.user) {
        AppData.user = newUser;
    } else {
        AppData.users.push(newUser);
    }
    
    saveData();
    return { success: true, message: 'Account created successfully' };
}

function logout() {
    const sessionId = localStorage.getItem('currentSession');
    if (AppData.user && AppData.user.sessions) {
        AppData.user.sessions = AppData.user.sessions.filter(s => s.id !== sessionId);
    }
    localStorage.removeItem('currentSession');
    AppData.user = null;
    saveData();
    window.location.href = '../index.html';
}

function deleteAccount() {
    localStorage.clear();
    window.location.href = '../index.html';
}

function eraseAllData() {
    const user = AppData.user;
    const settings = AppData.settings;
    
    AppData.inventory = [];
    AppData.sales = [];
    AppData.transactions = [];
    AppData.expenses = [];
    AppData.wallet = { balance: 0, transactions: [] };
    AppData.dailySales = { date: new Date().toDateString(), total: 0, count: 0, profit: 0 };
    AppData.notifications = [];
    
    saveData();
    return { success: true, message: 'All data erased successfully' };
}

// ==================== INVENTORY MANAGEMENT ====================
function addInventoryItem(itemData) {
    if (window.InventoryService) {
        return window.InventoryService.add(itemData);
    }
    
    // Fallback for backward compatibility
    const newItem = {
        id: generateId(),
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
    
    AppData.inventory.push(newItem);
    saveData();
    
    addNotification('success', 'Inventory Updated', `${newItem.name} added to inventory`);
    
    return { success: true, message: 'Item added successfully', item: newItem };
}

function updateInventoryItem(id, updates) {
    if (window.InventoryService) {
        return window.InventoryService.update(id, updates);
    }
    
    // Fallback for backward compatibility
    const itemIndex = AppData.inventory.findIndex(item => item.id === id);
    if (itemIndex === -1) {
        return { success: false, message: 'Item not found' };
    }
    
    const item = AppData.inventory[itemIndex];
    Object.assign(item, updates);
    item.lastUpdated = new Date().toISOString();
    
    // Recalculate profits
    item.profitPerItem = item.sellingPrice - item.buyingPrice;
    item.netProfit = item.profitPerItem * item.quantity;
    
    // Check for zero stock auto-removal
    if (item.quantity <= 0) {
        // Move to history and remove from active inventory
        addNotification('warning', 'Sold Out', `${item.name} is now out of stock and removed from inventory`);
        AppData.inventory.splice(itemIndex, 1);
        saveData();
        return { success: true, message: 'Item sold out and removed from inventory', soldOut: true };
    }
    
    saveData();
    
    return { success: true, message: 'Item updated successfully' };
}

function deleteInventoryItem(id) {
    if (window.InventoryService) {
        return window.InventoryService.delete(id);
    }
    
    // Fallback for backward compatibility
    const itemIndex = AppData.inventory.findIndex(item => item.id === id);
    if (itemIndex === -1) {
        return { success: false, message: 'Item not found' };
    }
    
    AppData.inventory.splice(itemIndex, 1);
    saveData();
    
    return { success: true, message: 'Item deleted successfully' };
}

// ==================== SALES MANAGEMENT ====================
function recordSale(cartItems, paymentMethod = 'Cash') {
    // Validate stock
    for (const cartItem of cartItems) {
        const inventoryItem = AppData.inventory.find(item => item.id === cartItem.id);
        if (!inventoryItem || inventoryItem.quantity < cartItem.quantity) {
            return { success: false, message: `Insufficient stock for ${cartItem.name}` };
        }
    }
    
    // Calculate totals
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const profit = cartItems.reduce((sum, item) => sum + ((item.price - item.buyingPrice) * item.quantity), 0);
    
    // Create sale record with enhanced accountability
    const sale = {
        id: generateId(),
        items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            buyingPrice: item.buyingPrice
        })),
        total,
        profit,
        amount: total,
        type: 'sale',
        paymentMethod,
        soldBy: AppData.user.name,
        soldByUserId: AppData.user.id, // Track user ID for accountability
        soldByRole: AppData.user.role, // Track user role (admin/worker)
        date: new Date().toISOString()
    };
    
    // Update inventory with auto-cleanup for zero stock
    if (window.InventoryService) {
        const stockResult = window.InventoryService.updateStock(cartItems);
        if (stockResult.soldOutItems && stockResult.soldOutItems.length > 0) {
            console.log(`📦 ${stockResult.soldOutItems.length} items sold out and moved to history`);
        }
    } else {
        // Fallback inventory update
        cartItems.forEach(cartItem => {
            const inventoryItem = AppData.inventory.find(item => item.id === cartItem.id);
            if (inventoryItem) {
                inventoryItem.quantity -= cartItem.quantity;
                inventoryItem.lastUpdated = new Date().toISOString();
                
                // Check for zero stock and auto-remove
                if (inventoryItem.quantity <= 0) {
                    addNotification('warning', 'Sold Out', `${inventoryItem.name} is now out of stock and removed from inventory`);
                    AppData.inventory = AppData.inventory.filter(item => item.id !== inventoryItem.id);
                } else {
                    // Check low stock
                    const threshold = inventoryItem.lowStockThreshold || AppData.settings.lowStockThreshold;
                    if (inventoryItem.quantity <= threshold) {
                        addNotification('warning', 'Low Stock Alert', `${inventoryItem.name} is running low (${inventoryItem.quantity} left)`);
                    }
                }
            }
        });
    }
    
    // Add to sales and transactions
    AppData.sales.push(sale);
    AppData.transactions.push(sale);
    
    // Update daily sales
    checkAndResetDailySales();
    AppData.dailySales.total += total;
    AppData.dailySales.count += 1;
    AppData.dailySales.profit += profit;
    
    // Update wallet
    AppData.wallet.balance += total;
    AppData.wallet.transactions.push({
        id: generateId(),
        amount: total,
        description: `Sale - ${cartItems.map(i => i.name).join(', ')}`,
        date: new Date().toISOString()
    });
    
    saveData();
    
    addNotification('success', 'Sale Completed', `Sale of ${formatCurrency(total)} recorded successfully`);
    
    return { success: true, message: 'Sale recorded successfully', sale };
}

function deleteSale(id) {
    const saleIndex = AppData.sales.findIndex(s => s.id === id);
    if (saleIndex === -1) {
        return { success: false, message: 'Sale not found' };
    }
    
    const sale = AppData.sales[saleIndex];
    
    // Return stock
    sale.items.forEach(item => {
        const inventoryItem = AppData.inventory.find(i => i.id === item.id);
        if (inventoryItem) {
            inventoryItem.quantity += item.quantity;
        }
    });
    
    // Remove from sales and transactions
    AppData.sales.splice(saleIndex, 1);
    AppData.transactions = AppData.transactions.filter(t => t.id !== id);
    
    // Update daily sales
    checkAndResetDailySales();
    if (new Date(sale.date).toDateString() === AppData.dailySales.date) {
        AppData.dailySales.total -= sale.total;
        AppData.dailySales.count -= 1;
        AppData.dailySales.profit -= sale.profit;
    }
    
    // Update wallet
    AppData.wallet.balance -= sale.total;
    AppData.wallet.transactions.push({
        id: generateId(),
        amount: -sale.total,
        description: `Sale deleted - refund`,
        date: new Date().toISOString()
    });
    
    saveData();
    
    return { success: true, message: 'Sale deleted and stock returned' };
}

// ==================== EXPENSES MANAGEMENT ====================
function addExpense(expenseData) {
    const expense = {
        id: generateId(),
        item: expenseData.item,
        amount: parseFloat(expenseData.amount),
        date: new Date().toISOString()
    };
    
    // Check wallet balance
    if (AppData.wallet.balance < expense.amount) {
        return { success: false, message: 'Insufficient wallet balance' };
    }
    
    AppData.expenses.push(expense);
    
    // Update wallet
    AppData.wallet.balance -= expense.amount;
    AppData.wallet.transactions.push({
        id: generateId(),
        amount: -expense.amount,
        description: expense.item,
        date: new Date().toISOString()
    });
    
    saveData();
    
    addNotification('info', 'Expense Recorded', `${expense.item} - ${formatCurrency(expense.amount)}`);
    
    return { success: true, message: 'Expense recorded successfully', expense };
}

function deleteExpense(id) {
    const expenseIndex = AppData.expenses.findIndex(e => e.id === id);
    if (expenseIndex === -1) {
        return { success: false, message: 'Expense not found' };
    }
    
    const expense = AppData.expenses[expenseIndex];
    
    // Refund to wallet
    AppData.wallet.balance += expense.amount;
    AppData.wallet.transactions.push({
        id: generateId(),
        amount: expense.amount,
        description: `Expense deleted - ${expense.item}`,
        date: new Date().toISOString()
    });
    
    AppData.expenses.splice(expenseIndex, 1);
    saveData();
    
    return { success: true, message: 'Expense deleted and amount refunded' };
}

// ==================== WALLET MANAGEMENT ====================
function topUpWallet(amount) {
    const value = parseFloat(amount);
    if (value <= 0) {
        return { success: false, message: 'Invalid amount' };
    }
    
    AppData.wallet.balance += value;
    AppData.wallet.transactions.push({
        id: generateId(),
        amount: value,
        description: 'Wallet top-up',
        date: new Date().toISOString()
    });
    
    saveData();
    
    return { success: true, message: 'Wallet topped up successfully' };
}

function withdrawFromWallet(amount) {
    const value = parseFloat(amount);
    if (value <= 0) {
        return { success: false, message: 'Invalid amount' };
    }
    
    if (AppData.wallet.balance < value) {
        return { success: false, message: 'Insufficient balance' };
    }
    
    AppData.wallet.balance -= value;
    AppData.wallet.transactions.push({
        id: generateId(),
        amount: -value,
        description: 'Withdrawal',
        date: new Date().toISOString()
    });
    
    saveData();
    
    return { success: true, message: 'Withdrawal successful' };
}

// ==================== USER MANAGEMENT ====================
function getAllUsers() {
    return AppData.users || [];
}

function addUser(userData) {
    // Check if email exists
    const exists = AppData.users.some(u => u.email === userData.email);
    if (exists) {
        return { success: false, message: 'Email already exists' };
    }
    
    const newUser = {
        id: generateId(),
        name: userData.name,
        email: userData.email,
        contact: userData.contact,
        role: userData.role,
        password: userData.password,
        status: userData.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessions: []
    };
    
    AppData.users.push(newUser);
    saveData();
    
    return { success: true, message: 'User added successfully', user: newUser };
}

function updateUser(id, updates) {
    const userIndex = AppData.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
        return { success: false, message: 'User not found' };
    }
    
    const user = AppData.users[userIndex];
    Object.assign(user, updates);
    user.updatedAt = new Date().toISOString();
    
    // Update password if provided
    if (updates.password && updates.password.trim() !== '') {
        user.password = updates.password;
    }
    
    saveData();
    
    return { success: true, message: 'User updated successfully' };
}

function deleteUser(id) {
    const userIndex = AppData.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
        return { success: false, message: 'User not found' };
    }
    
    AppData.users.splice(userIndex, 1);
    saveData();
    
    return { success: true, message: 'User deleted successfully' };
}

// ==================== DASHBOARD STATS ====================
function checkAndResetDailySales() {
    const today = new Date().toDateString();
    if (AppData.dailySales.date !== today) {
        AppData.dailySales = {
            date: today,
            total: 0,
            count: 0,
            profit: 0
        };
        saveData();
    }
}

function getDashboardStats() {
    checkAndResetDailySales();
    
    const totalInventoryValue = AppData.inventory.reduce((sum, item) => 
        sum + (item.buyingPrice * item.quantity), 0);
    
    const lowStockCount = AppData.inventory.filter(item => 
        item.quantity <= (item.lowStockThreshold || AppData.settings.lowStockThreshold)).length;
    
    const today = new Date().toDateString();
    const totalExpenses = AppData.expenses
        .filter(expense => new Date(expense.date).toDateString() === today)
        .reduce((sum, expense) => sum + expense.amount, 0);
    
    return {
        dailySales: AppData.dailySales,
        totalInventoryValue,
        lowStockCount,
        totalSales: AppData.sales.length,
        walletBalance: AppData.wallet.balance,
        totalExpenses
    };
}

// ==================== NOTIFICATIONS ====================
function addNotification(type, title, message) {
    if (window.NotificationService) {
        return window.NotificationService.add(type, title, message);
    }
}

function updateNotificationBadge() {
    if (window.NotificationService) {
        window.NotificationService.updateBadge();
    }
}

function markAllNotificationsAsRead() {
    if (window.NotificationService) {
        window.NotificationService.markAllAsRead();
    }
}

function clearAllNotifications() {
    if (window.NotificationService) {
        window.NotificationService.clearAll();
    }
}

// ==================== UI COMPONENTS ====================
async function loadComponent(elementId, componentPath) {
    try {
        const response = await fetch(componentPath);
        const html = await response.text();
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        }
    } catch (error) {
        console.error(`Error loading component ${componentPath}:`, error);
    }
}

async function initializeComponents() {
    await loadComponent('sidebarContainer', '../assets/componets/sidebar.html');
    await loadComponent('topbarContainer', '../assets/componets/topbar.html');
    
    // Initialize after components load
    setTimeout(() => {
        initializeSidebar();
        initializeTopbar();
        updateNotificationBadge();
        refreshIcons();
    }, 100);
}

function initializeSidebar() {
    // Use RouterService if available for consistent active state management
    if (window.RouterService) {
        window.RouterService.refreshActiveState();
    } else {
        // Fallback: FIRST: Remove ALL active classes to prevent duplicates
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // THEN: Set active nav item based on current page
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
        navItems.forEach(item => {
            const page = item.getAttribute('data-page');
            if (page === currentPage) {
                item.classList.add('active');
            }
        });
    }
    
    // Hide admin-only items for workers
    if (AppData.user && AppData.user.role === 'worker') {
        document.querySelectorAll('[data-role="admin"]').forEach(el => {
            el.style.display = 'none';
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

function initializeTopbar() {
    // Profile info
    const profileName = document.getElementById('profileName');
    if (profileName && AppData.user) {
        profileName.textContent = AppData.user.name;
    }
    
    // Profile image
    updateTopbarProfile();
    
    // Sidebar toggle (works on both desktop and mobile)
    const mobileToggle = document.getElementById('mobileSidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // On mobile: toggle mobile-open class
            if (window.innerWidth <= 1023) {
                sidebar.classList.toggle('mobile-open');
            } else {
                // On desktop: toggle collapsed class
                sidebar.classList.toggle('collapsed');
                
                // Save collapsed state
                const isCollapsed = sidebar.classList.contains('collapsed');
                localStorage.setItem('sidebarCollapsed', isCollapsed);
            }
        });
        
        // Restore collapsed state on desktop
        if (window.innerWidth > 1023) {
            const savedCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (savedCollapsed) {
                sidebar.classList.add('collapsed');
            }
        }
        
        // Close mobile sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1023 &&
                sidebar.classList.contains('mobile-open') && 
                !sidebar.contains(e.target) && 
                !mobileToggle.contains(e.target)) {
                sidebar.classList.remove('mobile-open');
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 1023) {
                // Remove mobile class on desktop
                sidebar.classList.remove('mobile-open');
            } else {
                // Remove collapsed class on mobile
                sidebar.classList.remove('collapsed');
            }
        });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (typeof toggleTheme === 'function') {
                toggleTheme();
            }
        });
    }
    
    // Profile dropdown
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        
        document.addEventListener('click', () => {
            profileDropdown.classList.remove('active');
        });
    }
    
    // Topbar logout
    const topbarLogout = document.getElementById('topbarLogout');
    if (topbarLogout) {
        topbarLogout.addEventListener('click', logout);
    }
    
    // Notifications
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsPanel = document.getElementById('notificationsPanel');
    const closeNotifications = document.getElementById('closeNotifications');
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    if (notificationsBtn && notificationsPanel) {
        notificationsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationsPanel.classList.toggle('active');
            loadNotificationsPanel();
        });
        
        if (closeNotifications) {
            closeNotifications.addEventListener('click', () => {
                notificationsPanel.classList.remove('active');
            });
        }
        
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                markAllNotificationsAsRead();
                loadNotificationsPanel();
                showToast('All notifications marked as read', 'success');
            });
        }
        
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Clear all notifications?')) {
                    clearAllNotifications();
                    loadNotificationsPanel();
                    showToast('All notifications cleared', 'success');
                }
            });
        }
        
        document.addEventListener('click', (e) => {
            if (!notificationsPanel.contains(e.target) && !notificationsBtn.contains(e.target)) {
                notificationsPanel.classList.remove('active');
            }
        });
    }
    
    // Page title
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
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
        pageTitle.textContent = titles[currentPage] || 'Dashboard';
    }
}

function updateTopbarProfile() {
    const profileImage = document.getElementById('profileImage');
    const profilePlaceholder = document.getElementById('profilePlaceholder');
    
    if (AppData.user && AppData.user.profilePicture) {
        if (profileImage) {
            profileImage.src = AppData.user.profilePicture;
            profileImage.style.display = 'block';
        }
        if (profilePlaceholder) {
            profilePlaceholder.style.display = 'none';
        }
    } else {
        if (profileImage) {
            profileImage.style.display = 'none';
        }
        if (profilePlaceholder) {
            profilePlaceholder.style.display = 'flex';
        }
    }
}

function loadNotificationsPanel() {
    const list = document.getElementById('topbarNotificationsList');
    if (!list) return;
    
    const notifications = window.NotificationService ? window.NotificationService.getAll() : [];
    
    if (notifications.length === 0) {
        list.innerHTML = `
            <div class="empty-notifications">
                <span class="unicode-icon">🔕</span>
                <p>No notifications</p>
            </div>
        `;
        return;
    }
    
    const unicodeIconMap = {
        'info': 'ℹ️',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌'
    };
    
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };
    
    list.innerHTML = notifications.slice(0, 10).map(n => `
        <div class="notification-item ${n.type} ${n.read ? 'read' : 'unread'}" data-id="${n.id}" onclick="markNotificationAsRead('${n.id}')">
            <div class="notification-item-header">
                <span class="unicode-icon notification-item-icon">${unicodeIconMap[n.type] || 'ℹ️'}</span>
                <span class="notification-item-title">${n.title}</span>
            </div>
            <p class="notification-item-message">${n.message}</p>
            <span class="notification-item-date">${formatDate(n.date)}</span>
        </div>
    `).join('');
}

function markNotificationAsRead(id) {
    if (window.NotificationService) {
        window.NotificationService.markAsRead(id);
        loadNotificationsPanel();
    }
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        'success': 'check-circle',
        'error': 'x-circle',
        'warning': 'alert-triangle',
        'info': 'info'
    };
    
    toast.innerHTML = `
        <i data-lucide="${iconMap[type]}" class="toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== ICON REFRESH ====================
function refreshIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

// ==================== SPA NAVIGATION ====================
let currentPageContent = null;

async function navigateToPage(pageName, pageFile) {
    try {
        // Fetch the page HTML
        const response = await fetch(pageFile);
        if (!response.ok) {
            throw new Error(`Failed to load page: ${pageFile}`);
        }
        
        const html = await response.text();
        
        // Parse the HTML to extract the main content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Get the content wrapper from the new page
        const newContent = doc.querySelector('.content-wrapper');
        if (!newContent) {
            console.error('No content-wrapper found in page');
            return;
        }
        
        // Replace the current content
        const currentContent = document.querySelector('.content-wrapper');
        if (currentContent) {
            // Store scroll position
            const scrollPos = window.scrollY;
            
            // Fade out animation
            currentContent.style.opacity = '0';
            currentContent.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                currentContent.innerHTML = newContent.innerHTML;
                
                // Update page title
                const pageTitle = document.getElementById('pageTitle');
                if (pageTitle) {
                    const titles = {
                        'dashboard': 'Dashboard',
                        'sales': 'Sales',
                        'inventory': 'Inventory',
                        'expenses': 'Expenses',
                        'wallet': 'Wallet',
                        'reports': 'Reports',
                        'profile': 'Profile',
                        'settings': 'Settings',
                        'notifications': 'Notifications',
                        'manage-users': 'Manage Users',
                        'transaction_history': 'Transaction History'
                    };
                    pageTitle.textContent = titles[pageName] || 'Dashboard';
                }
                
                // Update active nav item
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                    if (item.getAttribute('data-page') === pageName) {
                        item.classList.add('active');
                    }
                });
                
                // Fade in animation
                currentContent.style.opacity = '1';
                currentContent.style.transform = 'translateY(0)';
                
                // Scroll to top
                window.scrollTo(0, 0);
                
                // Refresh icons
                refreshIcons();
                
                // Execute any page-specific initialization scripts
                executePageScripts(doc);
                
                // Update browser history
                history.pushState({ page: pageName }, '', pageFile);
                
            }, 200);
        }
        
    } catch (error) {
        console.error('Navigation error:', error);
        showToast('Failed to load page', 'error');
    }
}

function executePageScripts(doc) {
    // Extract and execute inline scripts from the loaded page
    const scripts = doc.querySelectorAll('script');
    scripts.forEach(script => {
        if (script.textContent && !script.src) {
            try {
                // Wrap script execution in a function to handle DOM timing issues
                // Use setTimeout to ensure DOM is fully rendered before script runs
                setTimeout(() => {
                    try {
                        eval(script.textContent);
                    } catch (error) {
                        console.error('Error executing page script:', error);
                    }
                }, 50);
            } catch (error) {
                console.error('Error preparing page script:', error);
            }
        }
    });
}

function initializeSPANavigation() {
    // Prevent multiple initializations
    if (window.spaNavigationInitialized) {
        return;
    }
    window.spaNavigationInitialized = true;
    
    console.log('🔄 Initializing simplified navigation...');
    
    // Handle navigation clicks with debouncing to prevent double navigation
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
                    console.log('🔄 Navigating to:', pageName, pageFile);
                    
                    // Use simple redirect instead of complex SPA to avoid conflicts
                    if (window.location.pathname !== pageFile) {
                        window.location.href = pageFile;
                    }
                }, 150);
            }
        }
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.page) {
            const navItem = document.querySelector(`.nav-item[data-page="${e.state.page}"]`);
            if (navItem) {
                const pageFile = navItem.getAttribute('data-href');
                if (pageFile && window.location.pathname !== pageFile) {
                    window.location.href = pageFile;
                }
            }
        }
    });
    
    // Set initial state
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    history.replaceState({ page: currentPage }, '', window.location.pathname);
    
    console.log('✅ Navigation system initialized');
}

// ==================== ADDITIONAL HELPER FUNCTIONS ====================
// These are placeholder functions to prevent console errors when called from wrong context
// The actual implementations exist in their respective pages

// ==================== CENTRALIZED FUNCTIONS - ALL PAGES USE MAIN.JS ONLY ====================
// NO MORE STANDALONE FUNCTIONS IN INDIVIDUAL PAGES - EVERYTHING IS HERE

// ==================== SALES PAGE FUNCTIONS ====================
let cart = [];

function loadSalesData() {
    const stats = getDashboardStats();
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    updateElement('todaySales', formatCurrency(stats.dailySales.total));
    updateElement('todayTransactions', stats.dailySales.count);
    updateElement('todayProfit', formatCurrency(stats.dailySales.profit));
    updateElement('itemsSold', calculateItemsSold());
    updateElement('todayDate', new Date().toLocaleDateString());
}

function calculateItemsSold() {
    return AppData.sales
        .filter(sale => new Date(sale.date).toDateString() === new Date().toDateString())
        .reduce((sum, sale) => sum + sale.items.reduce((s, item) => s + item.quantity, 0), 0);
}

function closeProductModal() {
    console.log('🛒 Closing product modal...');
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.remove('active');
        console.log('✅ Product modal closed');
    }
}

function loadProductList() {
    const searchTerm = document.getElementById('searchProduct')?.value.toLowerCase() || '';
    const products = AppData.inventory.filter(item => 
        item.quantity > 0 && item.name.toLowerCase().includes(searchTerm)
    );
    
    const productList = document.getElementById('productList');
    const emptyProducts = document.getElementById('emptyProducts');
    
    if (!productList) return;
    
    if (products.length === 0) {
        productList.innerHTML = '';
        if (emptyProducts) emptyProducts.style.display = 'flex';
    } else {
        if (emptyProducts) emptyProducts.style.display = 'none';
        productList.innerHTML = products.map(product => `
            <div class="product-item" onclick="addToCart('${product.id}')">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-stock">Stock: ${product.quantity}</div>
                </div>
                <div class="product-price">${formatCurrency(product.sellingPrice)}</div>
            </div>
        `).join('');
    }
    refreshIcons();
}

function addToCart(productId) {
    console.log('🛒 Adding product to cart:', productId);
    const product = AppData.inventory.find(p => p.id === productId);
    if (!product || product.quantity === 0) {
        console.error('❌ Product not available:', productId);
        showToast('Product not available', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        if (existingItem.quantity >= product.quantity) {
            console.warn('⚠️ Cannot add more than available stock');
            showToast('Cannot add more than available stock', 'warning');
            return;
        }
        existingItem.quantity++;
        console.log('✅ Increased quantity for existing item');
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.sellingPrice,
            buyingPrice: product.buyingPrice,
            quantity: 1,
            maxQuantity: product.quantity
        });
        console.log('✅ Added new item to cart');
    }
    
    updateCart();
    closeProductModal();
    showToast('Product added to cart', 'success');
}

function updateCart() {
    const cartItems = document.getElementById('cartItems');
    const emptyCart = document.getElementById('emptyCart');
    const cartSummary = document.getElementById('cartSummary');
    const clearCartBtn = document.getElementById('clearCartBtn');
    
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '';
        if (emptyCart) emptyCart.style.display = 'flex';
        if (cartSummary) cartSummary.style.display = 'none';
        if (clearCartBtn) clearCartBtn.style.display = 'none';
    } else {
        if (emptyCart) emptyCart.style.display = 'none';
        if (cartSummary) cartSummary.style.display = 'block';
        if (clearCartBtn) clearCartBtn.style.display = 'flex';
        
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${formatCurrency(item.price)} each</div>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-controls">
                        <button onclick="decreaseQuantity('${item.id}')" class="qty-btn">
                            <i data-lucide="minus"></i>
                        </button>
                        <input type="number" value="${item.quantity}" 
                            onchange="updateQuantity('${item.id}', this.value)"
                            min="1" max="${item.maxQuantity}" class="qty-input">
                        <button onclick="increaseQuantity('${item.id}')" class="qty-btn">
                            <i data-lucide="plus"></i>
                        </button>
                    </div>
                    <input type="number" value="${item.price}" step="0.01" 
                        onchange="updatePrice('${item.id}', this.value)"
                        class="price-input" placeholder="Price">
                    <div class="cart-item-total">${formatCurrency(item.price * item.quantity)}</div>
                    <button onclick="removeFromCart('${item.id}')" class="table-btn delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const netProfit = cart.reduce((sum, item) => sum + ((item.price - item.buyingPrice) * item.quantity), 0);
        
        const profitColor = netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
        
        const updateElement = (id, value, color = null) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                if (color) element.style.color = color;
            }
        };
        
        updateElement('cartSubtotal', formatCurrency(total));
        updateElement('cartTotal', formatCurrency(total));
        updateElement('cartNetProfit', formatCurrency(netProfit), profitColor);
    }
    refreshIcons();
}

function increaseQuantity(id) {
    const item = cart.find(i => i.id === id);
    if (item && item.quantity < item.maxQuantity) {
        item.quantity++;
        updateCart();
    } else {
        showToast('Maximum quantity reached', 'warning');
    }
}

function decreaseQuantity(id) {
    const item = cart.find(i => i.id === id);
    if (item && item.quantity > 1) {
        item.quantity--;
        updateCart();
    }
}

function updateQuantity(id, value) {
    const item = cart.find(i => i.id === id);
    const qty = parseInt(value);
    if (item && qty > 0 && qty <= item.maxQuantity) {
        item.quantity = qty;
        updateCart();
    } else {
        showToast('Invalid quantity', 'error');
        updateCart();
    }
}

function updatePrice(id, value) {
    const item = cart.find(i => i.id === id);
    const price = parseFloat(value);
    if (item && price > 0) {
        item.price = price;
        updateCart();
    } else {
        showToast('Invalid price', 'error');
        updateCart();
    }
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCart();
    showToast('Item removed from cart', 'info');
}

function clearCart() {
    if (confirm('Clear all items from cart?')) {
        cart = [];
        updateCart();
        showToast('Cart cleared', 'info');
    }
}

function completeSale() {
    if (cart.length === 0) {
        showToast('Cart is empty', 'error');
        return;
    }
    
    const paymentMethod = document.getElementById('paymentMethod')?.value || 'Cash';
    
    const result = recordSale(cart, paymentMethod);
    if (result.success) {
        showToast('Sale completed successfully!', 'success');
        cart = [];
        updateCart();
        loadSalesData();
    } else {
        showToast(result.message, 'error');
    }
}

// ==================== INVENTORY PAGE FUNCTIONS ====================
let editingItemId = null;

function loadInventoryData() {
    const stats = getDashboardStats();
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    updateElement('totalItems', AppData.inventory.length);
    updateElement('totalValue', formatCurrency(stats.totalInventoryValue));
    updateElement('lowStockItems', stats.lowStockCount);
    updateElement('potentialProfit', formatCurrency(
        AppData.inventory.reduce((sum, item) => sum + item.netProfit, 0)
    ));
    
    loadInventoryTable();
}

let inventoryCurrentPage = 1;
let inventoryPageSize = 25;
let inventoryFilteredItems = [];

function loadInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    const emptyState = document.getElementById('emptyInventory');
    const paginationContainer = document.getElementById('inventoryPagination');
    
    if (!tbody) return;
    
    const searchTerm = document.getElementById('searchInventory')?.value.toLowerCase() || '';
    const filterValue = document.getElementById('filterStock')?.value || 'all';
    
    inventoryFilteredItems = AppData.inventory.filter(item => {
        const threshold = item.lowStockThreshold || AppData.settings.lowStockThreshold;
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        const matchesFilter = filterValue === 'all' || 
            (filterValue === 'low' && item.quantity <= threshold) ||
            (filterValue === 'instock' && item.quantity > threshold);
        return matchesSearch && matchesFilter;
    });
    
    if (inventoryFilteredItems.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        if (paginationContainer) paginationContainer.style.display = 'none';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        
        const totalPages = Math.ceil(inventoryFilteredItems.length / inventoryPageSize);
        if (inventoryCurrentPage > totalPages) inventoryCurrentPage = totalPages;
        if (inventoryCurrentPage < 1) inventoryCurrentPage = 1;
        
        const startIndex = (inventoryCurrentPage - 1) * inventoryPageSize;
        const endIndex = Math.min(startIndex + inventoryPageSize, inventoryFilteredItems.length);
        const pageItems = inventoryFilteredItems.slice(startIndex, endIndex);
        
        const isWorker = AppData.user && AppData.user.role === 'worker';
        
        tbody.innerHTML = pageItems.map(item => {
            const salesAmount = item.sellingPrice * item.quantity;
            const threshold = item.lowStockThreshold || AppData.settings.lowStockThreshold;
            const isLowStock = item.quantity <= threshold;
            
            const actionButtons = isWorker ? '' : `
                <div class="table-actions">
                    <button class="table-btn edit" onclick="editItem('${item.id}')" title="Edit">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="table-btn delete" onclick="deleteItem('${item.id}')" title="Delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `;
            
            return `
            <tr>
                <td style="font-weight: 600;">${item.name}</td>
                <td>
                    ${isLowStock ? 
                        `<span class="badge warning">${item.quantity}</span>` : 
                        `<span class="badge success">${item.quantity}</span>`
                    }
                </td>
                <td>${formatCurrency(item.buyingPrice)}</td>
                <td>${formatCurrency(item.sellingPrice)}</td>
                <td style="color: var(--color-info); font-weight: 600;">${formatCurrency(salesAmount)}</td>
                <td style="color: var(--color-success); font-weight: 600;">${formatCurrency(item.netProfit)}</td>
                <td>${actionButtons}</td>
            </tr>
        `;
        }).join('');
        
        if (inventoryFilteredItems.length > inventoryPageSize && paginationContainer) {
            paginationContainer.style.display = 'flex';
            const updateElement = (id, value) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            };
            
            updateElement('inventoryShowingStart', startIndex + 1);
            updateElement('inventoryShowingEnd', endIndex);
            updateElement('inventoryTotal', inventoryFilteredItems.length);
            updateElement('inventoryCurrentPage', inventoryCurrentPage);
            updateElement('inventoryTotalPages', totalPages);
            
            const updateButton = (id, disabled) => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = disabled;
            };
            
            updateButton('inventoryFirstBtn', inventoryCurrentPage === 1);
            updateButton('inventoryPrevBtn', inventoryCurrentPage === 1);
            updateButton('inventoryNextBtn', inventoryCurrentPage === totalPages);
            updateButton('inventoryLastBtn', inventoryCurrentPage === totalPages);
        } else if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
    }
    refreshIcons();
}

function changeInventoryPage(action) {
    const totalPages = Math.ceil(inventoryFilteredItems.length / inventoryPageSize);
    
    switch(action) {
        case 'first':
            inventoryCurrentPage = 1;
            break;
        case 'prev':
            if (inventoryCurrentPage > 1) inventoryCurrentPage--;
            break;
        case 'next':
            if (inventoryCurrentPage < totalPages) inventoryCurrentPage++;
            break;
        case 'last':
            inventoryCurrentPage = totalPages;
            break;
    }
    
    loadInventoryTable();
}

function changeInventoryPageSize() {
    const pageSizeElement = document.getElementById('inventoryPageSize');
    if (pageSizeElement) {
        inventoryPageSize = parseInt(pageSizeElement.value);
        inventoryCurrentPage = 1;
        loadInventoryTable();
    }
}

function closeItemModal() {
    const modal = document.getElementById('itemModal');
    if (modal) {
        modal.classList.remove('active');
        const form = document.getElementById('itemForm');
        if (form) form.reset();
        editingItemId = null;
    }
}

function editItem(id) {
    const isWorker = AppData.user && AppData.user.role === 'worker';
    if (isWorker) {
        showToast('You do not have permission to edit items', 'error');
        return;
    }
    
    const item = AppData.inventory.find(i => i.id === id);
    if (!item) return;
    
    editingItemId = id;
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
    };
    
    updateElement('modalTitle', 'Edit Item');
    updateElement('submitBtnText', 'Update Item');
    updateElement('itemId', id);
    updateElement('itemName', item.name);
    updateElement('itemQuantity', item.quantity);
    updateElement('itemBuyingPrice', item.buyingPrice);
    updateElement('itemSellingPrice', item.sellingPrice);
    updateElement('lowStockThreshold', item.lowStockThreshold || 10);
    
    const modalTitle = document.getElementById('modalTitle');
    const submitBtnText = document.getElementById('submitBtnText');
    if (modalTitle) modalTitle.textContent = 'Edit Item';
    if (submitBtnText) submitBtnText.textContent = 'Update Item';
    
    calculateProfits();
    
    const modal = document.getElementById('itemModal');
    if (modal) modal.classList.add('active');
}

function deleteItem(id) {
    const isWorker = AppData.user && AppData.user.role === 'worker';
    if (isWorker) {
        showToast('You do not have permission to delete items', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    const result = deleteInventoryItem(id);
    if (result.success) {
        showToast(result.message, 'success');
        loadInventoryData();
    } else {
        showToast(result.message, 'error');
    }
}

function calculateProfits() {
    const quantity = parseFloat(document.getElementById('itemQuantity')?.value) || 0;
    const buyingPrice = parseFloat(document.getElementById('itemBuyingPrice')?.value) || 0;
    const sellingPrice = parseFloat(document.getElementById('itemSellingPrice')?.value) || 0;
    
    const profitPerItem = sellingPrice - buyingPrice;
    const netProfit = profitPerItem * quantity;
    
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.value = formatCurrency(value);
    };
    
    updateElement('profitPerItem', profitPerItem);
    updateElement('netProfit', netProfit);
}

// ==================== EXPENSES PAGE FUNCTIONS ====================
let expensesCurrentPage = 1;
const expensesItemsPerPage = 10;
let allExpenses = [];

function loadExpensesData() {
    const total = AppData.expenses.reduce((sum, e) => sum + e.amount, 0);
    const today = new Date().toDateString();
    const todayTotal = AppData.expenses.filter(e => new Date(e.date).toDateString() === today).reduce((sum, e) => sum + e.amount, 0);
    const month = new Date().getMonth();
    const monthTotal = AppData.expenses.filter(e => new Date(e.date).getMonth() === month).reduce((sum, e) => sum + e.amount, 0);
    
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    updateElement('totalExpenses', formatCurrency(total));
    updateElement('monthExpenses', formatCurrency(monthTotal));
    updateElement('todayExpenses', formatCurrency(todayTotal));
    updateElement('expenseCount', AppData.expenses.length);
    updateElement('monthName', new Date().toLocaleDateString('en-US', { month: 'long' }));
    
    loadExpenseList();
}

function loadExpenseList() {
    const searchTerm = document.getElementById('searchExpense')?.value.toLowerCase() || '';
    
    allExpenses = AppData.expenses
        .filter(e => e.item.toLowerCase().includes(searchTerm))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    expensesCurrentPage = 1;
    displayExpenses();
}

function displayExpenses() {
    const list = document.getElementById('expenseList');
    const empty = document.getElementById('emptyExpenses');
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (!list) return;
    
    if (allExpenses.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'flex';
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
    }
    
    if (empty) empty.style.display = 'none';
    
    const totalPages = Math.ceil(allExpenses.length / expensesItemsPerPage);
    const startIndex = (expensesCurrentPage - 1) * expensesItemsPerPage;
    const endIndex = Math.min(startIndex + expensesItemsPerPage, allExpenses.length);
    const paginatedExpenses = allExpenses.slice(startIndex, endIndex);
    
    list.innerHTML = paginatedExpenses.map(e => `
        <div class="expense-item">
            <div class="expense-info">
                <div class="expense-name">${e.item}</div>
                <div class="expense-date">${new Date(e.date).toLocaleString()}</div>
            </div>
            <div class="expense-amount">-${formatCurrency(e.amount)}</div>
            <button class="table-btn delete" onclick="deleteExpenseItem('${e.id}')" title="Delete">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
    `).join('');
    
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    updateElement('showingStart', startIndex + 1);
    updateElement('showingEnd', endIndex);
    updateElement('totalItems', allExpenses.length);
    
    if (allExpenses.length > expensesItemsPerPage && paginationContainer) {
        paginationContainer.style.display = 'flex';
        updateExpensesPaginationButtons(totalPages);
    } else if (paginationContainer) {
        paginationContainer.style.display = 'none';
    }
    
    refreshIcons();
}

function updateExpensesPaginationButtons(totalPages) {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageNumbers = document.getElementById('pageNumbers');
    
    if (prevBtn) {
        prevBtn.disabled = expensesCurrentPage === 1;
        prevBtn.style.opacity = expensesCurrentPage === 1 ? '0.5' : '1';
        prevBtn.style.cursor = expensesCurrentPage === 1 ? 'not-allowed' : 'pointer';
    }
    
    if (nextBtn) {
        nextBtn.disabled = expensesCurrentPage === totalPages;
        nextBtn.style.opacity = expensesCurrentPage === totalPages ? '0.5' : '1';
        nextBtn.style.cursor = expensesCurrentPage === totalPages ? 'not-allowed' : 'pointer';
    }
    
    if (pageNumbers) {
        pageNumbers.innerHTML = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, expensesCurrentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'action-btn secondary';
            pageBtn.style.padding = '0.5rem 1rem';
            pageBtn.style.minWidth = '40px';
            pageBtn.textContent = i;
            
            if (i === expensesCurrentPage) {
                pageBtn.style.background = 'var(--color-primary)';
                pageBtn.style.color = '#0a0e1a';
                pageBtn.style.fontWeight = '700';
            }
            
            pageBtn.onclick = () => goToExpensePage(i);
            pageNumbers.appendChild(pageBtn);
        }
    }
}

function changeExpensePage(direction) {
    const totalPages = Math.ceil(allExpenses.length / expensesItemsPerPage);
    const newPage = expensesCurrentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        expensesCurrentPage = newPage;
        displayExpenses();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function goToExpensePage(page) {
    expensesCurrentPage = page;
    displayExpenses();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeExpenseModal() {
    const modal = document.getElementById('expenseModal');
    if (modal) {
        modal.classList.remove('active');
        const form = document.getElementById('expenseForm');
        if (form) form.reset();
    }
}

function deleteExpenseItem(id) {
    if (!confirm('Delete this expense? Amount will be refunded to wallet.')) return;
    const result = deleteExpense(id);
    if (result.success) {
        showToast(result.message, 'success');
        loadExpensesData();
    } else {
        showToast(result.message, 'error');
    }
}

// ==================== WALLET PAGE FUNCTIONS ====================
function loadWalletData() {
    const balanceElement = document.getElementById('walletBalance');
    if (balanceElement) {
        balanceElement.textContent = formatCurrency(AppData.wallet.balance);
    }
    loadTransactions();
}

function loadTransactions() {
    const list = document.getElementById('transactionList');
    const empty = document.getElementById('emptyTransactions');
    
    if (!list) return;
    
    const transactions = AppData.wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (transactions.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'flex';
    } else {
        if (empty) empty.style.display = 'none';
        list.innerHTML = transactions.map(t => {
            const isIncome = t.amount > 0;
            const icon = isIncome ? 'arrow-down-circle' : 'arrow-up-circle';
            return `
                <div class="transaction-item">
                    <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
                        <i data-lucide="${icon}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-type">${t.description}</div>
                        <div class="transaction-date">${new Date(t.date).toLocaleString()}</div>
                    </div>
                    <div class="transaction-amount ${isIncome ? 'positive' : 'negative'}">
                        ${isIncome ? '+' : ''}${formatCurrency(Math.abs(t.amount))}
                    </div>
                </div>
            `;
        }).join('');
    }
    refreshIcons();
}

function closeTopUpModal() {
    const modal = document.getElementById('topUpModal');
    if (modal) {
        modal.classList.remove('active');
        const form = document.getElementById('topUpForm');
        if (form) form.reset();
    }
}

function closeWithdrawModal() {
    const modal = document.getElementById('withdrawModal');
    if (modal) {
        modal.classList.remove('active');
        const form = document.getElementById('withdrawForm');
        if (form) form.reset();
    }
}

// ==================== REPORTS PAGE FUNCTIONS ====================
let currentReportType = null;
let currentReportData = null;

function initializeDates() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDateElement = document.getElementById('startDate');
    const endDateElement = document.getElementById('endDate');
    
    if (startDateElement) startDateElement.valueAsDate = firstDayOfMonth;
    if (endDateElement) endDateElement.valueAsDate = today;
}

function getDateRange() {
    const start = document.getElementById('startDate')?.value;
    const end = document.getElementById('endDate')?.value;
    return { 
        start: start ? new Date(start) : null, 
        end: end ? new Date(end + 'T23:59:59') : null 
    };
}

function filterByDateRange(items, dateField = 'date') {
    const { start, end } = getDateRange();
    if (!start && !end) return items;
    
    return items.filter(item => {
        const itemDate = new Date(item[dateField]);
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        return true;
    });
}

function showPreview(title, content) {
    const previewTitle = document.getElementById('previewTitle');
    const previewContent = document.getElementById('reportPreviewContent');
    const previewSection = document.getElementById('reportPreviewSection');
    
    if (previewTitle) previewTitle.textContent = title;
    if (previewContent) previewContent.innerHTML = content;
    if (previewSection) {
        previewSection.style.display = 'block';
        previewSection.scrollIntoView({ behavior: 'smooth' });
    }
    refreshIcons();
}

let cachedLogo = null;

function downloadCurrentReport() {
    if (!currentReportType) {
        showToast('No report to download', 'error');
        return;
    }
    
    showToast('Generating PDF...', 'info');
    
    setTimeout(() => {
        try {
            // Check if jsPDF is available
            if (typeof window.jspdf === 'undefined') {
                console.error('jsPDF library not loaded');
                showToast('PDF library not available. Please check your internet connection.', 'error');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                compress: true
            });
            
            const { start, end } = getDateRange();
            const periodText = start && end ? 
                `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` : 
                'All Time';
            
            if (cachedLogo) {
                addLogoAndGenerate(doc, periodText, cachedLogo);
                return;
            }
            
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                
                ctx.drawImage(img, 0, 0);
                
                cachedLogo = canvas.toDataURL('image/png');
                
                addLogoAndGenerate(doc, periodText, cachedLogo);
            };
            
            img.onerror = function() {
                console.warn('Logo failed to load, generating without logo');
                addLogoAndGenerate(doc, periodText, null);
            };
            
            // Fix logo path for different page locations
            const currentPath = window.location.pathname;
            const logoPath = currentPath.includes('/pages/') 
                ? '../IDZ-logo.png' 
                : './IDZ-logo.png';
            
            img.crossOrigin = 'anonymous';
            img.src = logoPath;
            
        } catch (error) {
            console.error('PDF generation error:', error);
            showToast('Failed to generate PDF: ' + error.message, 'error');
        }
    }, 100);
}

function addLogoAndGenerate(doc, periodText, logo) {
    if (logo) {
        const logoWidth = 20;
        const logoHeight = 20;
        const logoX = (210 - logoWidth) / 2;
        const logoY = 10;
        
        try {
            doc.addImage(logo, 'PNG', logoX, logoY, logoWidth, logoHeight);
        } catch (e) {
            console.warn('Failed to add logo:', e);
        }
        
        doc.setFontSize(18);
        doc.setTextColor(124, 58, 237);
        doc.setFont(undefined, 'bold');
        doc.text(AppData.settings.businessName, 105, logoY + logoHeight + 8, { align: 'center' });
    } else {
        doc.setFontSize(18);
        doc.setTextColor(124, 58, 237);
        doc.setFont(undefined, 'bold');
        doc.text(AppData.settings.businessName, 105, 20, { align: 'center' });
    }
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    
    generateReportContent(doc, periodText);
}

function generateReportContent(doc, periodText) {
    if (currentReportType === 'sales') {
        doc.text('SALES REPORT', 105, 50, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Period: ${periodText}`, 105, 57, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 62, { align: 'center' });
        
        const totalSales = currentReportData.reduce((sum, s) => sum + s.total, 0);
        const totalProfit = currentReportData.reduce((sum, s) => sum + s.profit, 0);
        const totalItems = currentReportData.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0);
        
        // Enhanced summary box with better styling
        doc.setFillColor(124, 58, 237); // Primary color background
        doc.rect(14, 68, 182, 28, 'F');
        
        // White text on colored background
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        
        // Column 1
        doc.text('Total Sales', 25, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(totalSales), 25, 82, { align: 'left' });
        
        // Column 2
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Total Profit', 70, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(totalProfit), 70, 82, { align: 'left' });
        
        // Column 3
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Transactions', 120, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(currentReportData.length.toString(), 120, 82, { align: 'left' });
        
        // Column 4
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Items Sold', 165, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(totalItems.toString(), 165, 82, { align: 'left' });
        
        // Reset text color for table
        doc.setTextColor(0, 0, 0);
        
        const MAX_ROWS = 1000;
        const allSalesItems = currentReportData.flatMap(sale => 
            sale.items.map((item, idx) => {
                const itemProfit = (item.price - item.buyingPrice) * item.quantity;
                
                return [
                    new Date(sale.date).toLocaleString(),
                    item.name,
                    item.quantity.toString(),
                    idx === 0 ? (sale.soldBy || 'Unknown') : '',
                    idx === 0 ? (sale.paymentMethod || 'Cash') : '',
                    formatCurrency(item.price * item.quantity),
                    formatCurrency(itemProfit)
                ];
            })
        );
        
        const salesData = allSalesItems.slice(0, MAX_ROWS);
        
        if (allSalesItems.length > MAX_ROWS) {
            showToast(`Report limited to ${MAX_ROWS} rows (${allSalesItems.length} total). Use date filters for complete reports.`, 'warning');
        }
        
        doc.autoTable({
            startY: 102,
            head: [['Date', 'Product', 'Qty', 'Sold By', 'Payment', 'Total', 'Profit']],
            body: salesData,
            theme: 'striped',
            headStyles: { 
                fillColor: [124, 58, 237], 
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7
            },
            styles: { 
                fontSize: 6,
                cellPadding: 1.5,
                lineWidth: 0.1,
                overflow: 'linebreak',
                cellWidth: 'wrap'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 'auto' },
                4: { cellWidth: 'auto' },
                5: { cellWidth: 'auto' },
                6: { cellWidth: 'auto' }
            },
            margin: { left: 14, right: 14, top: 20, bottom: 20 },
            tableWidth: 'auto',
            showHead: 'everyPage',
            didParseCell: function(data) {
                if (data.column.index === 6 && data.section === 'body') {
                    const value = data.cell.raw;
                    if (value && value.includes('-')) {
                        data.cell.styles.textColor = [220, 38, 38];
                    }
                }
            }
        });
        
        const pageCount = doc.internal.getNumberOfPages();
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('Page ' + i + ' of ' + pageCount, 14, pageHeight - 10);
        }
        
        doc.setPage(pageCount);
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setDrawColor(124, 58, 237);
        doc.setLineWidth(0.5);
        doc.line(14, finalY, 196, finalY);
        
        doc.setFontSize(10);
        doc.setTextColor(124, 58, 237);
        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL SALES: ${formatCurrency(totalSales)}`, 14, finalY + 8);
        doc.text(`TOTAL PROFIT: ${formatCurrency(totalProfit)}`, 120, finalY + 8);
        
        doc.save(`Sales_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('Report downloaded successfully!', 'success');
        
    } else if (currentReportType === 'expense') {
        doc.text('EXPENSE REPORT', 105, 50, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Period: ${periodText}`, 105, 57, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 62, { align: 'center' });
        
        const totalExpenses = currentReportData.reduce((sum, e) => sum + e.amount, 0);
        const avgExpense = currentReportData.length > 0 ? totalExpenses / currentReportData.length : 0;
        
        // Enhanced summary box with better styling
        doc.setFillColor(124, 58, 237);
        doc.rect(14, 68, 182, 28, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        
        doc.text('Total Expenses', 40, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(totalExpenses), 40, 82, { align: 'left' });
        
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Expense Count', 105, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(currentReportData.length.toString(), 105, 82, { align: 'left' });
        
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Average', 155, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(avgExpense), 155, 82, { align: 'left' });
        
        doc.setTextColor(0, 0, 0);
        
        const MAX_ROWS = 1000;
        const expenseData = currentReportData.slice(0, MAX_ROWS).map(expense => [
            new Date(expense.date).toLocaleString(),
            expense.item,
            formatCurrency(expense.amount)
        ]);
        
        if (currentReportData.length > MAX_ROWS) {
            showToast(`Report limited to ${MAX_ROWS} rows (${currentReportData.length} total). Use date filters for complete reports.`, 'warning');
        }
        
        doc.autoTable({
            startY: 102,
            head: [['Date', 'Item', 'Amount']],
            body: expenseData,
            theme: 'striped',
            headStyles: { 
                fillColor: [124, 58, 237], 
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9
            },
            styles: { 
                fontSize: 8,
                cellPadding: 2,
                lineWidth: 0.1,
                overflow: 'linebreak',
                cellWidth: 'wrap'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { left: 14, right: 14, top: 20, bottom: 20 },
            tableWidth: 'auto',
            showHead: 'everyPage'
        });
        
        const pageCountExp = doc.internal.getNumberOfPages();
        const pageSizeExp = doc.internal.pageSize;
        const pageHeightExp = pageSizeExp.height ? pageSizeExp.height : pageSizeExp.getHeight();
        for (let i = 1; i <= pageCountExp; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('Page ' + i + ' of ' + pageCountExp, 14, pageHeightExp - 10);
        }
        
        doc.setPage(pageCountExp);
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setDrawColor(124, 58, 237);
        doc.setLineWidth(0.5);
        doc.line(14, finalY, 196, finalY);
        
        doc.setFontSize(10);
        doc.setTextColor(124, 58, 237);
        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL EXPENSES: ${formatCurrency(totalExpenses)}`, 14, finalY + 8);
        
        doc.save(`Expense_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        
    } else if (currentReportType === 'inventory') {
        doc.text('INVENTORY REPORT', 105, 50, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 57, { align: 'center' });
        
        const totalValue = currentReportData.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
        const totalCost = currentReportData.reduce((sum, item) => sum + (item.buyingPrice * item.quantity), 0);
        const potentialProfit = currentReportData.reduce((sum, item) => sum + item.netProfit, 0);
        const totalItems = currentReportData.reduce((sum, item) => sum + item.quantity, 0);
        
        // Enhanced summary box with better styling
        doc.setFillColor(124, 58, 237); // Primary color background
        doc.rect(14, 68, 182, 28, 'F');
        
        // White text on colored background
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        
        // Column 1
        doc.text('Total Value', 30, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(totalValue), 30, 82, { align: 'left' });
        
        // Column 2
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Total Cost', 75, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(totalCost), 75, 82, { align: 'left' });
        
        // Column 3
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Potential Profit', 120, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(potentialProfit), 120, 82, { align: 'left' });
        
        // Column 4
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text('Total Items', 165, 74, { align: 'left' });
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(totalItems.toString(), 165, 82, { align: 'left' });
        
        // Reset text color for table
        doc.setTextColor(0, 0, 0);
        
        const MAX_ROWS = 1000;
        const inventoryData = currentReportData.slice(0, MAX_ROWS).map(item => {
            const salesAmount = item.sellingPrice * item.quantity;
            return [
                item.name,
                item.quantity.toString(),
                formatCurrency(item.buyingPrice),
                formatCurrency(item.sellingPrice),
                formatCurrency(salesAmount),
                formatCurrency(item.netProfit)
            ];
        });
        
        if (currentReportData.length > MAX_ROWS) {
            showToast(`Report limited to ${MAX_ROWS} rows (${currentReportData.length} total).`, 'warning');
        }
        
        doc.autoTable({
            startY: 102,
            head: [['Product', 'Qty', 'Buy Price', 'Sell Price', 'Sales Amount', 'Net Profit']],
            body: inventoryData,
            theme: 'striped',
            headStyles: { 
                fillColor: [124, 58, 237], 
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8
            },
            styles: { 
                fontSize: 7,
                cellPadding: 1.5,
                lineWidth: 0.1,
                overflow: 'linebreak',
                cellWidth: 'wrap'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { left: 14, right: 14, top: 20, bottom: 20 },
            tableWidth: 'auto',
            showHead: 'everyPage'
        });
        
        const pageCountInv = doc.internal.getNumberOfPages();
        const pageSizeInv = doc.internal.pageSize;
        const pageHeightInv = pageSizeInv.height ? pageSizeInv.height : pageSizeInv.getHeight();
        for (let i = 1; i <= pageCountInv; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('Page ' + i + ' of ' + pageCountInv, 14, pageHeightInv - 10);
        }
        
        doc.setPage(pageCountInv);
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setDrawColor(124, 58, 237);
        doc.setLineWidth(0.5);
        doc.line(14, finalY, 196, finalY);
        
        doc.setFontSize(10);
        doc.setTextColor(124, 58, 237);
        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL VALUE: ${formatCurrency(totalValue)}`, 14, finalY + 8);
        doc.text(`POTENTIAL PROFIT: ${formatCurrency(potentialProfit)}`, 120, finalY + 8);
        
        doc.save(`Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    }
    
    showToast('Report downloaded successfully', 'success');
}

// ==================== ADDITIONAL GLOBAL FUNCTIONS ====================
// These functions are called from various pages and need to be globally available

function previewExpenseReport() {
    console.log('📊 Generating expense report preview...');
    
    if (!AppData.expenses || AppData.expenses.length === 0) {
        showToast('No expense data available for report', 'warning');
        return;
    }
    
    currentReportType = 'expense';
    const expenses = filterByDateRange ? filterByDateRange(AppData.expenses) : AppData.expenses;
    currentReportData = expenses;
    
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const start = startDate ? startDate.value : null;
    const end = endDate ? endDate.value : null;
    
    const periodText = start && end ? 
        `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}` : 
        'All Time';
    
    const preview = `
        <div class="report-header">
            <div style="text-align: center; margin-bottom: 15px;">
                <img src="../IDZ-logo.png" alt="Logo" style="width: 80px; height: 80px; object-fit: contain;">
            </div>
            <h1>${AppData.settings.businessName}</h1>
            <h2>Expense Report</h2>
            <div class="report-meta">
                <div>Period: ${periodText}</div>
                <div>Generated: ${new Date().toLocaleString()}</div>
            </div>
        </div>
        
        <div class="report-summary">
            <div class="report-summary-item">
                <div class="report-summary-label">Total Expenses</div>
                <div class="report-summary-value">${formatCurrency(totalExpenses)}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Expense Count</div>
                <div class="report-summary-value">${expenses.length}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Average Expense</div>
                <div class="report-summary-value">${formatCurrency(expenses.length > 0 ? totalExpenses / expenses.length : 0)}</div>
            </div>
        </div>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Item</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenses.map(expense => `
                        <tr>
                            <td>${new Date(expense.date).toLocaleString()}</td>
                            <td>${expense.item}</td>
                            <td style="color: var(--color-danger); font-weight: 600;">${formatCurrency(expense.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    showPreview('Expense Report', preview);
}

function previewInventoryReport() {
    console.log('📊 Generating inventory report preview...');
    
    if (!AppData.inventory || AppData.inventory.length === 0) {
        showToast('No inventory data available for report', 'warning');
        return;
    }
    
    currentReportType = 'inventory';
    currentReportData = AppData.inventory;
    
    const totalValue = AppData.inventory.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    const totalCost = AppData.inventory.reduce((sum, item) => sum + (item.buyingPrice * item.quantity), 0);
    const potentialProfit = AppData.inventory.reduce((sum, item) => sum + item.netProfit, 0);
    const totalItems = AppData.inventory.reduce((sum, item) => sum + item.quantity, 0);
    
    const preview = `
        <div class="report-header">
            <div style="text-align: center; margin-bottom: 15px;">
                <img src="../IDZ-logo.png" alt="Logo" style="width: 80px; height: 80px; object-fit: contain;">
            </div>
            <h1>${AppData.settings.businessName}</h1>
            <h2>Inventory Report</h2>
            <div class="report-meta">
                <div>Generated: ${new Date().toLocaleString()}</div>
            </div>
        </div>
        
        <div class="report-summary">
            <div class="report-summary-item">
                <div class="report-summary-label">Total Value</div>
                <div class="report-summary-value">${formatCurrency(totalValue)}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Total Cost</div>
                <div class="report-summary-value">${formatCurrency(totalCost)}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Potential Profit</div>
                <div class="report-summary-value">${formatCurrency(potentialProfit)}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Total Items</div>
                <div class="report-summary-value">${totalItems}</div>
            </div>
        </div>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Buying Price</th>
                        <th>Selling Price</th>
                        <th>Sales Amount</th>
                        <th>Net Profit</th>
                    </tr>
                </thead>
                <tbody>
                    ${AppData.inventory.map(item => {
                        const salesAmount = item.sellingPrice * item.quantity;
                        return `
                        <tr>
                            <td style="font-weight: 600;">${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>${formatCurrency(item.buyingPrice)}</td>
                            <td>${formatCurrency(item.sellingPrice)}</td>
                            <td style="color: var(--color-info); font-weight: 600;">${formatCurrency(salesAmount)}</td>
                            <td style="color: var(--color-success); font-weight: 600;">${formatCurrency(item.netProfit)}</td>
                        </tr>
                    `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    showPreview('Inventory Report', preview);
}

// ==================== GLOBAL MODAL FUNCTIONS ====================
// These functions work across all pages by checking context and either
// calling local functions or redirecting to the appropriate page

function showProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.add('active');
        // Load product list if function exists
        if (typeof loadProductList === 'function') {
            loadProductList();
        }
        console.log('✅ Product modal opened successfully');
    } else {
        console.error('❌ Product modal not found - redirecting to sales page');
        window.location.href = 'sales.html';
    }
}

function showAddItemModal() {
    const modal = document.getElementById('itemModal');
    if (modal) {
        // Reset form and show modal
        editingItemId = null;
        const modalTitle = document.getElementById('modalTitle');
        const submitBtnText = document.getElementById('submitBtnText');
        const itemForm = document.getElementById('itemForm');
        
        if (modalTitle) modalTitle.textContent = 'Add Item';
        if (submitBtnText) submitBtnText.textContent = 'Add Item';
        if (itemForm) itemForm.reset();
        
        modal.classList.add('active');
        console.log('✅ Add item modal opened successfully');
    } else {
        console.error('❌ Item modal not found - redirecting to inventory page');
        window.location.href = 'Inventory.html';
    }
}

function previewSalesReport() {
    console.log('📊 Generating sales report preview...');
    
    if (!AppData.sales || AppData.sales.length === 0) {
        showToast('No sales data available for report', 'warning');
        return;
    }
    
    currentReportType = 'sales';
    const sales = filterByDateRange ? filterByDateRange(AppData.sales) : AppData.sales;
    currentReportData = sales;
    
    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
    const totalItems = sales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0);
    
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const start = startDate ? startDate.value : null;
    const end = endDate ? endDate.value : null;
    
    const periodText = start && end ? 
        `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}` : 
        'All Time';
    
    console.log('✅ Sales report preview generated successfully');
    
    const preview = `
        <div class="report-header">
            <div style="text-align: center; margin-bottom: 15px;">
                <img src="../IDZ-logo.png" alt="Logo" style="width: 80px; height: 80px; object-fit: contain;">
            </div>
            <h1>${AppData.settings.businessName}</h1>
            <h2>Sales Report</h2>
            <div class="report-meta">
                <div>Period: ${periodText}</div>
                <div>Generated: ${new Date().toLocaleString()}</div>
            </div>
        </div>
        
        <div class="report-summary">
            <div class="report-summary-item">
                <div class="report-summary-label">Total Sales</div>
                <div class="report-summary-value">${formatCurrency(totalSales)}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Total Profit</div>
                <div class="report-summary-value">${formatCurrency(totalProfit)}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Transactions</div>
                <div class="report-summary-value">${sales.length}</div>
            </div>
            <div class="report-summary-item">
                <div class="report-summary-label">Items Sold</div>
                <div class="report-summary-value">${totalItems}</div>
            </div>
        </div>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Product Name</th>
                        <th>Quantity</th>
                        <th>Sold By</th>
                        <th>Payment</th>
                        <th>Total</th>
                        <th>Profit</th>
                    </tr>
                </thead>
                <tbody>
                    ${sales.flatMap(sale => 
                        sale.items.map((item, idx) => {
                            const itemProfit = (item.price - item.buyingPrice) * item.quantity;
                            const profitColor = itemProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
                            
                            return `
                            <tr>
                                <td>${new Date(sale.date).toLocaleString()}</td>
                                <td style="font-weight: 600;">${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>${idx === 0 ? (sale.soldBy || 'Unknown') : ''}</td>
                                <td>${idx === 0 ? (sale.paymentMethod || 'Cash') : ''}</td>
                                <td style="color: var(--color-success); font-weight: 600;">${formatCurrency(item.price * item.quantity)}</td>
                                <td style="color: ${profitColor}; font-weight: 600;">${formatCurrency(itemProfit)}</td>
                            </tr>
                        `;
                        })
                    ).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    showPreview('Sales Report', preview);
}

function showAddExpenseModal() {
    const modal = document.getElementById('expenseModal');
    if (modal) {
        modal.classList.add('active');
        console.log('✅ Add expense modal opened successfully');
    } else {
        console.error('❌ Expense modal not found - redirecting to expenses page');
        window.location.href = 'expenses.html';
    }
}

function showTopUpModal() {
    const modal = document.getElementById('topUpModal');
    if (modal) {
        modal.classList.add('active');
        console.log('✅ Top up modal opened successfully');
    } else {
        console.error('❌ Top up modal not found - redirecting to wallet page');
        window.location.href = 'wallet.html';
    }
}

function showWithdrawModal() {
    const modal = document.getElementById('withdrawModal');
    if (modal) {
        modal.classList.add('active');
        console.log('✅ Withdraw modal opened successfully');
    } else {
        console.error('❌ Withdraw modal not found - redirecting to wallet page');
        window.location.href = 'wallet.html';
    }
}

function closeTopUpModal() {
    const modal = document.getElementById('topUpModal');
    const form = document.getElementById('topUpForm');
    if (modal) {
        modal.classList.remove('active');
        if (form) form.reset();
        console.log('✅ Top up modal closed successfully');
    }
}

function closeWithdrawModal() {
    const modal = document.getElementById('withdrawModal');
    const form = document.getElementById('withdrawForm');
    if (modal) {
        modal.classList.remove('active');
        if (form) form.reset();
        console.log('✅ Withdraw modal closed successfully');
    }
}

function closeExpenseModal() {
    const modal = document.getElementById('expenseModal');
    const form = document.getElementById('expenseForm');
    if (modal) {
        modal.classList.remove('active');
        if (form) form.reset();
        console.log('✅ Expense modal closed successfully');
    }
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.remove('active');
        console.log('✅ Product modal closed successfully');
    }
}

function closeItemModal() {
    const modal = document.getElementById('itemModal');
    const form = document.getElementById('itemForm');
    if (modal) {
        modal.classList.remove('active');
        if (form) form.reset();
        editingItemId = null;
        console.log('✅ Item modal closed successfully');
    }
}

// ==================== DATA LOADING FUNCTIONS ====================
// These functions load data into page elements and are used across multiple pages

function loadWalletData() {
    // Check if we're on wallet page
    if (window.location.pathname.includes('wallet.html')) {
        const walletBalance = document.getElementById('walletBalance');
        if (walletBalance) {
            walletBalance.textContent = formatCurrency(AppData.wallet.balance);
            loadTransactions();
        }
    }
}

function loadTransactions() {
    // Check if we're on wallet page
    if (window.location.pathname.includes('wallet.html')) {
        const list = document.getElementById('transactionList');
        const empty = document.getElementById('emptyTransactions');
        
        if (list) {
            const transactions = AppData.wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            if (transactions.length === 0) {
                list.innerHTML = '';
                if (empty) empty.style.display = 'flex';
            } else {
                if (empty) empty.style.display = 'none';
                list.innerHTML = transactions.map(t => {
                    const isIncome = t.amount > 0;
                    const icon = isIncome ? 'arrow-down-circle' : 'arrow-up-circle';
                    return `
                        <div class="transaction-item">
                            <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
                                <i data-lucide="${icon}"></i>
                            </div>
                            <div class="transaction-details">
                                <div class="transaction-type">${t.description}</div>
                                <div class="transaction-date">${new Date(t.date).toLocaleString()}</div>
                            </div>
                            <div class="transaction-amount ${isIncome ? 'positive' : 'negative'}">
                                ${isIncome ? '+' : ''}${formatCurrency(Math.abs(t.amount))}
                            </div>
                        </div>
                    `;
                }).join('');
            }
            refreshIcons();
        }
    }
}

function loadExpensesData() {
    // Check if we're on expenses page
    if (window.location.pathname.includes('expenses.html')) {
        const total = AppData.expenses.reduce((sum, e) => sum + e.amount, 0);
        const today = new Date().toDateString();
        const todayTotal = AppData.expenses.filter(e => new Date(e.date).toDateString() === today).reduce((sum, e) => sum + e.amount, 0);
        const month = new Date().getMonth();
        const monthTotal = AppData.expenses.filter(e => new Date(e.date).getMonth() === month).reduce((sum, e) => sum + e.amount, 0);
        
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateElement('totalExpenses', formatCurrency(total));
        updateElement('monthExpenses', formatCurrency(monthTotal));
        updateElement('todayExpenses', formatCurrency(todayTotal));
        updateElement('expenseCount', AppData.expenses.length);
        updateElement('monthName', new Date().toLocaleDateString('en-US', { month: 'long' }));
        
        // Call loadExpenseList if it exists
        if (typeof loadExpenseList === 'function') {
            loadExpenseList();
        }
    }
}

function loadSalesData() {
    // Check if we're on sales page
    if (window.location.pathname.includes('sales.html')) {
        const stats = getDashboardStats();
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateElement('todaySales', formatCurrency(stats.dailySales.total));
        updateElement('todayTransactions', stats.dailySales.count);
        updateElement('todayProfit', formatCurrency(stats.dailySales.profit));
        updateElement('itemsSold', calculateItemsSold());
        updateElement('todayDate', new Date().toLocaleDateString());
    }
}

function loadInventoryData() {
    // Check if we're on inventory page
    if (window.location.pathname.includes('Inventory.html')) {
        const stats = getDashboardStats();
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateElement('totalItems', AppData.inventory.length);
        updateElement('totalValue', formatCurrency(stats.totalInventoryValue));
        updateElement('lowStockItems', stats.lowStockCount);
        updateElement('potentialProfit', formatCurrency(
            AppData.inventory.reduce((sum, item) => sum + item.netProfit, 0)
        ));
        
        // Call loadInventoryTable if it exists
        if (typeof loadInventoryTable === 'function') {
            loadInventoryTable();
        }
    }
}

// ==================== DELETE AND EDIT FUNCTIONS ====================
// These functions handle delete and edit operations across pages

function deleteExpenseItem(id) {
    // Check if we're on expenses page
    if (window.location.pathname.includes('expenses.html')) {
        if (!confirm('Delete this expense? Amount will be refunded to wallet.')) return;
        const result = deleteExpense(id);
        if (result.success) {
            showToast(result.message, 'success');
            loadExpensesData();
        } else {
            showToast(result.message, 'error');
        }
    }
}

function deleteTransaction(id) {
    // Check if we're on transaction history page
    if (window.location.pathname.includes('transaction_history.html')) {
        if (!confirm('Delete this transaction? Stock will be returned.')) return;
        const result = deleteSale(id);
        if (result.success) {
            showToast(result.message, 'success');
            // Call loadTransactions if it exists
            if (typeof loadTransactions === 'function') {
                loadTransactions();
            }
        } else {
            showToast(result.message, 'error');
        }
    }
}

function editItem(id) {
    // Check if we're on inventory page
    if (window.location.pathname.includes('Inventory.html')) {
        const isWorker = AppData.user && AppData.user.role === 'worker';
        if (isWorker) {
            showToast('You do not have permission to edit items', 'error');
            return;
        }
        
        const item = AppData.inventory.find(i => i.id === id);
        if (!item) return;
        
        editingItemId = id;
        
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        };
        
        updateElement('modalTitle', 'Edit Item');
        updateElement('submitBtnText', 'Update Item');
        updateElement('itemId', id);
        updateElement('itemName', item.name);
        updateElement('itemQuantity', item.quantity);
        updateElement('itemBuyingPrice', item.buyingPrice);
        updateElement('itemSellingPrice', item.sellingPrice);
        updateElement('lowStockThreshold', item.lowStockThreshold || 10);
        
        // Call calculateProfits if it exists
        if (typeof calculateProfits === 'function') {
            calculateProfits();
        }
        
        const modal = document.getElementById('itemModal');
        if (modal) {
            modal.classList.add('active');
        }
    }
}

function deleteItem(id) {
    // Check if we're on inventory page
    if (window.location.pathname.includes('Inventory.html')) {
        const isWorker = AppData.user && AppData.user.role === 'worker';
        if (isWorker) {
            showToast('You do not have permission to delete items', 'error');
            return;
        }
        
        if (!confirm('Delete this item? This action cannot be undone.')) return;
        
        const result = deleteInventoryItem(id);
        if (result.success) {
            showToast(result.message, 'success');
            // Call loadInventoryData if it exists
            if (typeof loadInventoryData === 'function') {
                loadInventoryData();
            }
        } else {
            showToast(result.message, 'error');
        }
    }
}

// ==================== SETTINGS PAGE FUNCTIONS ====================
// These functions handle settings page operations

function loadSettings() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        };
        
        updateElement('businessName', AppData.settings.businessName);
        updateElement('themeSelect', AppData.settings.theme);
        
        // Call loadSessions if it exists
        if (typeof loadSessions === 'function') {
            loadSessions();
        }
    }
}

function loadSessions() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const sessionsList = document.getElementById('sessionsList');
        if (!AppData.user.sessions || AppData.user.sessions.length === 0) {
            if (sessionsList) {
                sessionsList.innerHTML = '<p style="color: var(--text-secondary);">No active sessions</p>';
            }
        } else {
            if (sessionsList) {
                sessionsList.innerHTML = AppData.user.sessions.map(session => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-sm); border: 1px solid var(--border-color); border-radius: var(--border-radius); margin-bottom: var(--spacing-sm);">
                        <div>
                            <div style="font-weight: 600; color: var(--text-primary);">${session.location}</div>
                            <div style="font-size: var(--text-sm); color: var(--text-secondary);">Last active: ${new Date(session.lastActivity).toLocaleString()}</div>
                        </div>
                        <button class="action-btn danger" onclick="logoutSession('${session.id}')" style="padding: 0.25rem 0.5rem;">
                            <i data-lucide="log-out"></i>
                        </button>
                    </div>
                `).join('');
            }
        }
        
        refreshIcons();
    }
}

function logoutSession(sessionId) {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        if (AppData.user.sessions) {
            AppData.user.sessions = AppData.user.sessions.filter(s => s.id !== sessionId);
            saveData();
            
            // Call loadSessions if it exists
            if (typeof loadSessions === 'function') {
                loadSessions();
            }
            
            showToast('Session terminated', 'success');
        }
    }
}

function showChangePasswordModal() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const modal = document.getElementById('changePasswordModal');
        if (modal) {
            modal.classList.add('active');
        }
    }
}

function closeChangePasswordModal() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const modal = document.getElementById('changePasswordModal');
        const form = document.getElementById('changePasswordForm');
        if (modal) {
            modal.classList.remove('active');
            if (form) form.reset();
        }
    }
}

function exportData() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        try {
            // Create a backup of all data
            const backup = {
                user: AppData.user,
                users: AppData.users,
                inventory: AppData.inventory,
                sales: AppData.sales,
                expenses: AppData.expenses,
                wallet: AppData.wallet,
                settings: AppData.settings,
                notifications: AppData.notifications,
                exportDate: new Date().toISOString()
            };
            
            const dataStr = JSON.stringify(backup, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pos_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('Data exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showToast('Failed to export data', 'error');
        }
    }
}

function importData(event) {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate imported data
                if (importedData.user) AppData.user = importedData.user;
                if (importedData.users) AppData.users = importedData.users || [];
                if (importedData.inventory) AppData.inventory = importedData.inventory || [];
                if (importedData.sales) AppData.sales = importedData.sales || [];
                if (importedData.expenses) AppData.expenses = importedData.expenses || [];
                if (importedData.wallet) AppData.wallet = importedData.wallet || { balance: 0, transactions: [] };
                if (importedData.settings) AppData.settings = { ...AppData.settings, ...importedData.settings };
                if (importedData.notifications) AppData.notifications = importedData.notifications || [];
                
                saveData();
                showToast('Data imported successfully', 'success');
                
                // Reload page to show updated data
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                console.error('Import error:', error);
                showToast('Failed to import data', 'error');
            }
        };
        reader.readAsText(file);
    }
}

function logoutAllDevices() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        if (!confirm('Logout from all devices? You will need to login again.')) return;
        AppData.user.sessions = [];
        localStorage.removeItem('currentSession');
        saveData();
        showToast('Logged out from all devices', 'success');
        setTimeout(() => window.location.href = '../index.html', 1000);
    }
}

function confirmEraseData() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        if (!confirm('Erase ALL data? This cannot be undone!')) return;
        if (!confirm('Are you absolutely sure? All sales, inventory, and transactions will be deleted!')) return;
        const result = eraseAllData();
        if (result.success) {
            showToast(result.message, 'success');
            setTimeout(() => window.location.reload(), 1000);
        }
    }
}

function confirmDeleteAccount() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        if (!confirm('Delete your account? This will erase everything and cannot be undone!')) return;
        if (!confirm('Are you absolutely sure? This action is permanent!')) return;
        deleteAccount();
    }
}

function showAbout() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const modalTitle = document.getElementById('infoModalTitle');
        const modalContent = document.getElementById('infoModalContent');
        
        if (modalTitle && modalContent) {
            modalTitle.innerHTML = '<i data-lucide="info" class="title-icon"></i>About';
            modalContent.innerHTML = `
                <div style="text-align: center; margin-bottom: 30px;">
                    <h3 style="color: var(--color-primary); margin-bottom: 15px;">International Dealers ZM POS System</h3>
                    <p style="color: var(--text-secondary); line-height: 1.6;">Version: 1.0.0</p>
                    <p style="color: var(--text-secondary); line-height: 1.6;">© 2024 International Dealers ZM. All rights reserved.</p>
                    <p style="color: var(--text-secondary); line-height: 1.6;">Professional Point of Sale System with offline support, inventory management, sales tracking, and comprehensive reporting.</p>
                </div>
            `;
            
            const modal = document.getElementById('infoModal');
            if (modal) {
                modal.classList.add('active');
            }
            
            refreshIcons();
        }
    }
}

function showPrivacyPolicy() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const modalTitle = document.getElementById('infoModalTitle');
        const modalContent = document.getElementById('infoModalContent');
        
        if (modalTitle && modalContent) {
            modalTitle.innerHTML = '<i data-lucide="shield-check" class="title-icon"></i>Privacy Policy';
            modalContent.innerHTML = `
                <div style="text-align: center; margin-bottom: 25px;">
                    <h3 style="color: var(--color-primary); margin-bottom: 15px;">Privacy Policy</h3>
                    <div style="text-align: left; color: var(--text-secondary); line-height: 1.6;">
                        <p><strong>Data Collection:</strong> We collect only the data necessary for the POS system to function, including user information, inventory data, sales records, and system settings.</p>
                        <p><strong>Data Usage:</strong> Your data is stored locally in your browser and is not shared with third parties without your consent.</p>
                        <p><strong>Data Security:</strong> All data is encrypted and stored securely. We implement industry-standard security measures.</p>
                        <p><strong>Data Retention:</strong> You can export or delete your data at any time through the settings page.</p>
                    </div>
                </div>
            `;
            
            const modal = document.getElementById('infoModal');
            if (modal) {
                modal.classList.add('active');
            }
            
            refreshIcons();
        }
    }
}

function showTermsOfService() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const modalTitle = document.getElementById('infoModalTitle');
        const modalContent = document.getElementById('infoModalContent');
        
        if (modalTitle && modalContent) {
            modalTitle.innerHTML = '<i data-lucide="file-text" class="title-icon"></i>Terms of Service';
            modalContent.innerHTML = `
                <div style="text-align: center; margin-bottom: 25px;">
                    <h3 style="color: var(--color-primary); margin-bottom: 15px;">Terms of Service</h3>
                    <div style="text-align: left; color: var(--text-secondary); line-height: 1.6;">
                        <p><strong>Acceptance of Terms:</strong> By using this POS system, you agree to these terms and conditions.</p>
                        <p><strong>Usage Guidelines:</strong> Use this system for legitimate business purposes only. You are responsible for the accuracy of your data.</p>
                        <p><strong>Data Ownership:</strong> You retain full ownership of your data. We do not claim ownership of your business information.</p>
                        <p><strong>System Availability:</strong> While we strive for 100% uptime, we cannot guarantee uninterrupted service.</p>
                        <p><strong>Limitation of Liability:</strong> We are not liable for any business losses incurred while using this system.</p>
                        <p><strong>Termination:</strong> You may stop using this service at any time and can request data deletion.</p>
                    </div>
                </div>
            `;
            
            const modal = document.getElementById('infoModal');
            if (modal) {
                modal.classList.add('active');
            }
            
            refreshIcons();
        }
    }
}

function closeInfoModal() {
    // Check if we're on settings page
    if (window.location.pathname.includes('settings.html')) {
        const modal = document.getElementById('infoModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
}

// ==================== GLOBAL INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    if (typeof initTheme === 'function') {
        initTheme();
    }
    
    // Load components if on dashboard pages
    if (document.getElementById('sidebarContainer')) {
        initializeComponents();
        
        // Initialize SPA navigation after components load
        setTimeout(() => {
            initializeSPANavigation();
        }, 150);
    }
    
    // Initialize icons
    refreshIcons();
});

// Make functions globally available
window.AppData = AppData;
window.saveData = saveData;
window.loadData = loadData;
window.formatCurrency = formatCurrency;
window.isLoggedIn = isLoggedIn;
window.login = login;
window.createAccount = createAccount;
window.logout = logout;
window.deleteAccount = deleteAccount;
window.eraseAllData = eraseAllData;
window.addInventoryItem = addInventoryItem;
window.updateInventoryItem = updateInventoryItem;
window.deleteInventoryItem = deleteInventoryItem;
window.recordSale = recordSale;
window.deleteSale = deleteSale;
window.addExpense = addExpense;
window.deleteExpense = deleteExpense;
window.topUpWallet = topUpWallet;
window.withdrawFromWallet = withdrawFromWallet;
window.getAllUsers = getAllUsers;
window.addUser = addUser;
window.updateUser = updateUser;
window.deleteUser = deleteUser;
window.getDashboardStats = getDashboardStats;
window.checkAndResetDailySales = checkAndResetDailySales;
window.showToast = showToast;
window.refreshIcons = refreshIcons;
window.updateTopbarProfile = updateTopbarProfile;
window.generateId = generateId;
// Export functions to global scope for HTML onclick handlers - CLEAN VERSION
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.showProductModal = showProductModal;
window.showAddItemModal = showAddItemModal;
window.previewSalesReport = previewSalesReport;
window.previewExpenseReport = previewExpenseReport;
window.previewInventoryReport = previewInventoryReport;
window.downloadCurrentReport = downloadCurrentReport;
window.showAddExpenseModal = showAddExpenseModal;
window.showTopUpModal = showTopUpModal;
window.showWithdrawModal = showWithdrawModal;
window.closeTopUpModal = closeTopUpModal;
window.closeWithdrawModal = closeWithdrawModal;
window.closeExpenseModal = closeExpenseModal;
window.closeProductModal = closeProductModal;
window.closeItemModal = closeItemModal;
window.markNotificationAsRead = markNotificationAsRead;
window.deleteNotification = deleteNotification;
window.loadWalletData = loadWalletData;
window.loadTransactions = loadTransactions;
window.loadExpensesData = loadExpensesData;
window.loadSalesData = loadSalesData;
window.loadInventoryData = loadInventoryData;
window.deleteExpenseItem = deleteExpenseItem;
window.deleteTransaction = deleteTransaction;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.loadSettings = loadSettings;
window.loadSessions = loadSessions;
window.logoutSession = logoutSession;
window.showChangePasswordModal = showChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.exportData = exportData;
window.importData = importData;
window.logoutAllDevices = logoutAllDevices;
window.confirmEraseData = confirmEraseData;
window.confirmDeleteAccount = confirmDeleteAccount;
window.showAbout = showAbout;
window.showPrivacyPolicy = showPrivacyPolicy;
window.showTermsOfService = showTermsOfService;
window.closeInfoModal = closeInfoModal;

console.log('✅ Main.js loaded - All frontend logic centralized');
// ==================== PROFILE PAGE FUNCTIONS ====================
// Functions for profile.html page

function loadProfile() {
    if (!window.location.pathname.includes('profile.html')) return;
    
    document.getElementById('profileName').value = AppData.user.name;
    document.getElementById('profileEmail').value = AppData.user.email;
    document.getElementById('profileDOB').value = AppData.user.dateOfBirth || '';
    document.getElementById('memberSince').value = new Date(AppData.user.createdAt).toLocaleDateString();
    
    if (AppData.user.profilePicture) {
        document.getElementById('profileImg').src = AppData.user.profilePicture;
        document.getElementById('profileImg').style.display = 'block';
        document.getElementById('profilePlaceholderIcon').style.display = 'none';
        document.getElementById('deletePictureBtn').style.display = 'flex';
    } else {
        document.getElementById('profileImg').style.display = 'none';
        document.getElementById('profilePlaceholderIcon').style.display = 'block';
        document.getElementById('deletePictureBtn').style.display = 'none';
    }
}

function deleteProfilePicture() {
    if (!window.location.pathname.includes('profile.html')) return;
    
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    
    AppData.user.profilePicture = null;
    saveData();
    
    document.getElementById('profileImg').src = '';
    document.getElementById('profileImg').style.display = 'none';
    document.getElementById('profilePlaceholderIcon').style.display = 'block';
    document.getElementById('deletePictureBtn').style.display = 'none';
    
    // Update topbar profile picture
    if (typeof updateTopbarProfile === 'function') {
        updateTopbarProfile();
    }
    
    showToast('Profile picture removed', 'success');
    lucide.createIcons();
}

// ==================== TRANSACTION HISTORY PAGE FUNCTIONS ====================
// Functions for transaction_history.html page

let transactionCurrentPage = 1;
const transactionItemsPerPage = 10;
let allTransactions = [];

function loadTransactionHistory() {
    if (!window.location.pathname.includes('transaction_history.html')) return;
    
    const searchTerm = document.getElementById('searchTransaction')?.value.toLowerCase() || '';
    const filterType = document.getElementById('filterType')?.value || 'all';
    const filterDate = document.getElementById('filterDate')?.value || 'all';
    
    // Get date range based on filter
    const now = new Date();
    let startDate = null;
    
    switch(filterDate) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
    }
    
    // Filter and sort transactions (newest first)
    allTransactions = AppData.transactions.filter(t => {
        const matchesSearch = t.items.some(item => item.name.toLowerCase().includes(searchTerm));
        const matchesFilter = filterType === 'all' || t.type === filterType;
        const transactionDate = new Date(t.date);
        const matchesDate = !startDate || transactionDate >= startDate;
        return matchesSearch && matchesFilter && matchesDate;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    transactionCurrentPage = 1; // Reset to first page on new search
    displayTransactionHistory();
}

function displayTransactionHistory() {
    if (!window.location.pathname.includes('transaction_history.html')) return;
    
    const list = document.getElementById('transactionList');
    const empty = document.getElementById('emptyTransactions');
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (allTransactions.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'flex';
        paginationContainer.style.display = 'none';
        return;
    }
    
    empty.style.display = 'none';
    
    // Calculate pagination
    const totalPages = Math.ceil(allTransactions.length / transactionItemsPerPage);
    const startIndex = (transactionCurrentPage - 1) * transactionItemsPerPage;
    const endIndex = Math.min(startIndex + transactionItemsPerPage, allTransactions.length);
    const paginatedTransactions = allTransactions.slice(startIndex, endIndex);
    
    // Display transactions
    list.innerHTML = paginatedTransactions.map(t => {
        const isProfit = t.profit >= 0;
        const amountColor = isProfit ? 'positive' : 'negative';
        const amountSign = isProfit ? '+' : '';
        
        return `
        <div class="transaction-item">
            <div class="transaction-icon income">
                <i data-lucide="shopping-cart"></i>
            </div>
            <div class="transaction-details">
                <div class="transaction-type">
                    ${t.items.map(item => `${item.name} (${item.quantity})`).join(', ')}
                </div>
                <div class="transaction-date">${new Date(t.date).toLocaleString()}</div>
                <div style="display: flex; gap: var(--spacing-md); margin-top: var(--spacing-xs); font-size: var(--text-sm); color: var(--text-secondary); flex-wrap: wrap;">
                    <span><i data-lucide="user" style="width: 14px; height: 14px;"></i> ${t.soldBy || 'Unknown'}${t.soldByRole ? ` (${t.soldByRole})` : ''}</span>
                    <span><i data-lucide="credit-card" style="width: 14px; height: 14px;"></i> ${t.paymentMethod || 'Cash'}</span>
                </div>
            </div>
            <div class="transaction-amount ${amountColor}">${amountSign}${formatCurrency(t.amount)}</div>
            <button class="table-btn delete" onclick="deleteTransaction('${t.id}')" title="Delete">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
    `;
    }).join('');
    
    // Update pagination info
    document.getElementById('showingStart').textContent = startIndex + 1;
    document.getElementById('showingEnd').textContent = endIndex;
    document.getElementById('totalItems').textContent = allTransactions.length;
    
    // Show/hide pagination
    if (allTransactions.length > transactionItemsPerPage) {
        paginationContainer.style.display = 'flex';
        updateTransactionPaginationButtons(totalPages);
    } else {
        paginationContainer.style.display = 'none';
    }
    
    lucide.createIcons();
}

function updateTransactionPaginationButtons(totalPages) {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageNumbers = document.getElementById('pageNumbers');
    
    // Disable/enable prev/next buttons
    prevBtn.disabled = transactionCurrentPage === 1;
    nextBtn.disabled = transactionCurrentPage === totalPages;
    prevBtn.style.opacity = transactionCurrentPage === 1 ? '0.5' : '1';
    prevBtn.style.cursor = transactionCurrentPage === 1 ? 'not-allowed' : 'pointer';
    nextBtn.style.opacity = transactionCurrentPage === totalPages ? '0.5' : '1';
    nextBtn.style.cursor = transactionCurrentPage === totalPages ? 'not-allowed' : 'pointer';
    
    // Generate page numbers
    pageNumbers.innerHTML = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, transactionCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'action-btn secondary';
        pageBtn.style.padding = '0.5rem 1rem';
        pageBtn.style.minWidth = '40px';
        pageBtn.textContent = i;
        
        if (i === transactionCurrentPage) {
            pageBtn.style.background = 'var(--color-primary)';
            pageBtn.style.color = '#0a0e1a';
            pageBtn.style.fontWeight = '700';
        }
        
        pageBtn.onclick = () => goToTransactionPage(i);
        pageNumbers.appendChild(pageBtn);
    }
}

function changeTransactionPage(direction) {
    const totalPages = Math.ceil(allTransactions.length / transactionItemsPerPage);
    const newPage = transactionCurrentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        transactionCurrentPage = newPage;
        displayTransactionHistory();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function goToTransactionPage(page) {
    transactionCurrentPage = page;
    displayTransactionHistory();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== MANAGE USERS PAGE FUNCTIONS ====================
// Functions for manage-users.html page

let usersCurrentPage = 1;
let usersPageSize = 25;
let usersFilteredItems = [];

function loadUserStats() {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    const users = getAllUsers();
    const admins = users.filter(u => u.role === 'admin');
    const workers = users.filter(u => u.role === 'worker');
    const active = users.filter(u => u.status === 'active');
    
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('totalAdmins').textContent = admins.length;
    document.getElementById('totalWorkers').textContent = workers.length;
    document.getElementById('activeUsers').textContent = active.length;
}

function loadUsersTable() {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    console.log('Loading users table...');
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('emptyUsers');
    const paginationContainer = document.getElementById('usersPagination');
    
    if (!tbody) {
        console.error('Users table body not found');
        return;
    }
    
    const searchTerm = document.getElementById('searchUsers')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('filterRole')?.value || 'all';
    const statusFilter = document.getElementById('filterStatus')?.value || 'all';
    
    usersFilteredItems = getAllUsers().filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm) || 
                            user.email.toLowerCase().includes(searchTerm);
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
    });
    
    console.log('Filtered users:', usersFilteredItems.length);
    
    if (usersFilteredItems.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'flex';
        paginationContainer.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        
        // Calculate pagination
        const totalPages = Math.ceil(usersFilteredItems.length / usersPageSize);
        if (usersCurrentPage > totalPages) usersCurrentPage = totalPages;
        if (usersCurrentPage < 1) usersCurrentPage = 1;
        
        const startIndex = (usersCurrentPage - 1) * usersPageSize;
        const endIndex = Math.min(startIndex + usersPageSize, usersFilteredItems.length);
        const pageUsers = usersFilteredItems.slice(startIndex, endIndex);
        
        tbody.innerHTML = pageUsers.map(user => {
            const isCurrentUser = user.email === AppData.user.email;
            const statusClass = user.status === 'active' ? 'success' : 'warning';
            const roleClass = user.role === 'admin' ? 'primary' : 'secondary';
            
            // Capitalize each word in name
            const capitalizedName = user.name.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
            
            // Capitalize role
            const capitalizedRole = user.role.charAt(0).toUpperCase() + user.role.slice(1);
            
            // Capitalize status
            const capitalizedStatus = user.status.charAt(0).toUpperCase() + user.status.slice(1);
            
            // User icon based on role
            const userIcon = user.role === 'admin' ? 'shield-check' : 'user';
            
            return `
                <tr>
                    <td style="font-weight: 600;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i data-lucide="${userIcon}" style="width: 18px; height: 18px; color: var(--primary);"></i>
                            <span>${capitalizedName}</span>
                            ${isCurrentUser ? '<span class="badge primary" style="font-size: 0.7rem; margin-left: 0.5rem;">You</span>' : ''}
                        </div>
                    </td>
                    <td>${user.email}</td>
                    <td>${user.contact}</td>
                    <td><span class="badge ${roleClass}">${capitalizedRole}</span></td>
                    <td><span class="badge ${statusClass}">${capitalizedStatus}</span></td>
                    <td>
                        <div class="table-actions">
                            <button class="table-btn edit" onclick="openEditUserModal('${user.id}')" title="Edit">
                                <i data-lucide="edit-2"></i>
                            </button>
                            ${!isCurrentUser ? `
                                <button class="table-btn delete" onclick="handleDeleteUser('${user.id}')" title="Delete">
                                    <i data-lucide="trash-2"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Update pagination UI
        if (usersFilteredItems.length > usersPageSize) {
            paginationContainer.style.display = 'flex';
            document.getElementById('usersShowingStart').textContent = startIndex + 1;
            document.getElementById('usersShowingEnd').textContent = endIndex;
            document.getElementById('usersTotal').textContent = usersFilteredItems.length;
            document.getElementById('usersCurrentPage').textContent = usersCurrentPage;
            document.getElementById('usersTotalPages').textContent = totalPages;
            
            document.getElementById('usersFirstBtn').disabled = usersCurrentPage === 1;
            document.getElementById('usersPrevBtn').disabled = usersCurrentPage === 1;
            document.getElementById('usersNextBtn').disabled = usersCurrentPage === totalPages;
            document.getElementById('usersLastBtn').disabled = usersCurrentPage === totalPages;
        } else {
            paginationContainer.style.display = 'none';
        }
    }
    
    // Reinitialize icons
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

function openAddUserModal() {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    console.log('Opening Add User modal');
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.classList.add('active');
        
        setTimeout(() => {
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
        }, 100);
    } else {
        console.error('Add User modal not found');
    }
}

function closeAddUserModal() {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('addUserForm').reset();
    }
}

function openEditUserModal(userId) {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    const user = AppData.users.find(u => u.id === userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }
    
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserContact').value = user.contact;
    document.getElementById('editUserRole').value = user.role;
    document.getElementById('editUserStatus').value = user.status;
    document.getElementById('editUserPassword').value = '';
    
    const modal = document.getElementById('editUserModal');
    if (modal) {
        modal.classList.add('active');
        
        setTimeout(() => {
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
        }, 100);
    }
}

function closeEditUserModal() {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    const modal = document.getElementById('editUserModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('editUserForm').reset();
    }
}

function handleAddUser(e) {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    e.preventDefault();
    console.log('Handling add user form submission');
    
    const userData = {
        name: document.getElementById('userName').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        contact: document.getElementById('userContact').value.trim(),
        role: document.getElementById('userRole').value,
        password: document.getElementById('userPassword').value,
        status: document.getElementById('userStatus').value
    };
    
    console.log('Adding user:', userData.email);
    
    const result = addUser(userData);
    
    if (result.success) {
        showToast(result.message, 'success');
        closeAddUserModal();
        loadUserStats();
        loadUsersTable();
    } else {
        showToast(result.message, 'error');
    }
}

function handleEditUser(e) {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    e.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const password = document.getElementById('editUserPassword').value;
    
    const userData = {
        name: document.getElementById('editUserName').value.trim(),
        email: document.getElementById('editUserEmail').value.trim(),
        contact: document.getElementById('editUserContact').value.trim(),
        role: document.getElementById('editUserRole').value,
        status: document.getElementById('editUserStatus').value
    };
    
    // Only update password if provided
    if (password) {
        userData.password = password;
    }
    
    const result = updateUser(userId, userData);
    
    if (result.success) {
        showToast(result.message, 'success');
        closeEditUserModal();
        loadUserStats();
        loadUsersTable();
    } else {
        showToast(result.message, 'error');
    }
}

function handleDeleteUser(userId) {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }
    
    const result = deleteUser(userId);
    
    if (result.success) {
        showToast(result.message, 'success');
        loadUserStats();
        loadUsersTable();
    } else {
        showToast(result.message, 'error');
    }
}

function changeUsersPage(action) {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    const totalPages = Math.ceil(usersFilteredItems.length / usersPageSize);
    
    switch(action) {
        case 'first':
            usersCurrentPage = 1;
            break;
        case 'prev':
            if (usersCurrentPage > 1) usersCurrentPage--;
            break;
        case 'next':
            if (usersCurrentPage < totalPages) usersCurrentPage++;
            break;
        case 'last':
            usersCurrentPage = totalPages;
            break;
    }
    
    loadUsersTable();
}

function changeUsersPageSize() {
    if (!window.location.pathname.includes('manage-users.html')) return;
    
    usersPageSize = parseInt(document.getElementById('usersPageSize').value);
    usersCurrentPage = 1;
    loadUsersTable();
}

// ==================== EXPOSE ALL FUNCTIONS TO GLOBAL SCOPE ====================
// Make all functions globally available for onclick handlers and cross-page access

window.forceIconRefresh = forceIconRefresh;
window.formatDate = formatDate;
window.loadNotifications = loadNotifications;
window.displayNotifications = displayNotifications;
window.updatePaginationButtons = updatePaginationButtons;
window.changePage = changePage;
window.goToPage = goToPage;
window.loadProfile = loadProfile;
window.deleteProfilePicture = deleteProfilePicture;
window.loadTransactionHistory = loadTransactionHistory;
window.displayTransactionHistory = displayTransactionHistory;
window.updateTransactionPaginationButtons = updateTransactionPaginationButtons;
window.changeTransactionPage = changeTransactionPage;
window.goToTransactionPage = goToTransactionPage;
window.loadUserStats = loadUserStats;
window.loadUsersTable = loadUsersTable;
window.openAddUserModal = openAddUserModal;
window.closeAddUserModal = closeAddUserModal;
window.openEditUserModal = openEditUserModal;
window.closeEditUserModal = closeEditUserModal;
window.handleAddUser = handleAddUser;
window.handleEditUser = handleEditUser;
window.handleDeleteUser = handleDeleteUser;
window.changeUsersPage = changeUsersPage;
window.changeUsersPageSize = changeUsersPageSize;

>>>>>>> 875c9d815bdb8f659903bb4f82207f9befaa87ad
console.log('✅ All page functions centralized in main.js - NO MORE STANDALONE FUNCTIONS IN INDIVIDUAL PAGES');