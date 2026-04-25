<<<<<<< HEAD
@echo off
echo.
echo ==========================================
echo   International Dealers ZM - POS System
echo   GitHub Setup Script
echo ==========================================
echo.

REM Check if git is initialized
if not exist .git (
    echo [1/5] Initializing git repository...
    git init
    echo       ✓ Git initialized
) else (
    echo [1/5] ✓ Git already initialized
)

REM Add all files
echo.
echo [2/5] Adding files to git...
git add .
echo       ✓ Files staged

REM Commit
echo.
echo [3/5] Creating initial commit...
git commit -m "Initial commit - POS System ready for Vercel deployment"
echo       ✓ Commit created

REM Set main branch
echo.
echo [4/5] Setting main branch...
git branch -M main
echo       ✓ Branch set to main

REM Instructions for remote
echo.
echo [5/5] ✓ Local setup complete!
echo.
echo ==========================================
echo   Next Steps
echo ==========================================
echo.
echo 1. Create a new repository on GitHub:
echo    https://github.com/new
echo.
echo 2. Copy and run these commands:
echo    (Replace YOUR_USERNAME and YOUR_REPO_NAME)
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
echo    git push -u origin main
echo.
echo 3. Deploy to Vercel:
echo    - Go to https://vercel.com/new
echo    - Import your GitHub repository
echo    - Click "Deploy"
echo    - Wait for deployment to complete
echo.
echo 4. Test your deployment:
echo    - Visit: https://your-domain.vercel.app/test-vercel.html
echo.
echo 5. Set custom domain (optional):
echo    - Go to Project Settings -^> Domains
echo    - Add: internationaldealers.vercel.app
echo.
echo ==========================================
echo   Files Created
echo ==========================================
echo.
echo ✓ /api/index.js          - Serverless API
echo ✓ vercel.json            - Vercel config
echo ✓ test-vercel.html       - Deployment test page
echo ✓ README.md              - Documentation
echo ✓ DEPLOYMENT.md          - Deployment guide
echo ✓ .gitignore             - Git ignore rules
echo.
echo ==========================================
echo.
echo For detailed instructions, see DEPLOYMENT.md
echo.
pause
=======
@echo off
echo.
echo ==========================================
echo   International Dealers ZM - POS System
echo   GitHub Setup Script
echo ==========================================
echo.

REM Check if git is initialized
if not exist .git (
    echo [1/5] Initializing git repository...
    git init
    echo       ✓ Git initialized
) else (
    echo [1/5] ✓ Git already initialized
)

REM Add all files
echo.
echo [2/5] Adding files to git...
git add .
echo       ✓ Files staged

REM Commit
echo.
echo [3/5] Creating initial commit...
git commit -m "Initial commit - POS System ready for Vercel deployment"
echo       ✓ Commit created

REM Set main branch
echo.
echo [4/5] Setting main branch...
git branch -M main
echo       ✓ Branch set to main

REM Instructions for remote
echo.
echo [5/5] ✓ Local setup complete!
echo.
echo ==========================================
echo   Next Steps
echo ==========================================
echo.
echo 1. Create a new repository on GitHub:
echo    https://github.com/new
echo.
echo 2. Copy and run these commands:
echo    (Replace YOUR_USERNAME and YOUR_REPO_NAME)
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
echo    git push -u origin main
echo.
echo 3. Deploy to Vercel:
echo    - Go to https://vercel.com/new
echo    - Import your GitHub repository
echo    - Click "Deploy"
echo    - Wait for deployment to complete
echo.
echo 4. Test your deployment:
echo    - Visit: https://your-domain.vercel.app/test-vercel.html
echo.
echo 5. Set custom domain (optional):
echo    - Go to Project Settings -^> Domains
echo    - Add: internationaldealers.vercel.app
echo.
echo ==========================================
echo   Files Created
echo ==========================================
echo.
echo ✓ /api/index.js          - Serverless API
echo ✓ vercel.json            - Vercel config
echo ✓ test-vercel.html       - Deployment test page
echo ✓ README.md              - Documentation
echo ✓ DEPLOYMENT.md          - Deployment guide
echo ✓ .gitignore             - Git ignore rules
echo.
echo ==========================================
echo.
echo For detailed instructions, see DEPLOYMENT.md
echo.
pause
>>>>>>> 875c9d815bdb8f659903bb4f82207f9befaa87ad
