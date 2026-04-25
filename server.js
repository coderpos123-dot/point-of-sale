const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Use /tmp directory for Vercel serverless functions
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'db');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'International Dealers ZM POS System API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL ? 'vercel' : 'local'
  });
});

// Ensure data directory exists
fs.ensureDirSync(path.dirname(DATA_FILE));

// Initialize default data structure
const defaultData = {
  user: null,
  users: [],
  inventory: [],
  sales: [],
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
  settings: {
    businessName: "International Dealers ZM",
    currency: "ZMW",
    theme: "light",
    lowStockThreshold: 10
  }
};

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readJsonSync(DATA_FILE);
      return { ...defaultData, ...data };
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return defaultData;
}

// Save data to file
function saveData(data) {
  try {
    fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
}

let AppData = loadData();

// ==================== AUTHENTICATION ROUTES ====================

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!AppData.user) {
    return res.status(400).json({ success: false, message: 'No account found' });
  }
  
  // Check main account
  if (AppData.user.email === email && AppData.user.password === password) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      device: req.headers['user-agent'] || 'Unknown',
      location: 'Local Device',
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    
    if (!AppData.user.sessions) AppData.user.sessions = [];
    AppData.user.sessions.push(session);
    
    saveData(AppData);
    
    return res.json({ 
      success: true, 
      message: 'Login successful', 
      user: AppData.user,
      sessionId 
    });
  }
  
  // Check additional users
  const matchedUser = AppData.users.find(u => u.email === email && u.password === password);
  if (matchedUser) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      device: req.headers['user-agent'] || 'Unknown',
      location: 'Local Device',
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    
    if (!matchedUser.sessions) matchedUser.sessions = [];
    matchedUser.sessions.push(session);
    
    AppData.user = matchedUser;
    saveData(AppData);
    
    return res.json({ 
      success: true, 
      message: 'Login successful', 
      user: matchedUser,
      sessionId 
    });
  }
  
  res.status(401).json({ success: false, message: 'Invalid email or password' });
});

// Create account
app.post('/api/auth/register', (req, res) => {
  const { name, email, dateOfBirth, password, securityQuestion, securityAnswer } = req.body;
  
  // Check if account already exists
  if (AppData.user && AppData.user.email === email) {
    return res.status(400).json({ success: false, message: 'Account already exists' });
  }
  
  const existingUser = AppData.users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }
  
  const newUser = {
    id: uuidv4(),
    name,
    email,
    dateOfBirth,
    password,
    securityQuestion,
    securityAnswer,
    role: AppData.user ? 'user' : 'admin',
    createdAt: new Date().toISOString(),
    sessions: []
  };
  
  if (!AppData.user) {
    AppData.user = newUser;
  } else {
    AppData.users.push(newUser);
  }
  
  saveData(AppData);
  
  res.json({ success: true, message: 'Account created successfully' });
});

// ==================== INVENTORY ROUTES ====================

// Get inventory
app.get('/api/inventory', (req, res) => {
  res.json(AppData.inventory);
});

// Add inventory item
app.post('/api/inventory', (req, res) => {
  const { name, buyingPrice, sellingPrice, quantity, category, supplier } = req.body;
  
  const newItem = {
    id: uuidv4(),
    name,
    buyingPrice: parseFloat(buyingPrice),
    sellingPrice: parseFloat(sellingPrice),
    quantity: parseInt(quantity),
    category: category || 'General',
    supplier: supplier || '',
    dateAdded: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
  
  AppData.inventory.push(newItem);
  saveData(AppData);
  
  res.json({ success: true, message: 'Item added successfully', item: newItem });
});

// Update inventory item
app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const itemIndex = AppData.inventory.findIndex(item => item.id === id);
  if (itemIndex === -1) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }
  
  AppData.inventory[itemIndex] = {
    ...AppData.inventory[itemIndex],
    ...updates,
    lastUpdated: new Date().toISOString()
  };
  
  saveData(AppData);
  
  res.json({ success: true, message: 'Item updated successfully' });
});

// Delete inventory item
app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  
  const itemIndex = AppData.inventory.findIndex(item => item.id === id);
  if (itemIndex === -1) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }
  
  AppData.inventory.splice(itemIndex, 1);
  saveData(AppData);
  
  res.json({ success: true, message: 'Item deleted successfully' });
});

// ==================== SALES ROUTES ====================

// Get sales
app.get('/api/sales', (req, res) => {
  res.json(AppData.sales);
});

