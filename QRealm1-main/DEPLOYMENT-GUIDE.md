# QRealm - Complete Deployment Guide

A comprehensive guide to deploying the QRealm educational platform in a production-like environment.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Prerequisites](#3-prerequisites)
4. [Environment Setup](#4-environment-setup)
5. [Database Configuration](#5-database-configuration)
6. [Backend Deployment](#6-backend-deployment)
7. [Frontend Deployment](#7-frontend-deployment)
8. [Hosting Options](#8-hosting-options)
9. [Post-Deployment Verification](#9-post-deployment-verification)
10. [Feature Testing Guide](#10-feature-testing-guide)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Architecture Overview

QRealm is a full-stack educational platform consisting of:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend       │     │   Database      │
│   (Next.js)     │────▶│   (FastAPI)     │────▶│   (PostgreSQL)  │
│   Port: 3000    │     │   Port: 4000    │     │   Supabase      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Application Flow

1. **Users** interact with the Next.js frontend
2. **Frontend** makes API calls to FastAPI backend
3. **Backend** processes requests and stores data in PostgreSQL
4. **Authentication** uses JWT tokens with optional Firebase integration

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | React framework (App Router) |
| React | 19 | UI library |
| TypeScript | 5.7.3 | Type safety |
| Tailwind CSS | 3.4.17 | CSS framework |
| Axios | 1.14.0 | HTTP client |
| Firebase | 12.11.0 | Authentication |
| Shadcn UI | Latest | Component library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.10+ | Runtime |
| FastAPI | Latest | Web framework |
| SQLAlchemy | Latest | ORM |
| Alembic | Latest | Migrations |
| PostgreSQL | Latest | Database |
| JWT | Latest | Authentication |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Supabase | PostgreSQL database hosting |
| Vercel/Netlify | Frontend hosting |
| Railway/Render | Backend hosting |

---

## 3. Prerequisites

### Required Software

1. **Node.js** (v20 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **Python** (v3.10 or higher)
   - Download: https://www.python.org/
   - Verify: `python --version`

3. **Git**
   - Download: https://git-scm.com/
   - Verify: `git --version`

4. **npm** (comes with Node.js)
   - Verify: `npm --version`

### Required Accounts

1. **Supabase Account** (for database)
   - Sign up: https://supabase.com
   - Create a new project

2. **GitHub Account** (for deployment)
   - Sign up: https://github.com
   - Push code to a repository

---

## 4. Environment Setup

### 4.1 Clone the Repository

```bash
git clone <your-repo-url>
cd QRealm1-main
```

### 4.2 Frontend Environment Variables

Create `.env.local` in the project root:

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api
```

**For local development:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 4.3 Backend Environment Variables

Create `.env` in the `backend/` folder:

```bash
# Backend (.env)

# ===================
# DATABASE
# ===================
# PostgreSQL connection string from Supabase
# IMPORTANT: URL-encode special characters in password (@ → %40)
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_ENCODED_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require

# Connection Pool Settings
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=1800
FORCE_IPV4=true

# ===================
# SERVER
# ===================
ENVIRONMENT=development
PORT=4000

# ===================
# CORS
# ===================
# Add your production frontend URL
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app

# ===================
# JWT AUTHENTICATION
# ===================
# Generate secure keys: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=your-super-secure-secret-key-min-32-chars
JWT_REFRESH_SECRET_KEY=your-super-secure-refresh-key-min-32-chars
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# ===================
# COOKIES
# ===================
# Set to true in production (requires HTTPS)
COOKIE_SECURE=false
COOKIE_SAMESITE=lax

# ===================
# FILE UPLOADS
# ===================
UPLOAD_DIR=./uploads

# ===================
# ADMIN ACCOUNT
# ===================
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecureAdminPassword123!

# ===================
# DEVELOPMENT
# ===================
# OTP for testing (development only)
SAMPLE_OTP=123456
RATE_LIMIT_MAX_ATTEMPTS=5
RATE_LIMIT_WINDOW_MINUTES=15
```

### 4.4 Generate Secure JWT Keys

```bash
# Generate access token secret
python -c "import secrets; print(secrets.token_hex(32))"

# Generate refresh token secret
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 5. Database Configuration

### 5.1 Supabase Setup

1. **Create a Supabase Project**
   - Go to https://supabase.com
   - Click "New Project"
   - Enter project name (e.g., "qrealm-prod")
   - Set a strong database password
   - Choose region closest to your users
   - Click "Create new project"

2. **Get Connection Details**
   - Navigate to: Settings → Database
   - Find "Connection string" section
   - Copy the URI (it looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)

3. **URL-Encode the Password**
   ```python
   # If password is "Qrealm@1pranav", encode it:
   # @ → %40
   # Result: "Qrealm%401pranav"
   
   # Full connection string:
   # postgresql+psycopg2://postgres:Qrealm%401pranav@db.xxxxx.supabase.co:5432/postgres?sslmode=require
   ```

4. **Enable Row Level Security (Optional)**
   - Go to Table Editor in Supabase dashboard
   - RLS is managed by the application, but you can verify tables exist

### 5.2 Test Database Connection

```bash
cd backend

# Install dependencies first (see Backend Deployment)
pip install psycopg2-binary

# Test connection
python -c "import psycopg2; conn = psycopg2.connect('postgresql+psycopg2://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require'); print('Connection successful!'); conn.close()"
```

---

## 6. Backend Deployment

### Option A: Local Development

#### 6.1.1 Install Dependencies

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### 6.1.2 Run Database Migrations

```bash
# Ensure DATABASE_URL is set in backend/.env
cd backend

# Run all migrations
alembic upgrade head

# If tables don't exist, they will be auto-created on first run
```

#### 6.1.3 Seed Admin User (Optional)

```bash
python -m app.seed
```

#### 6.1.4 Start Backend Server

```bash
# Development mode (with auto-reload)
uvicorn app.main:app --host 0.0.0.0 --port 4000 --reload

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 4000 --workers 4
```

#### 6.1.5 Verify Backend is Running

```bash
# Health check
curl http://localhost:4000/api/health

# Expected response:
# {"status": "healthy", "database": "connected"}
```

### Option B: Railway Deployment

Railway is recommended for easy Python deployment with automatic HTTPS.

#### 6.2.1 Prepare for Railway

1. **Create Railway Account**
   - Sign up at https://railway.app
   - Connect your GitHub account

2. **Create New Project**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Select the `backend` folder

3. **Configure Environment Variables**
   - Add all variables from `.env` (see Section 4.3)
   - Add `START_COMMAND=uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. **Set Build Command**
   ```
   pip install -r requirements.txt
   ```

5. **Set Start Command**
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

6. **Deploy**
   - Railway will automatically deploy
   - Note the deployment URL (e.g., `https://qrealm-backend.up.railway.app`)

### Option C: Render Deployment

#### 6.3.1 Create Render Account
- Sign up at https://render.com
- Connect GitHub

#### 6.3.2 Create Web Service
- Click "New" → "Web Service"
- Connect your repository
- Configure:
  - **Root Directory:** `backend`
  - **Build Command:** `pip install -r requirements.txt`
  - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - **Plan:** Free tier available

#### 6.3.3 Add Environment Variables
- Add all variables from Section 4.3
- DATABASE_URL: Your Supabase connection string

---

## 7. Frontend Deployment

### Option A: Vercel (Recommended)

Vercel is the creators of Next.js and offers the best integration.

#### 7.1.1 Install Vercel CLI

```bash
npm install -g vercel
```

#### 7.1.2 Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No
# - Project name? qrealm
# - Directory? ./
# - Override settings? No
```

#### 7.1.3 Configure Environment Variables

1. Go to your project on Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend-url.up.railway.app/api`

#### 7.1.4 Production Deploy

```bash
vercel --prod
```

### Option B: Netlify

#### 7.2.1 Install Netlify CLI

```bash
npm install -g netlify-cli
```

#### 7.2.2 Configure for Next.js

Create `netlify.toml` in project root:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

#### 7.2.3 Deploy

```bash
netlify login
netlify init
netlify deploy --prod
```

### Option C: GitHub Pages (Static Export)

For static hosting without server-side rendering:

1. **Update `next.config.mjs`:**
```javascript
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // Add your domain
  assetPrefix: process.env.NODE_ENV === 'production' ? '/' : undefined,
};
export default nextConfig;
```

2. **Build and Deploy:**
```bash
npm run build
# Upload the 'out' folder to GitHub Pages
```

---

## 8. Hosting Options Summary

| Component | Recommended | Free Tier | Notes |
|-----------|-------------|-----------|-------|
| Frontend | Vercel | Yes | Best Next.js support |
| Frontend Alt | Netlify | Yes | Good alternative |
| Backend | Railway | Yes ($5 credit) | Easy Python deployment |
| Backend Alt | Render | Yes | Good Python support |
| Database | Supabase | Yes | 500MB free |
| Database Alt | Neon | Yes | Serverless PostgreSQL |

### Recommended Production Stack

```
Frontend:  Vercel (vercel.com)
Backend:   Railway (railway.app)  
Database:  Supabase (supabase.com)
Domain:    Cloudflare or Vercel Domains
SSL:       Automatic (all platforms)
```

---

## 9. Post-Deployment Verification

### 9.1 Check Backend Health

```bash
# Replace with your backend URL
curl https://your-backend-url.up.railway.app/api/health

# Expected response:
# {"status":"healthy","database":"connected"}
```

### 9.2 Check Frontend Loads

1. Open your Vercel deployment URL
2. Verify:
   - Homepage loads with animations
   - Navigation works
   - Dark/light mode toggle works

### 9.3 Verify CORS Configuration

1. Open browser DevTools (F12)
2. Go to Console
3. Try logging in
4. Check for CORS errors in console

### 9.4 Run Feature Tests

See Section 10 for comprehensive feature testing.

---

## 10. Feature Testing Guide

### 10.1 Authentication Features

#### Test: User Registration
```
1. Navigate to /register
2. Fill in email, password, name
3. Click "Create Account"
4. Verify: Success message or redirect to login
5. Check database: New user record created
```

#### Test: User Login
```
1. Navigate to /login
2. Enter credentials
3. Click "Sign In"
4. Verify:
   - Success redirect to home/dashboard
   - User info appears in header
   - JWT token stored
```

#### Test: Password Reset
```
1. Navigate to /login
2. Click "Forgot Password"
3. Enter email address
4. Verify: Email received (check spam)
5. Click reset link
6. Set new password
7. Login with new password
```

#### Test: Admin Login
```
1. Login with admin credentials
2. Verify: Admin dashboard link visible
3. Navigate to /admin
4. Verify: User management, analytics available
```

### 10.2 Blog Features

#### Test: Create Blog Post
```
1. Login as regular user
2. Navigate to /blogs/new
3. Fill in:
   - Title: "Test Blog Post"
   - Content: "This is test content..."
   - Category: Education
4. Click "Publish"
5. Verify:
   - Blog appears in /blogs
   - Blog detail page accessible at /blogs/[slug]
```

#### Test: Blog Interactions
```
1. Open a blog post
2. Click "Like" button
3. Verify: Like count increases
4. Add a comment
5. Verify: Comment appears below post
6. Check: Author receives notification
```

#### Test: Blog Search
```
1. Navigate to /blogs
2. Use search/filter
3. Verify: Results filter correctly
4. Test category filters
5. Test sort options (recent, popular)
```

### 10.3 Forum Features

#### Test: Create Forum Discussion
```
1. Login as regular user
2. Navigate to /forums/new
3. Fill in title and content
4. Click "Post Discussion"
5. Verify: Forum appears in /forums list
```

#### Test: Forum Interactions
```
1. Open a forum discussion
2. Add reply comment
3. Like the discussion
4. Verify: All interactions update in real-time
```

### 10.4 Learning Hub Features

#### Test: Submit Learning Interaction
```
1. Navigate to /learning-hub
2. Click "Report Error" or "Ask Question"
3. Fill in:
   - Topic/Title
   - Description
   - Code snippet (if applicable)
4. Submit
5. Verify:
   - Interaction created
   - Appears in user's interactions list
```

#### Test: Admin Responds to Interaction
```
1. Login as admin
2. Navigate to /admin/learning
3. Select an interaction
4. Add response/explanation
5. Verify: User can see admin response
```

### 10.5 Debate Features

#### Test: Create Debate
```
1. Login as regular user
2. Navigate to /debates/new
3. Fill in:
   - Topic: "Is quantum computing the future?"
   - Option A and Option B
4. Create debate
5. Verify: Debate appears in /debates
```

#### Test: Vote on Debate
```
1. Open a debate
2. Read both arguments
3. Click vote button for preferred option
4. Verify:
   - Vote recorded
   - Vote counts update
   - Cannot vote twice (unless allowed)
```

### 10.6 Admin Features

#### Test: User Management
```
1. Login as admin
2. Navigate to /admin/users
3. Verify: List of all users displayed
4. Test actions:
   - View user details
   - Delete user (with confirmation)
   - Role management
```

#### Test: Content Moderation
```
1. Navigate to /admin/blogs or /admin/forums
2. View all content
3. Test moderation actions:
   - Delete inappropriate content
   - Set flagship blog
   - Flag content for review
```

#### Test: Analytics Dashboard
```
1. Navigate to /admin
2. View analytics cards:
   - Total users
   - Active users
   - Total posts
   - Engagement metrics
3. Verify: Data displays correctly
```

### 10.7 Notification Features

#### Test: Notification Delivery
```
1. Perform actions that generate notifications:
   - Comment on someone's blog
   - Receive a reply
   - Get liked
2. Check notification bell icon
3. Verify: Notification count increases
4. Click to view notifications
5. Mark as read
```

### 10.8 Search Features

#### Test: Global Search
```
1. Navigate to /search
2. Enter search query
3. Verify:
   - Results from blogs, forums, debates
   - Relevant results ranked higher
   - Filters work (by type, date, popularity)
```

---

## 11. Troubleshooting

### Common Issues and Solutions

#### Issue: CORS Errors

**Symptom:** `Access-Control-Allow-Origin` errors in console

**Solution:**
1. Check backend `ALLOWED_ORIGINS` includes your frontend URL
2. Ensure `FRONTEND_URL` matches exactly
3. For production: set `COOKIE_SECURE=true`

```env
# Correct configuration
ALLOWED_ORIGINS=http://localhost:3000,https://qrealm.vercel.app
FRONTEND_URL=https://qrealm.vercel.app
COOKIE_SECURE=true  # Important for HTTPS
```

#### Issue: Database Connection Failed

**Symptom:** `Connection refused` or `Timeout errors`

**Solution:**
1. Verify DATABASE_URL is correct
2. Check password is URL-encoded
3. Ensure Supabase project is not paused
4. Check SSL settings (`?sslmode=require`)

```bash
# Test connection
psql "postgresql://postgres:password@host:5432/db?sslmode=require"
```

#### Issue: JWT Token Expired

**Symptom:** Users logged out frequently

**Solution:**
1. Check `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` setting
2. Verify system clocks are synchronized
3. Check token refresh logic in frontend

#### Issue: Frontend API 404

**Symptom:** API calls return 404

**Solution:**
1. Verify `NEXT_PUBLIC_API_URL` ends with `/api`
2. Check backend routes match frontend calls
3. Verify backend is running and accessible

```bash
# Correct
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Incorrect (missing /api)
NEXT_PUBLIC_API_URL=http://localhost:4000
```

#### Issue: Build Failures

**Frontend Build Fails:**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

**Backend Build Fails:**
```bash
# Check Python version
python --version  # Should be 3.10+

# Reinstall dependencies
pip install -r requirements.txt

# Check for missing system packages
pip install psycopg2-binary
```

#### Issue: Slow Page Loads

**Solutions:**
1. Enable caching headers
2. Optimize images
3. Use CDN for static assets
4. Enable server-side compression

#### Issue: Static Export Not Working

**Symptom:** Dynamic routes not rendering

**Solution:**
1. Update `next.config.mjs`:
```javascript
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
};
export default nextConfig;
```

2. Note: Some features (admin dashboard) require SSR

---

## Quick Reference Commands

### Frontend
```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint
npm run lint
```

### Backend
```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Seed admin
python -m app.seed

# Start server
uvicorn app.main:app --host 0.0.0.0 --port 4000 --reload
```

### Database
```bash
# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# Create new migration
alembic revision --autogenerate -m "description"

# View migration status
alembic current
alembic history
```

---

## Security Checklist

- [ ] Change default JWT secrets
- [ ] Enable `COOKIE_SECURE=true` in production
- [ ] Use strong database password
- [ ] Enable Supabase Row Level Security
- [ ] Set proper CORS origins (no wildcards in production)
- [ ] Use HTTPS everywhere
- [ ] Regular dependency updates
- [ ] Monitor for suspicious activity
- [ ] Backup database regularly
- [ ] Review access logs

---

## Support and Resources

- **Documentation:** https://github.com/your-repo/docs
- **Issues:** https://github.com/your-repo/issues
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Railway Docs:** https://docs.railway.app
- **FastAPI Docs:** https://fastapi.tiangolo.com

---

*Last Updated: April 2026*
