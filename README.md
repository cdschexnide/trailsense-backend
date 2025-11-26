# TrailSense Backend API

**Production-ready Node.js backend for TrailSense IoT Security System**

This backend serves as the middleware between ESP32 devices (via Golioth IoT cloud) and the React Native mobile application.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [WebSocket Events](#websocket-events)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Testing](#testing)

---

## Features

✅ **Golioth Webhook Integration** - Receives real-time detection data from ESP32 devices
✅ **Data Transformation** - Converts ESP32 compact format to mobile app format
✅ **Threat Classification** - Intelligent scoring algorithm for threat levels
✅ **Real-Time WebSocket** - Live alerts pushed to mobile app
✅ **JWT Authentication** - Secure user authentication
✅ **RESTful API** - Full CRUD operations for alerts
✅ **Database Persistence** - SQLite (dev) / PostgreSQL (production)
✅ **TypeScript** - Type-safe codebase
✅ **Production-Ready** - Deployment-ready for Railway.app or similar platforms

---

## Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   ESP32      │   LTE   │   Golioth    │  HTTPS  │   Backend    │  WSS    │   Mobile     │
│   Device     │────────▶│   LightDB    │────────▶│   (Node.js)  │────────▶│   App        │
│              │         │   Stream     │ Webhook │              │         │   (React     │
└──────────────┘         └──────────────┘         └──────┬───────┘         │   Native)    │
                                                         │                 └──────────────┘
                                                         ├── PostgreSQL DB
                                                         ├── JWT Auth
                                                         └── Socket.io
```

**Data Flow:**

1. ESP32 detects device (WiFi/BLE/Cellular)
2. Sends compact JSON to Golioth LightDB Stream
3. Golioth triggers webhook to backend
4. Backend transforms data, calculates threat level
5. Saves to database
6. Broadcasts via WebSocket to connected mobile apps
7. Mobile app displays real-time alert

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript 5+
- **Framework:** Express.js 4.x
- **Database:** SQLite (dev) / PostgreSQL 15+ (production)
- **ORM:** Prisma 5.x
- **WebSocket:** Socket.io 4.x
- **Authentication:** JWT with bcrypt
- **Deployment:** Railway.app (recommended)

---

## Quick Start

### Prerequisites

- Node.js 18+ (20+ recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
cd /Users/home/Documents/Project/trailsense-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migration
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# (Optional) Seed database with test data
npm run seed
```

### Development

```bash
# Start development server with auto-reload
npm run dev
```

Server will start at `http://localhost:3000`

### Testing with Seed Data

To populate the database with realistic test data for development:

```bash
npm run seed
```

This creates:
- **3 test users** (admin, test, demo) with known passwords
- **5 ESP32 devices** with varied states (online/offline, different battery levels)
- **50 detection alerts** spread over the past 7 days with mixed threat levels
- **10 whitelist entries** for known devices

**Test Credentials:**
- `admin@trailsense.com` / `admin123`
- `test@trailsense.com` / `password123`
- `demo@trailsense.com` / `demo123`

See [TESTING-GUIDE.md](./TESTING-GUIDE.md) for complete testing instructions.

### Production

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

---

## Environment Variables

### Required Variables

```env
DATABASE_URL=file:./dev.db                      # SQLite for dev, PostgreSQL for production
JWT_SECRET=your-secret-key-min-32-chars         # JWT signing key
REFRESH_TOKEN_SECRET=your-refresh-secret        # Refresh token key
```

### Optional Variables

```env
NODE_ENV=development                            # Environment mode
PORT=3000                                       # Server port
GOLIOTH_WEBHOOK_SECRET=your-webhook-secret     # Golioth webhook authentication
FRONTEND_URL=http://localhost:19006            # Mobile app URL for CORS
WS_CORS_ORIGINS=http://localhost:19006         # WebSocket CORS origins
```

### Firebase (Push Notifications - Optional)

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

---

## API Endpoints

### Public Endpoints

#### `POST /webhook/golioth`
Receive webhooks from Golioth when ESP32 sends data

**Headers:**
- `X-API-Key: <webhook-secret>` (optional)

**Request Body (Detection):**
```json
{
  "deviceId": "trailsense-device-01@trailsense.golioth.io",
  "timestamp": 1732376815000,
  "path": "detections",
  "data": {
    "did": "trailsense-device-01",
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
}
```

**Response:**
```json
{
  "success": true
}
```

---

#### `POST /auth/register`
Register new user account

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### `POST /auth/login`
Login and receive JWT token

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### `GET /health`
Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-25T22:00:00.000Z",
  "version": "1.0.0"
}
```

---

### Protected Endpoints (JWT Required)

All protected endpoints require `Authorization: Bearer <token>` header.

#### `GET /api/alerts`
List alerts with optional filters

**Query Parameters:**
- `deviceId` (string): Filter by device ID
- `threatLevel` (string[]): Filter by threat levels (low, medium, high, critical)
- `detectionType` (string[]): Filter by types (wifi, bluetooth, cellular)
- `startDate` (ISO8601): Start date for time range
- `endDate` (ISO8601): End date for time range
- `isReviewed` (boolean): Filter by reviewed status
- `limit` (number): Max results (default: 50)
- `offset` (number): Pagination offset (default: 0)

**Example:**
```
GET /api/alerts?threatLevel=high&threatLevel=critical&limit=20
```

**Response:**
```json
[
  {
    "id": "uuid",
    "deviceId": "trailsense-device-01",
    "timestamp": "2025-11-25T10:30:15.000Z",
    "threatLevel": "high",
    "detectionType": "wifi",
    "rssi": -68,
    "macAddress": "A1B2C3D4XXXX",
    "isReviewed": false,
    "metadata": "{\"zone\":1,\"distance\":12.5,\"channel\":6}"
  }
]
```

---

#### `GET /api/alerts/:id`
Get single alert by ID

**Response:**
```json
{
  "id": "uuid",
  "deviceId": "trailsense-device-01",
  "timestamp": "2025-11-25T10:30:15.000Z",
  "threatLevel": "high",
  "detectionType": "wifi",
  "rssi": -68,
  "macAddress": "A1B2C3D4XXXX",
  "isReviewed": false,
  "metadata": "{\"zone\":1,\"distance\":12.5}"
}
```

---

#### `PATCH /api/alerts/:id/reviewed`
Mark alert as reviewed

**Request Body:**
```json
{
  "isReviewed": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "isReviewed": true,
  ...
}
```

---

#### `DELETE /api/alerts/:id`
Delete alert

**Response:**
```
204 No Content
```

---

## WebSocket Events

### Connection

Connect to `ws://localhost:3000` with authentication:

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### `alert` (Server → Client)
New detection alert

