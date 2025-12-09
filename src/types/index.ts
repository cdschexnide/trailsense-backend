/**
 * TypeScript Type Definitions for TrailSense Backend
 */

// Detection data structure (WiFi, BLE, or Cellular)
export interface GoliothDetectionData {
  t: 'w' | 'b' | 'c'; // Type: wifi, bluetooth, cellular
  mac?: string; // MAC address (4 bytes, truncated)
  r?: number; // RSSI (signal strength) - WiFi/BLE only
  zone: number; // Detection zone (0=immediate, 1=near, 2=far, 3=extreme)
  dist: number; // Estimated distance in meters
  ch?: number; // WiFi channel (only for WiFi)
  name?: string; // Device name (only for BLE)
  peak?: number; // Cellular peak strength (cellular only)
  avg?: number; // Cellular average strength (cellular only)
  delta?: number; // Cellular delta (burst detection) (cellular only)
}

// Health/heartbeat data structure
export interface GoliothHealthData {
  heap: number; // Free heap memory in bytes
  uptime: number; // Device uptime in seconds
  bat?: number; // Battery percentage (0-100)
  rssi?: number; // LTE signal strength
}

// Payload data (the inner data object from Golioth)
export interface GoliothPayloadData {
  did: string; // Device ID (short form)
  ts: number; // Unix timestamp in seconds
  det?: GoliothDetectionData;
  health?: GoliothHealthData;
}

// Golioth Webhook Payload (received from Golioth when ESP32 sends data)
// Supports both 'data' and 'value' fields (Golioth may use either)
export interface GoliothWebhookPayload {
  deviceId: string; // "trailsense-device-01@trailsense.golioth.io"
  timestamp: number; // Unix timestamp in milliseconds
  path: string; // "detections" or "heartbeat" (may have leading slash)
  data?: GoliothPayloadData; // Standard field name
  value?: GoliothPayloadData; // Alternative field name (some Golioth configs)
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
