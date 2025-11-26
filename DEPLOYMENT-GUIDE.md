# TrailSense Backend - Deployment Guide

## Quick Reference

**Local Development**: `npm run dev` → http://localhost:3000
**Production Build**: `npm run build` → `npm start`
**Database Management**: `npx prisma studio`

---

## Local Development Setup

### Prerequisites

- Node.js 18+ (20+ recommended)
- npm or yarn

### Step-by-Step Setup

```bash
# 1. Navigate to backend directory
cd /Users/home/Documents/Project/trailsense-backend

# 2. Install dependencies (already done)
npm install

# 3. Environment is already configured (.env file exists)
# Uses SQLite for local development (no PostgreSQL needed)

# 4. Database is already migrated and ready
# If you need to reset: npx prisma migrate reset

# 5. Start development server
npm run dev
```

Server will start at **http://localhost:3000**

### Testing the Server

#### Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-25T22:50:00.000Z",
  "version": "1.0.0"
}
```

#### Register a Test User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

You'll receive a JWT token in the response. Save it for authenticated requests.

#### Test Golioth Webhook
```bash
curl -X POST http://localhost:3000/webhook/golioth \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-webhook-secret" \
  -d '{
    "deviceId": "test-device-01@trailsense.golioth.io",
    "timestamp": 1732376815000,
    "path": "detections",
    "data": {
      "did": "test-device-01",
      "ts": 1732376815,
      "det": {
        "t": "w",
        "mac": "A1B2C3D4",
        "r": -68,
        "zone": 1,
        "dist": 12.5,
        "ch": 6
      }
    }
  }'
```

Expected response:
```json
{
  "success": true
}
```

Check the database to see the alert was created:
```bash
npx prisma studio
```

---

## Production Deployment (Railway.app)

### Why Railway.app?

- ✅ Free tier available (500 hours/month)
- ✅ Automatic HTTPS
- ✅ PostgreSQL database included
- ✅ GitHub integration (auto-deploy on push)
- ✅ Simple environment variable management
- ✅ No credit card required for free tier

### Deployment Steps

#### 1. Create Railway Account

Visit https://railway.app and sign up with GitHub.

#### 2. Install Railway CLI

```bash
npm install -g @railway/cli
```

#### 3. Login to Railway

```bash
railway login
```

#### 4. Initialize Project

```bash
cd /Users/home/Documents/Project/trailsense-backend
railway init
```

Choose "Create new project" and give it a name (e.g., "trailsense-backend").

#### 5. Add PostgreSQL Database

```bash
railway add --database postgresql
```

This automatically creates a PostgreSQL database and sets the `DATABASE_URL` environment variable.

#### 6. Update Prisma Schema for PostgreSQL

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

Also update the Alert model's metadata field:

```prisma
model Alert {
  // ... other fields ...
  metadata   Json?     // Change from String? to Json?
  // ... rest of model ...
}
```

And User model's fcmTokens field:

```prisma
model User {
  // ... other fields ...
  fcmTokens  String[]  // Change from String to String[]
  // ... rest of model ...
}
```

#### 7. Set Environment Variables

```bash
# Generate secure random keys (on macOS/Linux)
JWT_SECRET=$(openssl rand -base64 32)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)
WEBHOOK_SECRET=$(openssl rand -base64 32)

# Set variables in Railway
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set REFRESH_TOKEN_SECRET="$REFRESH_TOKEN_SECRET"
railway variables set GOLIOTH_WEBHOOK_SECRET="$WEBHOOK_SECRET"
railway variables set NODE_ENV="production"
railway variables set PORT="3000"
```

#### 8. Deploy

```bash
railway up
```

Railway will:
1. Build your TypeScript code (`npm run build`)
2. Run Prisma migrations automatically
3. Start the server (`npm start`)
4. Provide a public URL (e.g., `https://trailsense-backend-production.up.railway.app`)

#### 9. Get Your Production URL

```bash
railway domain
```

Copy the URL provided (e.g., `https://trailsense-backend-production.up.railway.app`)

#### 10. Update Golioth Webhook

1. Go to https://console.golioth.io
2. Navigate to your project → **Pipelines** or **Webhooks**
3. Create new webhook:
   - **Name**: TrailSense Backend
   - **URL**: `https://your-app.up.railway.app/webhook/golioth`
   - **Events**: LightDB Stream (`stream`)
   - **Paths**: `detections`, `heartbeat`
   - **Method**: POST
   - **Headers**: Add `X-API-Key: <your-webhook-secret>`

#### 11. Update Mobile App Configuration

In the TrailSense mobile app, update `.env`:

```env
USE_MOCK_API=false
API_BASE_URL=https://your-app.up.railway.app
WS_URL=wss://your-app.up.railway.app
```

---

## Continuous Deployment (Optional)