// Record sale
app.post('/api/sales', (req, res) => {
  const { items, paymentMethod } = req.body;
  
  // Validate stock availability
  for (const cartItem of items) {
    const inventoryItem = AppData.inventory.find(item => item.id === cartItem.id);
    if (!inventoryItem || inventoryItem.quantity < cartItem.quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient stock for ${cartItem.name}` 
      });
    }
  }
  
  // Calculate totals
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const profit = items.reduce((sum, item) => sum + ((item.price - item.buyingPrice) * item.quantity), 0);
  
  // Create sale record
  const sale = {
    id: uuidv4(),
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      buyingPrice: item.buyingPrice,
      total: item.price * item.quantity,
      profit: (item.price - item.buyingPrice) * item.quantity
    })),
    total,
    profit,
    paymentMethod,
    soldBy: AppData.user.name,
    date: new Date().toISOString()
  };
  
  // Update inventory quantities
  items.forEach(cartItem => {
    const inventoryItem = AppData.inventory.find(item => item.id === cartItem.id);
    if (inventoryItem) {
      inventoryItem.quantity -= cartItem.quantity;
      inventoryItem.lastUpdated = new Date().toISOString();
    }
  });
  
  // Add to sales
  AppData.sales.push(sale);
  
  // Update daily sales
  const today = new Date().toDateString();
  if (AppData.dailySales.date !== today) {
    AppData.dailySales = {
      date: today,
      total: 0,
      count: 0,
      profit: 0
    };
  }
  
  AppData.dailySales.total += total;
  AppData.dailySales.count += 1;
  AppData.dailySales.profit += profit;
  
  // Update wallet balance
  AppData.wallet.balance += total;
  AppData.wallet.transactions.push({
    id: uuidv4(),
    type: 'credit',
    amount: total,
    description: `Sale #${sale.id.slice(-8)}`,
    date: new Date().toISOString()
  });
  
  saveData(AppData);
  
  res.json({ success: true, message: 'Sale recorded successfully', sale });
});

// ==================== EXPENSES ROUTES ====================

// Get expenses
app.get('/api/expenses', (req, res) => {
  res.json(AppData.expenses);
});

// Add expense
app.post('/api/expenses', (req, res) => {
  const { description, amount, category } = req.body;
  
  const expense = {
    id: uuidv4(),
    description,
    amount: parseFloat(amount),
    category: category || 'General',
    addedBy: AppData.user.name,
    date: new Date().toISOString()
  };
  
  AppData.expenses.push(expense);
  
  // Update wallet balance
  AppData.wallet.balance -= expense.amount;
  AppData.wallet.transactions.push({
    id: uuidv4(),
    type: 'debit',
    amount: expense.amount,
    description: expense.description,
    date: new Date().toISOString()
  });
  
  saveData(AppData);
  
  res.json({ success: true, message: 'Expense recorded successfully', expense });
});

// ==================== DASHBOARD ROUTES ====================

// Get dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
  // Check and reset daily sales if new day
  const today = new Date().toDateString();
  if (AppData.dailySales.date !== today) {
    AppData.dailySales = {
      date: today,
      total: 0,
      count: 0,
      profit: 0
    };
    saveData(AppData);
  }
  
  const totalInventoryValue = AppData.inventory.reduce((sum, item) => 
    sum + (item.buyingPrice * item.quantity), 0);
  
  const lowStockCount = AppData.inventory.filter(item => 
    item.quantity <= (AppData.settings.lowStockThreshold || 10)).length;
  
  const totalSales = AppData.sales.length;
  
  const totalExpenses = AppData.expenses
    .filter(expense => new Date(expense.date).toDateString() === today)
    .reduce((sum, expense) => sum + expense.amount, 0);
  
  res.json({
    dailySales: AppData.dailySales,
    totalInventoryValue,
    lowStockCount,
    totalSales,
    walletBalance: AppData.wallet.balance,
    totalExpenses
  });
});

// ==================== WALLET ROUTES ====================

// Get wallet info
app.get('/api/wallet', (req, res) => {
  res.json(AppData.wallet);
});

// Add wallet transaction
app.post('/api/wallet/transaction', (req, res) => {
  const { type, amount, description } = req.body;
  
  const transaction = {
    id: uuidv4(),
    type, // 'credit' or 'debit'
    amount: parseFloat(amount),
    description,
    date: new Date().toISOString()
  };
  
  if (type === 'credit') {
    AppData.wallet.balance += transaction.amount;
  } else {
    AppData.wallet.balance -= transaction.amount;
  }
  
  AppData.wallet.transactions.push(transaction);
  saveData(AppData);
  
  res.json({ success: true, message: 'Transaction recorded successfully', transaction });
});

// ==================== SETTINGS ROUTES ====================

// Get settings
app.get('/api/settings', (req, res) => {
  res.json(AppData.settings);
});

// Update settings
app.put('/api/settings', (req, res) => {
  AppData.settings = { ...AppData.settings, ...req.body };
  saveData(AppData);
  
  res.json({ success: true, message: 'Settings updated successfully' });
});

// ==================== DATA EXPORT/IMPORT ====================

// Export all data
app.get('/api/data/export', (req, res) => {
  res.json(AppData);
});

// Import data
app.post('/api/data/import', (req, res) => {
  try {
    AppData = { ...defaultData, ...req.body };
    saveData(AppData);
    res.json({ success: true, message: 'Data imported successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid data format' });
  }
});

// Start server (only in non-Vercel environment)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 POS System Backend running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/pages/dashboard.html`);
    console.log(`💾 Data stored in: ${DATA_FILE}`);
  });
}

module.exports = app;