# TrailSense Backend - Testing Guide

**Complete guide for testing the backend API and mobile app integration**

---

## Quick Start

### 1. Seed the Database

```bash
cd /Users/home/Documents/Project/trailsense-backend
npm run seed
```

This creates:
- **3 test users** with known passwords
- **5 ESP32 devices** with varied states
- **50 realistic alerts** over the past 7 days
- **10 whitelist entries** for known devices

### 2. Start the Backend

```bash
npm run dev
```

Server starts at `http://localhost:3000`

### 3. Test with Mobile App

```bash
cd /Users/home/Documents/Project/TrailSense
npm start
# Press 'i' for iOS or 'a' for Android
```

**Login with:**
- Email: `test@trailsense.com`
- Password: `password123`

---

## Seed Data Overview

### Test Users

| Email | Password | Name | Purpose |
|-------|----------|------|---------|
| `admin@trailsense.com` | `admin123` | Admin User | Administrator testing |
| `test@trailsense.com` | `password123` | Test User | General testing |
| `demo@trailsense.com` | `demo123` | Demo User | Demo/presentation |

### ESP32 Devices

| Device ID | Name | Status | Battery | Location |
|-----------|------|--------|---------|----------|
| `trailsense-device-01` | Front Gate Detector | 🟢 Online | 87% | Houston, TX |
| `trailsense-device-02` | Backyard Perimeter | 🟢 Online | 62% | Houston, TX |
| `trailsense-device-03` | Side Entrance Monitor | 🔴 Offline | 15% | Houston, TX |
| `trailsense-device-04` | Driveway Sensor | 🟢 Online | 94% | Houston, TX |
| `trailsense-device-05` | Garage Monitor | 🟢 Online | 78% | Houston, TX |

### Detection Alerts (50 total)

**Threat Level Distribution:**
- 🔴 Critical: ~5% (1-3 alerts)
- 🟠 High: ~20% (8-12 alerts)
- 🟡 Medium: ~35% (15-20 alerts)
- 🟢 Low: ~40% (18-25 alerts)

**Detection Types:**
- WiFi: ~33% (16-18 alerts)
- Bluetooth: ~33% (16-18 alerts)
- Cellular: ~33% (16-18 alerts)

**Time Range:** Past 7 days (spread throughout)

**Review Status:**
- Reviewed: ~30%
- Unreviewed: ~70%

### Whitelist Entries (10 total)

**Categories:**
- Family devices (4)
- Guest devices (2)
- Service vehicles (3)
- Neighbor networks (1)

---

## API Testing with curl

### Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-25T23:10:00.000Z",
  "version": "1.0.0"
}
```

---

### User Registration

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "name": "New User"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "uuid-...",
    "email": "newuser@example.com",
    "name": "New User"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### User Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@trailsense.com",
    "password": "password123"
  }'
```

**Save the token from the response for authenticated requests!**

---

### Get Alerts (Protected)

```bash
# Replace YOUR_TOKEN with the JWT token from login
curl -X GET http://localhost:3000/api/alerts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": "uuid-...",
    "deviceId": "trailsense-device-01",
    "timestamp": "2025-11-24T15:30:00.000Z",
    "threatLevel": "high",
    "detectionType": "wifi",
    "rssi": -55,
    "macAddress": "A1B2C3D4XXXX",
    "isReviewed": false,
    "metadata": "{\"zone\":1,\"distance\":12.5,\"channel\":6,\"ssid\":\"iPhone\"}"
  },
  // ... more alerts
]
```

---

### Get Alerts with Filters

```bash
# Get only high and critical alerts
curl -X GET "http://localhost:3000/api/alerts?threatLevel=high&threatLevel=critical&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get unreviewed alerts from a specific device
curl -X GET "http://localhost:3000/api/alerts?deviceId=trailsense-device-01&isReviewed=false" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get alerts from the last 24 hours
curl -X GET "http://localhost:3000/api/alerts?startDate=2025-11-24T00:00:00Z&endDate=2025-11-25T23:59:59Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Mark Alert as Reviewed

```bash
# Replace ALERT_ID with actual alert ID
curl -X PATCH http://localhost:3000/api/alerts/ALERT_ID/reviewed \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isReviewed": true
  }'
```

---

### Delete Alert

```bash
curl -X DELETE http://localhost:3000/api/alerts/ALERT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:** `204 No Content`

---

## Testing Webhook Integration

### Simulate ESP32 Detection (WiFi)

