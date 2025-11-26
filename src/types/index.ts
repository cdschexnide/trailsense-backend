/**
 * TypeScript Type Definitions for TrailSense Backend
 */

// Golioth Webhook Payload (received from Golioth when ESP32 sends data)
export interface GoliothWebhookPayload {
  deviceId: string; // "trailsense-device-01@trailsense.golioth.io"
  timestamp: number; // Unix timestamp in milliseconds
  path: string; // "detections" or "heartbeat"
  data: {
    did: string; // Device ID (short form)
    ts: number; // Unix timestamp in seconds
    det?: {
      // Detection data (WiFi, BLE, or Cellular)
      t: 'w' | 'b' | 'c'; // Type: wifi, bluetooth, cellular
      mac?: string; // MAC address (4 bytes, truncated)
      r: number; // RSSI (signal strength)
      zone: number; // Detection zone (0=immediate, 1=near, 2=far)
      dist: number; // Estimated distance in meters
      ch?: number; // WiFi channel (only for WiFi)
      name?: string; // Device name (only for BLE)
      peak?: number; // Cellular peak strength
      avg?: number; // Cellular average strength
      delta?: number; // Cellular delta (burst detection)
    };
    health?: {
      // Device health/heartbeat data
      heap: number; // Free heap memory in bytes
      uptime: number; // Device uptime in seconds
      bat?: number; // Battery percentage (0-100)
      rssi?: number; // LTE signal strength
    };
  };
}

// Alert Filters (for querying alerts from mobile app)
export interface AlertFilters {
  deviceId?: string;
  threatLevel?: string[];
  detectionType?: string[];
  startDate?: string;
  endDate?: string;
  isReviewed?: boolean;
  limit?: number;
  offset?: number;
}

// JWT Payload (decoded token)
export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number; // Issued at
  exp?: number; // Expiration
}

// Detection Types
export type DetectionType = 'wifi' | 'bluetooth' | 'cellular';

// Threat Levels
export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';

// Device Status
export interface DeviceStatus {
  id: string;
  online: boolean;
  battery?: number;
  signalStrength?: string;
  lastSeen: string;
}