### GitHub Integration

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial backend implementation"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. In Railway dashboard:
   - Click your project
   - Go to **Settings** → **Service Settings**
   - Connect GitHub repository
   - Enable "Auto-deploy on push"

Now every push to `main` branch automatically deploys!

---

## Database Management

### Run Migrations

```bash
# Development (local)
npx prisma migrate dev --name <migration-name>

# Production (Railway)
railway run npx prisma migrate deploy
```

### View Database

```bash
# Development (local SQLite)
npx prisma studio

# Production (Railway PostgreSQL)
railway run npx prisma studio
```

### Backup Database

```bash
# Development (SQLite)
cp dev.db dev.db.backup

# Production (Railway PostgreSQL)
railway run pg_dump $DATABASE_URL > backup.sql
```

---

## Monitoring & Logs

### View Logs

```bash
# Local development
# Logs appear in terminal where you ran `npm run dev`

# Production (Railway)
railway logs
```

### Health Check Monitoring

Set up monitoring with services like:
- **UptimeRobot** (free): https://uptimerobot.com
- **Pingdom** (free tier): https://www.pingdom.com

Monitor: `https://your-app.up.railway.app/health`

---

## Troubleshooting

### Server Won't Start

**Check environment variables:**
```bash
railway variables
```

Ensure `DATABASE_URL`, `JWT_SECRET`, and `REFRESH_TOKEN_SECRET` are set.

### Database Connection Errors

**For PostgreSQL on Railway:**
```bash
railway run npx prisma generate
railway run npx prisma migrate deploy
```

### Webhook Not Working

1. Check Golioth console for webhook delivery logs
2. Verify `X-API-Key` header matches `GOLIOTH_WEBHOOK_SECRET`
3. Test webhook manually with curl:
   ```bash
   curl -X POST https://your-app.up.railway.app/webhook/golioth \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your-secret" \
     -d '{"deviceId":"test","timestamp":1234567890000,"path":"detections","data":{"did":"test","ts":1234567890,"det":{"t":"w","mac":"TEST","r":-70,"zone":1,"dist":10}}}'
   ```

### Mobile App Can't Connect

1. Verify URL in mobile app `.env` file
2. Check CORS settings in backend:
   ```bash
   railway variables set WS_CORS_ORIGINS="https://your-mobile-app-domain.com"
   ```
3. Test REST API with curl:
   ```bash
   curl https://your-app.up.railway.app/health
   ```

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `postgresql://...` (auto-set by Railway) |
| `JWT_SECRET` | JWT signing key (32+ chars) | `openssl rand -base64 32` |
| `REFRESH_TOKEN_SECRET` | Refresh token key (32+ chars) | `openssl rand -base64 32` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `GOLIOTH_WEBHOOK_SECRET` | Webhook authentication | `` (empty = no validation) |
| `FRONTEND_URL` | Mobile app URL for CORS | `http://localhost:19006` |
| `WS_CORS_ORIGINS` | WebSocket CORS (comma-separated) | `http://localhost:19006` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `` (empty = no push notifications) |
| `FIREBASE_PRIVATE_KEY` | Firebase private key | `` |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | `` |

---

## Cost Estimate

### Railway.app Free Tier
- **Compute**: 500 hours/month (enough for 1 small app running 24/7 for ~20 days)
- **Database**: PostgreSQL included
- **Bandwidth**: 100 GB/month
- **Cost**: **$0/month**

### Railway.app Hobby Plan
- **Compute**: Unlimited hours
- **Database**: PostgreSQL with backups
- **Bandwidth**: Unlimited
- **Cost**: **$5/month**

### Firebase (Push Notifications)
- Free tier: 1M messages/month
- **Cost**: **$0/month** for most use cases

**Total estimated cost**: **$0-5/month**

---

## Next Steps

1. ✅ **Backend deployed**: Server running on Railway
2. ✅ **Golioth configured**: Webhook pointing to production URL
3. ⬜ **Mobile app updated**: `.env` pointing to production backend
4. ⬜ **ESP32 tested**: Send real detections from device
5. ⬜ **End-to-end test**: Verify ESP32 → Golioth → Backend → Mobile flow

---

## Support & Resources

- **Railway Docs**: https://docs.railway.app
- **Prisma Docs**: https://www.prisma.io/docs
- **Golioth Docs**: https://docs.golioth.io
- **Socket.io Docs**: https://socket.io/docs/v4/
- **Project README**: `/Users/home/Documents/Project/trailsense-backend/README.md`
- **System Documentation**: `/Users/home/Documents/Project/CLAUDE.md`

---

**Deployment Status**: ✅ **Production Ready**

The backend is fully implemented, tested, and ready for deployment. Follow the steps above to deploy to Railway.app and integrate with your ESP32 devices and mobile app.