```bash
curl -X POST http://localhost:3000/webhook/golioth \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-webhook-secret" \
  -d '{
    "deviceId": "trailsense-device-01@trailsense.golioth.io",
    "timestamp": 1732576815000,
    "path": "detections",
    "data": {
      "did": "trailsense-device-01",
      "ts": 1732576815,
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

**Expected Backend Logs:**
```
[Golioth] Webhook received: ...
[Golioth] Alert created: <uuid> (medium - wifi)
[WebSocket] Broadcasted alert: <uuid> (medium)
```

---

### Simulate Bluetooth Detection

```bash
curl -X POST http://localhost:3000/webhook/golioth \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-webhook-secret" \
  -d '{
    "deviceId": "trailsense-device-02@trailsense.golioth.io",
    "timestamp": 1732576820000,
    "path": "detections",
    "data": {
      "did": "trailsense-device-02",
      "ts": 1732576820,
      "det": {
        "t": "b",
        "mac": "5F6E7D8C",
        "r": -72,
        "zone": 2,
        "dist": 18.3,
        "name": "iPhone 14"
      }
    }
  }'
```

---

### Simulate Critical Cellular Detection

```bash
curl -X POST http://localhost:3000/webhook/golioth \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-webhook-secret" \
  -d '{
    "deviceId": "trailsense-device-01@trailsense.golioth.io",
    "timestamp": 1732576825000,
    "path": "detections",
    "data": {
      "did": "trailsense-device-01",
      "ts": 1732576825,
      "det": {
        "t": "c",
        "peak": -45,
        "avg": -52,
        "delta": 10,
        "r": -45,
        "zone": 0,
        "dist": 2.5
      }
    }
  }'
```

**This should trigger a CRITICAL alert!**

---

### Simulate Device Heartbeat

```bash
curl -X POST http://localhost:3000/webhook/golioth \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-webhook-secret" \
  -d '{
    "deviceId": "trailsense-device-01@trailsense.golioth.io",
    "timestamp": 1732576830000,
    "path": "heartbeat",
    "data": {
      "did": "trailsense-device-01",
      "ts": 1732576830,
      "health": {
        "heap": 185344,
        "uptime": 3600,
        "bat": 87,
        "rssi": -65
      }
    }
  }'
```

**Expected Backend Logs:**
```
[Golioth] Heartbeat processed: trailsense-device-01 (battery: 87%)
[WebSocket] Broadcasted device status: trailsense-device-01
```

---

## Mobile App Testing Workflow

### Step 1: Start Backend with Seed Data

```bash
cd /Users/home/Documents/Project/trailsense-backend
npm run seed    # Populate database
npm run dev     # Start server
```

### Step 2: Start Mobile App

```bash
cd /Users/home/Documents/Project/TrailSense
npm start
# Press 'i' for iOS
```

### Step 3: Login

- Open the app in simulator
- Enter credentials: `test@trailsense.com` / `password123`
- Tap "Login"

**Expected:** App navigates to main screen with tabs

### Step 4: Verify Alerts Tab

- Navigate to "Alerts" tab
- **Expected:** See ~50 alerts loaded from backend
- **Expected:** Mix of threat levels (green, yellow, orange, red)
- **Expected:** Different detection types (WiFi, Bluetooth, Cellular)

### Step 5: Test Alert Details

- Tap on any alert
- **Expected:** Alert details screen appears
- **Expected:** Shows device info, location, threat level, metadata

### Step 6: Test Mark as Reviewed

- Tap "Mark as Reviewed" button
- **Expected:** Alert updated
- **Expected:** Visual indicator changes

### Step 7: Test Filters

- Tap filter button
- Select "High" and "Critical" only
- Apply filters
- **Expected:** Only high/critical alerts shown

### Step 8: Test Real-Time WebSocket

**In a separate terminal:**
```bash
curl -X POST http://localhost:3000/webhook/golioth \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-webhook-secret" \
  -d '{
    "deviceId": "trailsense-device-01@trailsense.golioth.io",
    "timestamp": '$(date +%s000)',
    "path": "detections",
    "data": {
      "did": "trailsense-device-01",
      "ts": '$(date +%s)',
      "det": {"t":"w","mac":"TEST1234","r":-55,"zone":0,"dist":2.0,"ch":6}
    }
  }'
