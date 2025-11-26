/**
 * Threat Classification Service
 *
 * Calculates threat level based on:
 * - Detection type (cellular-only is more suspicious)
 * - RSSI/signal strength (proximity indicator)
 * - Detection zone (immediate, near, far)
 *
 * Scoring Algorithm:
 * - Cellular-only detection: +40 points (suspicious - "ghost mode")
 * - Very close (RSSI > -50): +30 points
 * - Moderately close (RSSI > -70): +15 points
 * - Immediate zone (0-3m): +20 points
 * - Near zone (3-15m): +10 points
 *
 * Threat Level Thresholds:
 * - Critical: score >= 70
 * - High: score >= 50
 * - Medium: score >= 30
 * - Low: score < 30
 */

import { ThreatLevel } from '../types';

export function calculateThreatLevel(
  rssi: number,
  zone: number,
  detectionType: 'w' | 'b' | 'c'
): ThreatLevel {
  let score = 0;

  // Factor 1: Detection Type
  // Cellular-only detections are suspicious (device may have disabled WiFi/BT)
  if (detectionType === 'c') {
    score += 40;
  }

  // Factor 2: RSSI (proximity)
  // Higher RSSI (less negative) means device is closer
  if (rssi > -50) {
    score += 30; // Very close (< 5 meters)
  } else if (rssi > -70) {
    score += 15; // Moderately close (5-20 meters)
  }

  // Factor 3: Zone
  // Zone 0: IMMEDIATE (0-3m)
  // Zone 1: NEAR (3-15m)
  // Zone 2: FAR (15m+)
  if (zone === 0) {
    score += 20; // Immediate proximity
  } else if (zone === 1) {
    score += 10; // Near proximity
  }

  // Apply thresholds
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

/**
 * Maps detection type code to readable string
 */
export function mapDetectionType(code: 'w' | 'b' | 'c'): 'wifi' | 'bluetooth' | 'cellular' {
  const typeMap = {
    'w': 'wifi' as const,
    'b': 'bluetooth' as const,
    'c': 'cellular' as const,
  };
  return typeMap[code];
}

/**
 * Pads MAC address for privacy (ESP32 sends only 4 bytes)
 */
export function padMacAddress(mac: string | undefined): string {
  if (!mac) return 'UNKNOWN';
  return `${mac}XXXX`;
}
