# International Dealers ZM - POS System

Professional Point of Sale System with Node.js backend and offline support.

## 🚀 Live Demo

After deployment, your app will be available at:
- **Production**: `https://internationaldealerzzm.com` (or your custom domain)
- **Test Page**: `https://your-domain.vercel.app/test-vercel.html`

## ✨ Features

- 📦 **Inventory Management** - Track stock levels in real-time
- 💰 **Sales Tracking** - Monitor sales and revenue
- 💳 **Expense Management** - Record and track expenses
- 👛 **Wallet System** - Manage transactions and balance
- 📊 **Analytics & Reports** - Generate detailed insights
- 📱 **PWA Support** - Works offline as a mobile app
- 👥 **Multi-user Support** - Multiple user accounts with roles
- 🎨 **Dark/Light Theme** - Customizable interface

## 📁 Project Structure

```
point-of-sale/
├── api/
│   └── index.js          # Vercel serverless API functions
├── assets/
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript modules
│   ├── icons/            # PWA icons
│   └── components/       # HTML components
├── pages/                # Application pages
│   ├── dashboard.html
│   ├── inventory.html
│   ├── sales.html
│   └── ...
├── db/                   # Local database (not used on Vercel)
├── server.js             # Local development server
├── index.html            # Login page
├── manifest.json         # PWA manifest
├── service-worker.js     # Service worker for offline support
├── vercel.json           # Vercel configuration
├── package.json          # Dependencies
└── IDZ-logo.png          # Company logo
```

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Storage**: JSON file-based (local) / Serverless (Vercel)
- **PWA**: Service Worker for offline support
- **Deployment**: Vercel

## 📦 Installation & Local Development

### Prerequisites
- Node.js >= 18.x
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Install dependencies
npm install

# Start local development server
npm start

# Visit http://localhost:3000
```

## 🚀 Deployment to Vercel

### Quick Deploy

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Click "Deploy"
   - Done! 🎉

3. **Custom Domain**
   - Go to Project Settings → Domains
   - Add `internationaldealerzzm.com` (or your preferred subdomain)

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

## 🧪 Testing Deployment

After deployment, visit:
- `https://your-domain.vercel.app/test-vercel.html`

This will test:
- ✅ Static file serving
- ✅ Logo loading
- ✅ API health check
- ✅ Settings API

## ⚠️ Important: Data Persistence

**Current Setup**: File-based storage (ephemeral on Vercel)

For production, you need a database. Recommended options:
- **Vercel Postgres** - Native integration
- **MongoDB Atlas** - Free tier available
- **Supabase** - PostgreSQL + Auth
- **PlanetScale** - Serverless MySQL

See [DEPLOYMENT.md](DEPLOYMENT.md) for database setup instructions.

## 🔧 Configuration

### Environment Variables

Create `.env` file for local development:
```env
PORT=3000
NODE_ENV=development
```

For Vercel, add environment variables in Project Settings.

### Vercel Configuration

The `vercel.json` file configures:
- API routes (`/api/*` → `/api/index.js`)
- Static file serving
- Cache headers
- Rewrites and redirects

## 📱 PWA Installation

Users can install the app on their devices:
- **Desktop**: Click install icon in address bar
- **Mobile**: Add to Home Screen from browser menu

## 🎨 Customization

### Logo
Replace `IDZ-logo.png` with your logo (recommended size: 512x512px)

### Theme
Edit `assets/css/styles.css` to customize colors and styling

### Business Name
Update in `api/index.js` defaultData settings:
```javascript
settings: {
  businessName: "Your Business Name",
  currency: "USD",
  // ...
}
```

## 📄 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create account

### Inventory
- `GET /api/inventory` - Get all items
- `POST /api/inventory` - Add item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item

### Sales
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Record sale

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Add expense

### Wallet
- `GET /api/wallet` - Get wallet info
- `POST /api/wallet/transaction` - Add transaction

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

### Utilities
- `GET /api/health` - Health check
- `GET /api/data/export` - Export all data
- `POST /api/data/import` - Import data

## 🐛 Troubleshooting

### Logo not showing
- Ensure `IDZ-logo.png` is in root directory
- Check file is committed to git
- Verify path is `/IDZ-logo.png` (absolute)

### API not working
- Check `/api/index.js` exists
- Verify `vercel.json` configuration
- Review Vercel deployment logs

### Build failures
- Ensure Node.js >= 18.x
- Check all dependencies in `package.json`
- Review build logs in Vercel dashboard

