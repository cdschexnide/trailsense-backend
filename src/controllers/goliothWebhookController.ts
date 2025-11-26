/**
 * Golioth Webhook Controller
 *
 * Handles incoming webhooks from Golioth IoT platform
 * Processes detection events and device heartbeats from ESP32 devices
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { GoliothWebhookPayload } from '../types';
import { calculateThreatLevel, mapDetectionType, padMacAddress } from '../services/threatClassifier';
import { broadcastAlert, broadcastDeviceStatus } from '../services/websocketService';
import { config } from '../config/env';

const prisma = new PrismaClient();

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

    // Route based on path
    if (payload.path === 'detections') {
      await handleDetection(payload);
    } else if (payload.path === 'heartbeat') {
      await handleHeartbeat(payload);
    } else {
      console.warn(`[Golioth] Unknown path: ${payload.path}`);
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
  const { data } = payload;
  const { det } = data;

  if (!det) {
    console.warn('[Golioth] No detection data in payload');
    return;
  }

  const deviceId = data.did;
  const detectionType = mapDetectionType(det.t);
  const timestamp = new Date(data.ts * 1000); // Convert Unix seconds to JS Date
  const threatLevel = calculateThreatLevel(det.r, det.zone, det.t);
  const macAddress = padMacAddress(det.mac);

  // Build metadata object (flexible for different detection types)
  const metadata = {
    zone: det.zone,
    distance: det.dist,
    ...(det.ch && { channel: det.ch }), // WiFi only
    ...(det.name && { deviceName: det.name }), // BLE only
    ...(det.avg && { cellularAvg: det.avg }), // Cellular only
    ...(det.delta && { cellularDelta: det.delta }), // Cellular only
  };

  // Create alert in database
  const alert = await prisma.alert.create({
    data: {
      deviceId,
      timestamp,
      threatLevel,
      detectionType,
      rssi: det.r,
      macAddress,
      cellularStrength: det.peak,
      isReviewed: false,
      isFalsePositive: false,
      metadata,
    },
  });

  console.log(`[Golioth] Alert created: ${alert.id} (${threatLevel} - ${detectionType})`);

  // Broadcast to WebSocket clients
  broadcastAlert(alert);

  // Update device detection count and last seen
  await prisma.device.update({
    where: { id: deviceId },
    data: {
      detectionCount: { increment: 1 },
      lastSeen: timestamp,
      online: true,
    },
  }).catch(() => {
    // Device doesn't exist yet - will be created on heartbeat
    console.log(`[Golioth] Device ${deviceId} not found (will be created on heartbeat)`);
  });
}

/**
 * Handle heartbeat/health event
 */
async function handleHeartbeat(payload: GoliothWebhookPayload) {
  const { data } = payload;
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
