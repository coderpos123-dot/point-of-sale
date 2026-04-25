<<<<<<< HEAD
# Deployment Guide for Vercel

## Project Structure

This project is configured for Vercel with:
- `/api/index.js` - Serverless API functions (handles all /api/* routes)
- `/server.js` - Local development server
- `/vercel.json` - Vercel configuration
- Static files (HTML, CSS, JS, images) served from root directory

## Quick Start

### 1. Prepare Your GitHub Repository

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit - POS System ready for deployment"

# Create main branch
git branch -M main

# Add your GitHub repository as remote
# Replace YOUR_USERNAME and YOUR_REPO_NAME with your actual GitHub details
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

### 2. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. Go to [https://vercel.com](https://vercel.com)
2. Sign up or log in (you can use your GitHub account)
3. Click "Add New Project" or "Import Project"
4. Select your GitHub repository
5. Vercel will automatically detect the configuration from `vercel.json`
6. Click "Deploy"
7. Wait for deployment to complete (usually 1-2 minutes)

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

### 3. Configure Custom Domain

After deployment:

1. Go to your project dashboard on Vercel
2. Click on "Settings" → "Domains"
3. Your project will have a default domain like: `your-project-name.vercel.app`
4. To use a custom subdomain:
   - Enter your desired subdomain (e.g., `internationaldealers`)
   - If available, Vercel will configure it automatically
   - Your app will be accessible at `internationaldealers.vercel.app`

**Note**: If `internationaldealers.vercel.app` is taken, try alternatives:
- `international-dealers-zm.vercel.app`
- `idz-pos-system.vercel.app`
- `idz-pos.vercel.app`

### 4. Verify Deployment

After deployment, test these URLs (replace with your actual domain):

- **Homepage**: `https://your-domain.vercel.app/`
- **API Health Check**: `https://your-domain.vercel.app/api/health`
- **Dashboard**: `https://your-domain.vercel.app/pages/dashboard.html`
- **Settings API**: `https://your-domain.vercel.app/api/settings`

## How It Works

### API Routes
All API routes (`/api/*`) are handled by `/api/index.js` as a serverless function:
- `/api/health` - Health check
- `/api/auth/login` - User login
- `/api/auth/register` - User registration
- `/api/inventory` - Inventory management
- `/api/sales` - Sales tracking
- `/api/expenses` - Expense management
- `/api/wallet` - Wallet operations
- `/api/settings` - Settings management

### Static Files
All other files (HTML, CSS, JS, images) are served directly:
- `/` → `index.html`
- `/pages/dashboard.html` → Dashboard page
- `/assets/*` → Static assets
- `/IDZ-logo.png` → Logo image

## Important Notes

### Data Persistence

⚠️ **Critical**: Vercel serverless functions use `/tmp` storage which is **ephemeral**. Data will be lost:
- Between deployments
- After periods of inactivity
- When functions scale down

**For production use, you MUST use a database:**

#### Recommended Options:

1. **Vercel Postgres** (Recommended for Vercel)
   - Native integration
   - Easy setup
   - Free tier available

2. **MongoDB Atlas** (Popular choice)
   - Free tier: 512MB storage
   - Easy to set up
   - Good for JSON-like data

3. **Supabase** (PostgreSQL + Auth)
   - Free tier available
   - Built-in authentication
   - Real-time features

4. **PlanetScale** (MySQL)
   - Serverless MySQL
   - Free tier available
   - Good performance

### Environment Variables

To add environment variables (e.g., database connection strings):

1. Go to Project Settings → Environment Variables
2. Add variables like:
   - `DATABASE_URL` - Your database connection string
   - `JWT_SECRET` - For authentication tokens
   - `NODE_ENV` - Set to `production`
3. Redeploy for changes to take effect

### Logo Display

- Logo path: `/IDZ-logo.png` (absolute path)
- Ensure `IDZ-logo.png` is in the root directory
- File must be committed to git
- Includes fallback handling if image fails to load

## Local Development

Test locally before deploying:

```bash
# Install dependencies
npm install

# Start local server
npm start

# Visit http://localhost:3000
```

The local server (`server.js`) runs on port 3000 and serves both API and static files.

## Troubleshooting

### API Routes Return 404
- Verify `/api/index.js` exists
- Check `vercel.json` configuration
- Review Vercel deployment logs

### Logo Not Displaying
- Ensure `IDZ-logo.png` is in root directory
- Check file was committed to git: `git ls-files | grep IDZ-logo.png`
- Verify path in HTML is `/IDZ-logo.png`
- Check browser console for 404 errors

### Build Failures
- Ensure all dependencies are in `package.json`
- Check Node.js version (requires >=18.x)
- Review build logs in Vercel dashboard
- Try deploying from CLI: `vercel --debug`

### Data Not Persisting
- This is expected with file-based storage on Vercel
- Implement a database solution (see Data Persistence section)
- For testing, data will reset periodically

### CORS Issues
- API includes CORS middleware
- If issues persist, check Vercel logs
- Verify API routes are prefixed with `/api/`

## Continuous Deployment

Once connected to GitHub, Vercel automatically:
- Deploys on every push to main branch
- Creates preview deployments for pull requests
- Runs builds and checks
- Provides deployment URLs for each commit

## Performance Optimization

The configuration includes:
- Cache headers for static assets (1 year)
- No cache for HTML files (always fresh)
- Serverless function optimization
- Automatic CDN distribution

## Support & Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Vercel Support**: https://vercel.com/support
- **Vercel Community**: https://github.com/vercel/vercel/discussions
- **Node.js on Vercel**: https://vercel.com/docs/functions/serverless-functions/runtimes/node-js

## Next Steps After Deployment

1. ✅ Test all functionality on the deployed URL
2. ✅ Set up a database for data persistence
3. ✅ Configure environment variables
4. ✅ Set up custom domain (if needed)
5. ✅ Enable analytics in Vercel dashboard
6. ✅ Set up monitoring and error tracking
7. ✅ Configure backup strategy for database

## Security Recommendations

1. Add authentication middleware
2. Use environment variables for sensitive data
3. Implement rate limiting
4. Add input validation
5. Use HTTPS only (Vercel provides this automatically)
6. Regularly update dependencies: `npm audit fix`
=======
# Deployment Guide for Vercel

## Project Structure

This project is configured for Vercel with:
- `/api/index.js` - Serverless API functions (handles all /api/* routes)
- `/server.js` - Local development server
- `/vercel.json` - Vercel configuration
- Static files (HTML, CSS, JS, images) served from root directory

## Quick Start

### 1. Prepare Your GitHub Repository

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit - POS System ready for deployment"

# Create main branch
git branch -M main

# Add your GitHub repository as remote
# Replace YOUR_USERNAME and YOUR_REPO_NAME with your actual GitHub details
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

### 2. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. Go to [https://vercel.com](https://vercel.com)
2. Sign up or log in (you can use your GitHub account)
3. Click "Add New Project" or "Import Project"
4. Select your GitHub repository
5. Vercel will automatically detect the configuration from `vercel.json`
6. Click "Deploy"
7. Wait for deployment to complete (usually 1-2 minutes)

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

### 3. Configure Custom Domain

After deployment:

1. Go to your project dashboard on Vercel
2. Click on "Settings" → "Domains"
3. Your project will have a default domain like: `your-project-name.vercel.app`
4. To use a custom subdomain:
   - Enter your desired subdomain (e.g., `internationaldealers`)
   - If available, Vercel will configure it automatically
   - Your app will be accessible at `internationaldealers.vercel.app`

**Note**: If `internationaldealers.vercel.app` is taken, try alternatives:
- `international-dealers-zm.vercel.app`
- `idz-pos-system.vercel.app`
- `idz-pos.vercel.app`

### 4. Verify Deployment

After deployment, test these URLs (replace with your actual domain):

- **Homepage**: `https://your-domain.vercel.app/`
- **API Health Check**: `https://your-domain.vercel.app/api/health`
- **Dashboard**: `https://your-domain.vercel.app/pages/dashboard.html`
- **Settings API**: `https://your-domain.vercel.app/api/settings`

## How It Works

### API Routes
All API routes (`/api/*`) are handled by `/api/index.js` as a serverless function:
- `/api/health` - Health check
- `/api/auth/login` - User login
- `/api/auth/register` - User registration
- `/api/inventory` - Inventory management
- `/api/sales` - Sales tracking
- `/api/expenses` - Expense management
- `/api/wallet` - Wallet operations
- `/api/settings` - Settings management

### Static Files
All other files (HTML, CSS, JS, images) are served directly:
- `/` → `index.html`
- `/pages/dashboard.html` → Dashboard page
- `/assets/*` → Static assets
- `/IDZ-logo.png` → Logo image

## Important Notes

### Data Persistence

⚠️ **Critical**: Vercel serverless functions use `/tmp` storage which is **ephemeral**. Data will be lost:
- Between deployments
- After periods of inactivity
- When functions scale down

**For production use, you MUST use a database:**

#### Recommended Options:

1. **Vercel Postgres** (Recommended for Vercel)
   - Native integration
   - Easy setup
   - Free tier available

2. **MongoDB Atlas** (Popular choice)
   - Free tier: 512MB storage
   - Easy to set up
   - Good for JSON-like data

3. **Supabase** (PostgreSQL + Auth)
   - Free tier available
   - Built-in authentication
   - Real-time features

4. **PlanetScale** (MySQL)
   - Serverless MySQL
   - Free tier available
   - Good performance

### Environment Variables

To add environment variables (e.g., database connection strings):

1. Go to Project Settings → Environment Variables
2. Add variables like:
   - `DATABASE_URL` - Your database connection string
   - `JWT_SECRET` - For authentication tokens
   - `NODE_ENV` - Set to `production`
3. Redeploy for changes to take effect

### Logo Display

- Logo path: `/IDZ-logo.png` (absolute path)
- Ensure `IDZ-logo.png` is in the root directory
- File must be committed to git
- Includes fallback handling if image fails to load

## Local Development

Test locally before deploying:

```bash
# Install dependencies
npm install

# Start local server
npm start

# Visit http://localhost:3000
```

The local server (`server.js`) runs on port 3000 and serves both API and static files.

## Troubleshooting

### API Routes Return 404
- Verify `/api/index.js` exists
- Check `vercel.json` configuration
- Review Vercel deployment logs

### Logo Not Displaying
- Ensure `IDZ-logo.png` is in root directory
- Check file was committed to git: `git ls-files | grep IDZ-logo.png`
- Verify path in HTML is `/IDZ-logo.png`
- Check browser console for 404 errors

### Build Failures
- Ensure all dependencies are in `package.json`
- Check Node.js version (requires >=18.x)
- Review build logs in Vercel dashboard
- Try deploying from CLI: `vercel --debug`

### Data Not Persisting
- This is expected with file-based storage on Vercel
- Implement a database solution (see Data Persistence section)
- For testing, data will reset periodically

### CORS Issues
- API includes CORS middleware
- If issues persist, check Vercel logs
- Verify API routes are prefixed with `/api/`

## Continuous Deployment

Once connected to GitHub, Vercel automatically:
- Deploys on every push to main branch
- Creates preview deployments for pull requests
- Runs builds and checks
- Provides deployment URLs for each commit

## Performance Optimization

The configuration includes:
- Cache headers for static assets (1 year)
- No cache for HTML files (always fresh)
- Serverless function optimization
- Automatic CDN distribution

## Support & Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Vercel Support**: https://vercel.com/support
- **Vercel Community**: https://github.com/vercel/vercel/discussions
- **Node.js on Vercel**: https://vercel.com/docs/functions/serverless-functions/runtimes/node-js

## Next Steps After Deployment

1. ✅ Test all functionality on the deployed URL
2. ✅ Set up a database for data persistence
3. ✅ Configure environment variables
4. ✅ Set up custom domain (if needed)
5. ✅ Enable analytics in Vercel dashboard
6. ✅ Set up monitoring and error tracking
7. ✅ Configure backup strategy for database

## Security Recommendations

1. Add authentication middleware
2. Use environment variables for sensitive data
3. Implement rate limiting
4. Add input validation
5. Use HTTPS only (Vercel provides this automatically)
6. Regularly update dependencies: `npm audit fix`
>>>>>>> 875c9d815bdb8f659903bb4f82207f9befaa87ad