**Payload:**
```json
{
  "id": "uuid",
  "deviceId": "trailsense-device-01",
  "timestamp": "2025-11-25T10:30:15.000Z",
  "threatLevel": "high",
  "detectionType": "wifi",
  "rssi": -68,
  ...
}
```

---

#### `device-status` (Server → Client)
Device status update

**Payload:**
```json
{
  "id": "trailsense-device-01",
  "online": true,
  "battery": 87,
  "signalStrength": "good",
  "lastSeen": "2025-11-25T10:30:00.000Z"
}
```

---

## Database Schema

### Device
```prisma
model Device {
  id               String    @id
  name             String
  online           Boolean   @default(false)
  batteryPercent   Int?
  signalStrength   String?
  detectionCount   Int       @default(0)
  latitude         Float?
  longitude        Float?
  lastSeen         DateTime?
  firmwareVersion  String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  alerts           Alert[]
}
```

### Alert
```prisma
model Alert {
  id                String    @id @default(uuid())
  deviceId          String
  timestamp         DateTime
  threatLevel       String
  detectionType     String
  rssi              Int
  macAddress        String?
  cellularStrength  Int?
  isReviewed        Boolean   @default(false)
  isFalsePositive   Boolean   @default(false)
  latitude          Float?
  longitude         Float?
  metadata          String?   // JSON
  createdAt         DateTime  @default(now())

  device            Device    @relation(fields: [deviceId], references: [id])
}
```

### User
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  name          String?
  fcmTokens     String    @default("")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Whitelist
```prisma
model Whitelist {
  id          String    @id @default(uuid())
  macAddress  String    @unique
  deviceName  String?
  category    String?
  notes       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

---

## Deployment

### Railway.app (Recommended)

1. **Create account** at https://railway.app
2. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

3. **Login:**
   ```bash
   railway login
   ```

4. **Initialize project:**
   ```bash
   railway init
   ```

5. **Add PostgreSQL database:**
   ```bash
   railway add --database postgresql
   ```

6. **Set environment variables:**
   ```bash
   railway variables set JWT_SECRET=your-secret-key
   railway variables set REFRESH_TOKEN_SECRET=your-refresh-secret
   railway variables set GOLIOTH_WEBHOOK_SECRET=your-webhook-secret
   ```

7. **Deploy:**
   ```bash
   railway up
   ```

8. **Update Golioth webhook URL:**
   - Go to Golioth Console → Webhooks
   - Set URL to: `https://your-app.up.railway.app/webhook/golioth`
   - Set X-API-Key header to your webhook secret

---

## Testing

### Manual Testing with curl

#### Health Check
```bash
curl http://localhost:3000/health
```

#### Register User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

#### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

#### Get Alerts (with JWT token)
```bash
curl http://localhost:3000/api/alerts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

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

---

## Project Structure

```
trailsense-backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/
│   │   └── env.ts             # Environment configuration
│   ├── controllers/
│   │   ├── alertsController.ts       # Alert CRUD operations
│   │   ├── authController.ts         # Authentication
│   │   └── goliothWebhookController.ts  # Webhook handler
│   ├── middleware/
│   │   └── auth.ts            # JWT authentication middleware
│   ├── routes/
│   │   └── index.ts           # API routes
│   ├── services/
│   │   ├── threatClassifier.ts      # Threat level calculation
│   │   └── websocketService.ts      # WebSocket server
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   └── index.ts               # Main server entry point
├── .env                       # Environment variables (not in git)
├── .env.example               # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## Contributing

This backend is part of the TrailSense IoT security system. For more information about the complete system, see:
- ESP32 Firmware: `/Users/home/Documents/Project/TrailSenseDevice/`
- Mobile App: `/Users/home/Documents/Project/TrailSense/`
- System Documentation: `/Users/home/Documents/Project/CLAUDE.md`

---

## License

MIT

---

## Support

For issues or questions:
1. Check the logs: `npm run dev` shows real-time logging
2. Review database: `npx prisma studio` (visual database editor)
3. Consult system documentation: `CLAUDE.md`

---

**Built with ❤️ for the TrailSense Project**