## 📚 Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment guide
- [Vercel Docs](https://vercel.com/docs) - Vercel documentation
- [Express Docs](https://expressjs.com/) - Express.js documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

**International Dealers ZM**

## 🙏 Support

For issues and questions:
- Create an issue on GitHub
- Contact: [your-email@example.com]

---

Made with ❤️ by International Dealers ZM
# International Dealers ZM - POS System

Professional Point of Sale System with Node.js backend and offline support.

## 🚀 Live Demo

After deployment, your app will be available at:
- **Production**: `https://internationaldealerzzm.com` (or your custom domain)
- **Test Page**: `https://your-domain.vercel.app/test-vercel.html`

## ✨ Features

- 📦 **Inventory Management** - Track stock levels in real-time
- 💰 **Sales Tracking** - Monitor sales and revenue
- 💳 **Expense Management** - Record and track expenses
- 👛 **Wallet System** - Manage transactions and balance
- 📊 **Analytics & Reports** - Generate detailed insights
- 📱 **PWA Support** - Works offline as a mobile app
- 👥 **Multi-user Support** - Multiple user accounts with roles
- 🎨 **Dark/Light Theme** - Customizable interface

## 📁 Project Structure

```
point-of-sale/
├── api/
│   └── index.js          # Vercel serverless API functions
├── assets/
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript modules
│   ├── icons/            # PWA icons
│   └── components/       # HTML components
├── pages/                # Application pages
│   ├── dashboard.html
│   ├── inventory.html
│   ├── sales.html
│   └── ...
├── db/                   # Local database (not used on Vercel)
├── server.js             # Local development server
├── index.html            # Login page
├── manifest.json         # PWA manifest
├── service-worker.js     # Service worker for offline support
├── vercel.json           # Vercel configuration
├── package.json          # Dependencies
└── IDZ-logo.png          # Company logo
```

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Storage**: JSON file-based (local) / Serverless (Vercel)
- **PWA**: Service Worker for offline support
- **Deployment**: Vercel

## 📦 Installation & Local Development

### Prerequisites
- Node.js >= 18.x
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Install dependencies
npm install

# Start local development server
npm start

# Visit http://localhost:3000
```

## 🚀 Deployment to Vercel

### Quick Deploy

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Click "Deploy"
   - Done! 🎉

3. **Custom Domain**
   - Go to Project Settings → Domains
   - Add `internationaldealerzzm.com` (or your preferred subdomain)

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

## 🧪 Testing Deployment

After deployment, visit:
- `https://your-domain.vercel.app/test-vercel.html`

This will test:
- ✅ Static file serving
- ✅ Logo loading
- ✅ API health check
- ✅ Settings API

## ⚠️ Important: Data Persistence

**Current Setup**: File-based storage (ephemeral on Vercel)

For production, you need a database. Recommended options:
- **Vercel Postgres** - Native integration
- **MongoDB Atlas** - Free tier available
- **Supabase** - PostgreSQL + Auth
- **PlanetScale** - Serverless MySQL

See [DEPLOYMENT.md](DEPLOYMENT.md) for database setup instructions.

## 🔧 Configuration

### Environment Variables

Create `.env` file for local development:
```env
PORT=3000
NODE_ENV=development
```

For Vercel, add environment variables in Project Settings.

### Vercel Configuration

The `vercel.json` file configures:
- API routes (`/api/*` → `/api/index.js`)
- Static file serving
- Cache headers
- Rewrites and redirects

## 📱 PWA Installation

Users can install the app on their devices:
- **Desktop**: Click install icon in address bar
- **Mobile**: Add to Home Screen from browser menu

## 🎨 Customization

### Logo
Replace `IDZ-logo.png` with your logo (recommended size: 512x512px)

### Theme
Edit `assets/css/styles.css` to customize colors and styling

### Business Name
Update in `api/index.js` defaultData settings:
```javascript
settings: {
  businessName: "Your Business Name",
  currency: "USD",
  // ...
}
```

## 📄 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create account

### Inventory
- `GET /api/inventory` - Get all items
- `POST /api/inventory` - Add item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item

### Sales
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Record sale

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Add expense

### Wallet
- `GET /api/wallet` - Get wallet info
- `POST /api/wallet/transaction` - Add transaction

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

### Utilities
- `GET /api/health` - Health check
- `GET /api/data/export` - Export all data
- `POST /api/data/import` - Import data

## 🐛 Troubleshooting

### Logo not showing
- Ensure `IDZ-logo.png` is in root directory
- Check file is committed to git
- Verify path is `/IDZ-logo.png` (absolute)

### API not working
- Check `/api/index.js` exists
- Verify `vercel.json` configuration
- Review Vercel deployment logs

### Build failures
- Ensure Node.js >= 18.x
- Check all dependencies in `package.json`
- Review build logs in Vercel dashboard

## 📚 Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment guide
- [Vercel Docs](https://vercel.com/docs) - Vercel documentation
- [Express Docs](https://expressjs.com/) - Express.js documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

**International Dealers ZM**

## 🙏 Support

For issues and questions:
- Create an issue on GitHub
- Contact: [your-email@example.com]

---

Made with ❤️ by International Dealers ZM
