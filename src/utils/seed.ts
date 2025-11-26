/**
 * Database Seed Script
 *
 * Populates the database with realistic test data for development and testing.
 *
 * Usage:
 *   npm run seed
 *
 * This script will:
 * 1. Clear all existing data
 * 2. Create test users with known passwords
 * 3. Create ESP32 devices with varied states
 * 4. Generate realistic alerts over the past 7 days
 * 5. Add whitelist entries for known devices
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// ============================================
// Configuration
// ============================================

const SEED_CONFIG = {
  users: 3,
  devices: 5,
  alerts: 50,
  whitelist: 10,
  daysOfHistory: 7,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Generate random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random element from array
 */
function randomElement<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

/**
 * Generate random date within the last N days
 */
function randomDateWithinDays(days: number): Date {
  const now = Date.now();
  const daysAgo = days * 24 * 60 * 60 * 1000;
  const randomTime = now - randomInt(0, daysAgo);
  return new Date(randomTime);
}

/**
 * Generate random MAC address (4 bytes, uppercase hex)
 */
function randomMacAddress(): string {
  const bytes = Array.from({ length: 4 }, () =>
    randomInt(0, 255).toString(16).toUpperCase().padStart(2, '0')
  );
  return bytes.join('');
}

/**
 * Generate realistic RSSI value based on detection type
 */
function randomRSSI(detectionType: 'wifi' | 'bluetooth' | 'cellular'): number {
  switch (detectionType) {
    case 'wifi':
      return randomInt(-85, -45); // WiFi typical range
    case 'bluetooth':
      return randomInt(-90, -50); // BLE typical range
    case 'cellular':
      return randomInt(-70, -40); // Cellular RF detector range
    default:
      return randomInt(-80, -50);
  }
}

/**
 * Calculate threat level based on RSSI and zone
 */
function calculateThreatLevel(
  rssi: number,
  zone: number,
  detectionType: 'w' | 'b' | 'c'
): 'low' | 'medium' | 'high' | 'critical' {
  let score = 0;

  if (detectionType === 'c') score += 40;
  if (rssi > -50) score += 30;
  else if (rssi > -70) score += 15;
  if (zone === 0) score += 20;
  else if (zone === 1) score += 10;

  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

// ============================================
// Data Generators
// ============================================

/**
 * Generate test users
 */
async function seedUsers() {
  console.log(`\n📝 Creating ${SEED_CONFIG.users} test users...`);

  const users = [
    {
      email: 'admin@trailsense.com',
      password: 'admin123',
      name: 'Admin User',
    },
    {
      email: 'test@trailsense.com',
      password: 'password123',
      name: 'Test User',
    },
    {
      email: 'demo@trailsense.com',
      password: 'demo123',
      name: 'Demo User',
    },
  ];

  for (const userData of users) {
    const passwordHash = await bcrypt.hash(userData.password, 10);

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        passwordHash,
        name: userData.name,
        fcmTokens: [],
      },
    });

    console.log(`   ✓ Created user: ${user.email} (password: ${userData.password})`);
  }
}

/**
 * Generate ESP32 devices
 */
async function seedDevices() {
  console.log(`\n📡 Creating ${SEED_CONFIG.devices} ESP32 devices...`);

  const deviceData = [
    {
      id: 'trailsense-device-01',
      name: 'Front Gate Detector',
      online: true,
      batteryPercent: 87,
      signalStrength: 'excellent',
      latitude: 29.7604,
      longitude: -95.3698,
    },
    {
      id: 'trailsense-device-02',
      name: 'Backyard Perimeter',
      online: true,
      batteryPercent: 62,
      signalStrength: 'good',
      latitude: 29.7605,
      longitude: -95.3699,
    },
    {
      id: 'trailsense-device-03',
      name: 'Side Entrance Monitor',
      online: false,
      batteryPercent: 15,
      signalStrength: 'poor',
      latitude: 29.7603,
      longitude: -95.3697,
    },
    {
      id: 'trailsense-device-04',
      name: 'Driveway Sensor',
      online: true,
      batteryPercent: 94,
      signalStrength: 'excellent',
      latitude: 29.7606,
      longitude: -95.3700,
    },
    {
      id: 'trailsense-device-05',
      name: 'Garage Monitor',
      online: true,
      batteryPercent: 78,
      signalStrength: 'good',
      latitude: 29.7602,
      longitude: -95.3696,
    },
  ];

  for (const data of deviceData) {
    const device = await prisma.device.create({
      data: {
        ...data,
        lastSeen: data.online ? new Date() : randomDateWithinDays(2),
        firmwareVersion: '1.0.0',
        detectionCount: 0, // Will be updated when alerts are created
      },
    });

    console.log(`   ✓ Created device: ${device.name} (${device.online ? 'online' : 'offline'})`);
  }
}

