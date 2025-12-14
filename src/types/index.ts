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

// Golioth timestamp format from inject-metadata transformer
export interface GoliothTimestamp {
  nanos: number;
  seconds: number;
}

// Golioth Webhook Payload (received from Golioth with inject-metadata transformer)
// inject-metadata produces snake_case fields and timestamp as object
export interface GoliothWebhookPayload {
  // Fields from inject-metadata transformer (snake_case)
  device_id?: string; // Device ID from Golioth
  project_id?: string; // Project ID from Golioth
  timestamp?: GoliothTimestamp | number; // Can be object {nanos, seconds} or number

  // The ESP32 payload is nested under 'data' by inject-metadata
  data?: GoliothPayloadData;

  // Legacy support for other Golioth configurations
  deviceId?: string; // camelCase variant
  path?: string; // Stream path (may not be present with inject-metadata)
  value?: GoliothPayloadData; // Alternative field name
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