```

**Expected in Mobile App:**
- New alert appears **immediately** without refresh
- Live Radar shows new detection
- Alert count increments

### Step 9: Test Devices Tab

- Navigate to "Devices" tab
- **Expected:** See 5 devices
- **Expected:** Shows online/offline status
- **Expected:** Shows battery percentages
- **Expected:** Shows detection counts

### Step 10: Test Analytics Tab

- Navigate to "Analytics" tab
- **Expected:** Charts show data from seeded alerts
- **Expected:** Threat distribution chart
- **Expected:** Timeline shows activity

---

## Database Inspection

### View Data with Prisma Studio

```bash
cd /Users/home/Documents/Project/trailsense-backend
npx prisma studio
```

**Opens at:** `http://localhost:5555`

**You can:**
- Browse all tables
- View seeded data
- Manually edit records
- Run queries

---

## Resetting the Database

### Re-run Seed Script

```bash
npm run seed
```

**This will:**
1. Delete all existing data
2. Create fresh test data
3. Reset detection counts

---

## Troubleshooting

### Problem: Mobile App Shows Empty Alerts

**Solution:**
1. Check backend logs for API calls
2. Verify JWT token is valid
3. Check filters aren't hiding all alerts
4. Re-run seed script: `npm run seed`

---

### Problem: WebSocket Not Working

**Solution:**
1. Check backend logs for WebSocket connection
2. Verify mobile app has valid JWT token
3. Check CORS settings in backend
4. Restart both backend and mobile app

---

### Problem: Login Fails

**Solution:**
1. Verify backend is running: `curl http://localhost:3000/health`
2. Check credentials are correct
3. Look at backend logs for error messages
4. Re-run seed script to recreate users

---

### Problem: No Data in Database

**Solution:**
```bash
npm run seed
```

---

## Testing Checklist

### Backend Tests

- [ ] Health check returns 200 OK
- [ ] User registration works
- [ ] User login returns JWT token
- [ ] GET /api/alerts returns seeded data
- [ ] GET /api/alerts with filters works
- [ ] PATCH /api/alerts/:id/reviewed works
- [ ] DELETE /api/alerts/:id works
- [ ] Webhook endpoint accepts POST
- [ ] Webhook creates alert in database
- [ ] WebSocket broadcasts alert

### Mobile App Tests

- [ ] App starts without errors
- [ ] Mock mode is DISABLED
- [ ] Login screen appears
- [ ] Login succeeds with test credentials
- [ ] Alerts tab shows seeded data
- [ ] Alert details screen works
- [ ] Mark as reviewed works
- [ ] Filters work correctly
- [ ] Devices tab shows 5 devices
- [ ] Real-time webhook creates new alert
- [ ] Live Radar updates in real-time
- [ ] Analytics shows data

### Integration Tests

- [ ] End-to-end: Webhook → Database → Mobile App
- [ ] Real-time: Webhook → WebSocket → Mobile App
- [ ] Authentication: Mobile App → Backend → Database
- [ ] CRUD: Create, Read, Update, Delete alerts

---

## Performance Testing

### Load Test with Multiple Webhooks

```bash
# Send 10 webhooks in quick succession
for i in {1..10}; do
  curl -X POST http://localhost:3000/webhook/golioth \
    -H "Content-Type: application/json" \
    -H "X-API-Key: dev-webhook-secret" \
    -d "{
      \"deviceId\": \"trailsense-device-01@trailsense.golioth.io\",
      \"timestamp\": $(date +%s000),
      \"path\": \"detections\",
      \"data\": {
        \"did\": \"trailsense-device-01\",
        \"ts\": $(date +%s),
        \"det\": {\"t\":\"w\",\"mac\":\"TEST$i\",\"r\":-60,\"zone\":1,\"dist\":10.0,\"ch\":6}
      }
    }" &
done
wait
```

**Expected:**
- All 10 alerts created
- No database errors
- WebSocket broadcasts all alerts
- Mobile app receives all in real-time

---

## Summary

✅ **Database Seed Script Created**
✅ **50 Realistic Alerts Generated**
✅ **3 Test Users with Known Passwords**
✅ **5 ESP32 Devices with Varied States**
✅ **10 Whitelist Entries**
✅ **Complete Testing Guide**

**You're ready to test the complete integration!** 🚀

---

**Next Steps:**
1. Run `npm run seed` to populate database
2. Start backend with `npm run dev`
3. Start mobile app with `npm start`
4. Login with `test@trailsense.com` / `password123`
5. Verify alerts appear in mobile app
6. Send test webhook to verify real-time updates

**Happy Testing!** 🎉