/**
 * Generate realistic alerts
 */
async function seedAlerts() {
  console.log(`\n🚨 Creating ${SEED_CONFIG.alerts} detection alerts...`);

  const devices = await prisma.device.findMany();
  const detectionTypes: Array<'wifi' | 'bluetooth' | 'cellular'> = ['wifi', 'bluetooth', 'cellular'];
  const wifiSSIDs = ['iPhone', 'Samsung-Galaxy', 'Pixel-7', 'Unknown-Network', 'AndroidAP'];
  const bleNames = ['iPhone 14', 'Galaxy Watch', 'AirPods Pro', 'Fitbit', 'Tile'];

  const threatLevelDistribution = {
    low: 40, // 40%
    medium: 35, // 35%
    high: 20, // 20%
    critical: 5, // 5%
  };

  let lowCount = 0,
    mediumCount = 0,
    highCount = 0,
    criticalCount = 0;

  for (let i = 0; i < SEED_CONFIG.alerts; i++) {
    const device = randomElement(devices);
    const detectionType = randomElement(detectionTypes);
    const timestamp = randomDateWithinDays(SEED_CONFIG.daysOfHistory);

    // Generate zone based on desired threat distribution
    let zone: number;
    let rssi: number;
    let targetThreatLevel: 'low' | 'medium' | 'high' | 'critical';

    // Determine target threat level based on distribution
    const rand = randomInt(1, 100);
    if (rand <= 5 && criticalCount < SEED_CONFIG.alerts * 0.05) {
      targetThreatLevel = 'critical';
      zone = 0; // Immediate
      rssi = randomInt(-50, -40);
      criticalCount++;
    } else if (rand <= 25 && highCount < SEED_CONFIG.alerts * 0.2) {
      targetThreatLevel = 'high';
      zone = randomInt(0, 1);
      rssi = randomInt(-60, -50);
      highCount++;
    } else if (rand <= 60 && mediumCount < SEED_CONFIG.alerts * 0.35) {
      targetThreatLevel = 'medium';
      zone = 1;
      rssi = randomInt(-70, -60);
      mediumCount++;
    } else {
      targetThreatLevel = 'low';
      zone = randomInt(1, 2);
      rssi = randomInt(-85, -70);
      lowCount++;
    }

    const detectionCode = detectionType === 'wifi' ? 'w' : detectionType === 'bluetooth' ? 'b' : 'c';
    const threatLevel = calculateThreatLevel(rssi, zone, detectionCode);

    // Build metadata based on detection type
    const metadata: Record<string, any> = {
      zone,
      distance: zone === 0 ? randomInt(1, 3) : zone === 1 ? randomInt(3, 15) : randomInt(15, 50),
    };

    if (detectionType === 'wifi') {
      metadata.channel = randomInt(1, 11);
      metadata.ssid = randomElement(wifiSSIDs);
    } else if (detectionType === 'bluetooth') {
      metadata.deviceName = randomElement(bleNames);
    } else if (detectionType === 'cellular') {
      metadata.cellularPeak = randomInt(-70, -40);
      metadata.cellularAvg = randomInt(-75, -50);
      metadata.cellularDelta = randomInt(3, 12);
    }

    const alert = await prisma.alert.create({
      data: {
        deviceId: device.id,
        timestamp,
        threatLevel,
        detectionType,
        rssi,
        macAddress: `${randomMacAddress()}XXXX`,
        cellularStrength: detectionType === 'cellular' ? metadata.cellularPeak : null,
        isReviewed: randomInt(1, 100) <= 30, // 30% reviewed
        isFalsePositive: randomInt(1, 100) <= 5, // 5% false positives
        latitude: device.latitude,
        longitude: device.longitude,
        metadata,
      },
    });

    // Update device detection count
    await prisma.device.update({
      where: { id: device.id },
      data: {
        detectionCount: { increment: 1 },
      },
    });

    if ((i + 1) % 10 === 0) {
      console.log(`   ✓ Created ${i + 1}/${SEED_CONFIG.alerts} alerts...`);
    }
  }

  console.log(`\n   📊 Threat Level Distribution:`);
  console.log(`      Critical: ${criticalCount} (${((criticalCount / SEED_CONFIG.alerts) * 100).toFixed(1)}%)`);
  console.log(`      High: ${highCount} (${((highCount / SEED_CONFIG.alerts) * 100).toFixed(1)}%)`);
  console.log(`      Medium: ${mediumCount} (${((mediumCount / SEED_CONFIG.alerts) * 100).toFixed(1)}%)`);
  console.log(`      Low: ${lowCount} (${((lowCount / SEED_CONFIG.alerts) * 100).toFixed(1)}%)`);
}

