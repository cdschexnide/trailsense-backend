/**
 * Golioth Webhook Controller
 *
 * Handles incoming webhooks from Golioth IoT platform
 * Processes detection events and device heartbeats from ESP32 devices
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { GoliothWebhookPayload, GoliothPayloadData } from '../types';
import { calculateThreatLevel, mapDetectionType, padMacAddress } from '../services/threatClassifier';
import { broadcastAlert, broadcastDeviceStatus } from '../services/websocketService';
import { config } from '../config/env';

const prisma = new PrismaClient();

/**
 * Extract data from payload (handles both 'data' and 'value' fields)
 * Golioth webhooks may use either field depending on configuration
 */
function extractPayloadData(payload: GoliothWebhookPayload): GoliothPayloadData | null {
  const data = payload.data ?? payload.value;
  if (!data) {
    console.error('[Golioth] No data/value field in payload:', JSON.stringify(payload));
    return null;
  }
  return data;
}

/**
 * Normalize path from Golioth webhook
 * Handles variations like "/detections", "detections", "/.s/detections"
 */
function normalizePath(path: string | undefined): string {
  if (!path) return '';
  // Strip leading slashes and get the last segment
  return path.replace(/^\/+/, '').split('/').pop() || '';
}

/**
 * Main webhook handler
 * Routes to either detection or heartbeat handler based on path
 */
export const handleGoliothWebhook = async (req: Request, res: Response) => {
  try {
    const payload: GoliothWebhookPayload = req.body;

    console.log('[Golioth] Webhook received:', JSON.stringify(payload, null, 2));

    // Validate webhook authenticity (optional but recommended)
    const apiKey = req.headers['x-api-key'];
    if (config.goliothWebhookSecret && apiKey !== config.goliothWebhookSecret) {
      console.warn('[Golioth] Invalid API key');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Normalize path (handles "/detections", "detections", "/.s/detections", etc.)
    const rawPath = payload.path || '';
    const normalizedPath = normalizePath(rawPath);

    console.log(`[Golioth] Path: "${rawPath}" → normalized: "${normalizedPath}"`);

    // Route based on normalized path
    if (normalizedPath === 'detections') {
      await handleDetection(payload);
    } else if (normalizedPath === 'heartbeat') {
      await handleHeartbeat(payload);
    } else {
      console.warn(`[Golioth] Unknown path: ${rawPath} (normalized: ${normalizedPath})`);
    }

    // Return 200 OK quickly (important - Golioth will retry if slow)
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Golioth] Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Handle detection event (WiFi, BLE, or Cellular)
 */
async function handleDetection(payload: GoliothWebhookPayload) {
  // Extract data from payload (handles both 'data' and 'value' fields)
  const data = extractPayloadData(payload);
  if (!data) return;

  const { det } = data;

  if (!det) {
    console.warn('[Golioth] No detection data in payload');
    return;
  }

  const deviceId = data.did;
  const detectionType = mapDetectionType(det.t);
  const timestamp = new Date(data.ts * 1000); // Convert Unix seconds to JS Date

  // Determine signal strength based on detection type
  // Cellular uses 'peak', WiFi/BLE use 'r'
  const signalStrength = det.t === 'c'
    ? (det.peak ?? det.avg ?? -100)
    : (det.r ?? -100);

  const threatLevel = calculateThreatLevel(signalStrength, det.zone, det.t);
  const macAddress = padMacAddress(det.mac);

  // Build metadata object (flexible for different detection types)
  const metadata = {
    zone: det.zone,
    distance: det.dist,
    ...(det.ch !== undefined && { channel: det.ch }), // WiFi only
    ...(det.name && { deviceName: det.name }), // BLE only
    ...(det.avg !== undefined && { cellularAvg: det.avg }), // Cellular only
    ...(det.delta !== undefined && { cellularDelta: det.delta }), // Cellular only
    ...(det.peak !== undefined && { cellularPeak: det.peak }), // Cellular only
  };

  // STEP 1: Ensure device exists (upsert)
  // This creates a minimal device record if first contact is a detection
  await prisma.device.upsert({
    where: { id: deviceId },
    update: {
      lastSeen: timestamp,
      online: true,
      detectionCount: { increment: 1 },
    },
    create: {
      id: deviceId,
      name: deviceId, // Default name, user can change later
      online: true,
      lastSeen: timestamp,
      detectionCount: 1,
    },
  });

  // STEP 2: Create alert (device now guaranteed to exist)
  const alert = await prisma.alert.create({
    data: {
      deviceId,
      timestamp,
      threatLevel,
      detectionType,
      rssi: signalStrength, // Now always has a value
      macAddress,
      cellularStrength: det.peak, // Keep for cellular-specific queries
      isReviewed: false,
      isFalsePositive: false,
      metadata,
    },
  });

  console.log(`[Golioth] Alert created: ${alert.id} (${threatLevel} - ${detectionType})`);

  // Broadcast to WebSocket clients
  broadcastAlert(alert);
}

/**
 * Handle heartbeat/health event
 */
async function handleHeartbeat(payload: GoliothWebhookPayload) {
  // Extract data from payload (handles both 'data' and 'value' fields)
  const data = extractPayloadData(payload);
  if (!data) return;

  const { health } = data;

  if (!health) {
    console.warn('[Golioth] No health data in payload');
    return;
  }

  const deviceId = data.did;
  const timestamp = new Date(data.ts * 1000);

  // Calculate signal strength category from RSSI
  const signalStrength = health.rssi
    ? health.rssi > -50 ? 'excellent'
      : health.rssi > -70 ? 'good'
      : health.rssi > -85 ? 'fair'
      : 'poor'
    : undefined;

  // Upsert device (create if not exists, update if exists)
  await prisma.device.upsert({
    where: { id: deviceId },
    update: {
      online: true,
      batteryPercent: health.bat,
      signalStrength,
      lastSeen: timestamp,
    },
    create: {
      id: deviceId,
      name: deviceId, // Default name (user can change later)
      online: true,
      batteryPercent: health.bat,
      signalStrength,
      lastSeen: timestamp,
    },
  });

  console.log(`[Golioth] Heartbeat processed: ${deviceId} (battery: ${health.bat}%)`);

  // Broadcast device status update
  broadcastDeviceStatus(deviceId, {
    online: true,
    battery: health.bat,
    signalStrength,
    lastSeen: timestamp.toISOString(),
  });
}