/**
 * Generate whitelist entries
 */
async function seedWhitelist() {
  console.log(`\n✅ Creating ${SEED_CONFIG.whitelist} whitelist entries...`);

  const whitelistData = [
    { category: 'family', deviceName: "John's iPhone", notes: 'Family member' },
    { category: 'family', deviceName: "Sarah's Galaxy", notes: 'Family member' },
    { category: 'guest', deviceName: 'Guest WiFi Device', notes: 'Regular visitor' },
    { category: 'service', deviceName: 'Amazon Delivery Van', notes: 'Delivery service' },
    { category: 'service', deviceName: 'USPS Mail Carrier', notes: 'Mail carrier' },
    { category: 'family', deviceName: "Kids' iPad", notes: 'Family device' },
    { category: 'neighbor', deviceName: 'Neighbor Network', notes: 'Adjacent property' },
    { category: 'service', deviceName: 'UPS Truck', notes: 'Package delivery' },
    { category: 'family', deviceName: 'Home Security Camera', notes: 'Own device' },
    { category: 'guest', deviceName: 'Cleaning Service', notes: 'Weekly cleaning' },
  ];

  for (const data of whitelistData) {
    const entry = await prisma.whitelist.create({
      data: {
        macAddress: randomMacAddress(),
        deviceName: data.deviceName,
        category: data.category,
        notes: data.notes,
      },
    });

    console.log(`   ✓ Added to whitelist: ${entry.deviceName} (${entry.category})`);
  }
}

// ============================================
// Main Seed Function
// ============================================

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  🌱 TrailSense Database Seeding');
  console.log('═══════════════════════════════════════════');
  console.log('');

  try {
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.alert.deleteMany({});
    await prisma.device.deleteMany({});
    await prisma.whitelist.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('   ✓ Database cleared');

    // Seed data
    await seedUsers();
    await seedDevices();
    await seedAlerts();
    await seedWhitelist();

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  ✅ Database seeding completed!');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   Users: ${SEED_CONFIG.users}`);
    console.log(`   Devices: ${SEED_CONFIG.devices}`);
    console.log(`   Alerts: ${SEED_CONFIG.alerts}`);
    console.log(`   Whitelist: ${SEED_CONFIG.whitelist}`);
    console.log('');
    console.log('🔐 Test User Credentials:');
    console.log('   admin@trailsense.com / admin123');
    console.log('   test@trailsense.com / password123');
    console.log('   demo@trailsense.com / demo123');
    console.log('');
    console.log('🚀 You can now test the mobile app with real data!');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Seeding failed:', error);
    console.error('');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
main();
